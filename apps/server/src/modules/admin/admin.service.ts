import {
  ConflictError,
  LastAdminError,
  NotEligibleForAdminError,
  NotFoundError,
  ValidationError,
} from '@nebula-chat/errors';
import type { EventLogger } from '@nebula-chat/otel';
import { auth } from '@server/auth';
import { adminRepository } from '@server/modules/admin/admin.repository';
import type {
  AdminRole,
  BanUserDTO,
  ListUserSessionsQuery,
  ListUsersQuery,
  SetRoleDTO,
} from '@server/modules/admin/admin.types';
import { auditService } from '@server/modules/audit/audit.service';
import { messageRepository } from '@server/modules/message/message.repository';
import { runService } from '@server/modules/run/run.service';

type UserRow = NonNullable<Awaited<ReturnType<typeof adminRepository.findUserByEmail>>>;

const toAdmin = ({ id, email, name, twoFactorEnabled, createdAt }: UserRow) => ({
  id,
  email,
  name,
  twoFactorEnabled,
  createdAt,
});

const findUser = async (email: string) => {
  const user = await adminRepository.findUserByEmail(email);
  if (!user) {
    throw new NotFoundError('User');
  }
  return user;
};

type SummaryRow = Awaited<ReturnType<typeof adminRepository.listUsers>>['users'][number];

const isBanned = ({ banned, banExpires }: SummaryRow) =>
  banned && (!banExpires || banExpires > new Date());

// The first that applies; the repository's status filters follow the same order.
const statusOf = (user: SummaryRow) => {
  if (user.isAnonymous) {
    return 'guest' as const;
  }
  if (user.pendingDeletionAt) {
    return 'pendingDeletion' as const;
  }
  if (isBanned(user)) {
    return 'banned' as const;
  }
  if (user.role === 'admin') {
    return 'admin' as const;
  }
  return user.emailVerified ? ('registered' as const) : ('unverified' as const);
};

const toUserSummary = (user: SummaryRow) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  status: statusOf(user),
  twoFactorEnabled: user.twoFactorEnabled,
  messagesSent: user.messagesSent,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

type AdminPluginApi = {
  setRole: (input: {
    body: { userId: string; role: AdminRole };
    headers: Headers;
  }) => Promise<unknown>;
  banUser: (input: {
    body: { userId: string; banReason: string; banExpiresIn?: number };
    headers: Headers;
  }) => Promise<unknown>;
  unbanUser: (input: { body: { userId: string }; headers: Headers }) => Promise<unknown>;
};

// `AuthInstance` is the base `Auth` (TS2883), so the admin plugin's endpoints are typed here.
const adminApi = () => auth.api as unknown as AdminPluginApi;

type ModerationTarget = NonNullable<
  Awaited<ReturnType<typeof adminRepository.findModerationTarget>>
>;

const isBannedNow = ({ banned, banExpires }: ModerationTarget) =>
  banned && (!banExpires || banExpires > new Date());

const findModerationTarget = async (id: string) => {
  const user = await adminRepository.findModerationTarget(id);
  if (!user) {
    throw new NotFoundError('User', id);
  }
  return user;
};

const assertNotLastAdmin = async (user: ModerationTarget) => {
  if (user.role === 'admin' && (await adminRepository.countOtherActiveAdmins(user.id)) === 0) {
    throw new LastAdminError();
  }
};

// The Operator's grants and revocations (ADR-0027 §7), and the Admin's own moderation actions.
export const adminService = {
  async grant(email: string) {
    const user = await findUser(email);
    if (user.isAnonymous) {
      throw new ValidationError('A Guest cannot be an Admin.');
    }
    if (!user.emailVerified) {
      throw new ValidationError('Only a user with a verified email can be an Admin.');
    }
    if (user.banned) {
      throw new ValidationError('A banned user cannot be an Admin.');
    }
    if (user.role === 'admin') {
      throw new ConflictError('This user is already an Admin.');
    }
    await adminRepository.setRole(user.id, 'admin');
    await auditService.append({
      actorType: 'operator',
      action: 'admin.granted',
      targetType: 'user',
      targetId: user.id,
      detail: { role: { from: user.role, to: 'admin' } },
    });
    return toAdmin(user);
  },
  async revoke(email: string) {
    const user = await findUser(email);
    if (user.role !== 'admin') {
      throw new ConflictError('This user is not an Admin.');
    }
    await adminRepository.setRole(user.id, 'user');
    await auditService.append({
      actorType: 'operator',
      action: 'user.role_changed',
      targetType: 'user',
      targetId: user.id,
      detail: { role: { from: 'admin', to: 'user' } },
    });
  },
  async list() {
    const admins = await adminRepository.listAdmins();
    return admins.map(toAdmin);
  },
  async listUsers({ limit, cursor, ...filters }: ListUsersQuery) {
    const page = await adminRepository.listUsers(filters, limit, cursor);
    return { ...page, users: page.users.map(toUserSummary) };
  },
  async getUser(id: string) {
    const user = await adminRepository.findUserDetail(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return {
      ...toUserSummary(user),
      ban: isBanned(user) ? { reason: user.banReason, expiresAt: user.banExpires } : null,
      pendingDeletionAt: user.pendingDeletionAt,
      sessionsCount: user.sessionsCount,
    };
  },
  async listUserSessions(userId: string, { limit, cursor }: ListUserSessionsQuery) {
    await findModerationTarget(userId);
    return adminRepository.listUserSessions(userId, limit, cursor);
  },
  // Opening a Session is a content read: audited once, after it succeeds, and a failed Audit write fails the read.
  async readSession(sessionId: string, adminId: string) {
    const session = await adminRepository.findSession(sessionId);
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }
    const messages = await messageRepository.findAll(session.userId, sessionId);
    await auditService.append({
      actorType: 'admin',
      actorUserId: adminId,
      action: 'session.read',
      targetType: 'session',
      targetId: sessionId,
      detail: { userId: session.userId },
    });
    return { ...session, messages };
  },
  // Admins moderating through better-auth's server API, so sessions and caches are handled by the library.
  async setRole(userId: string, { role }: SetRoleDTO, adminId: string, headers: Headers) {
    const user = await findModerationTarget(userId);
    if (role === 'admin') {
      if (user.isAnonymous) {
        throw new NotEligibleForAdminError('A Guest cannot be an Admin.');
      }
      if (!user.emailVerified) {
        throw new NotEligibleForAdminError('Only a user with a verified email can be an Admin.');
      }
      if (isBannedNow(user)) {
        throw new NotEligibleForAdminError('A banned user cannot be an Admin; unban them first.');
      }
      if (user.role === 'admin') {
        throw new ConflictError('This user is already an Admin.');
      }
    } else {
      if (user.role !== 'admin') {
        throw new ConflictError('This user is not an Admin.');
      }
      await assertNotLastAdmin(user);
    }
    await adminApi().setRole({ body: { userId, role }, headers });
    await auditService.append({
      actorType: 'admin',
      actorUserId: adminId,
      action: role === 'admin' ? 'admin.granted' : 'user.role_changed',
      targetType: 'user',
      targetId: userId,
      detail: { role: { from: user.role, to: role } },
    });
  },
  async banUser(
    userId: string,
    { reason, expiresAt }: BanUserDTO,
    adminId: string,
    headers: Headers,
    logger: EventLogger<'warn'>,
  ) {
    if (userId === adminId) {
      throw new ValidationError('You cannot ban yourself.');
    }
    const user = await findModerationTarget(userId);
    if (isBannedNow(user)) {
      throw new ConflictError('This user is already banned.');
    }
    await assertNotLastAdmin(user);
    const banExpiresIn = expiresAt
      ? Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
      : undefined;
    await adminApi().banUser({
      body: { userId, banReason: reason, ...(banExpiresIn && { banExpiresIn }) },
      headers,
    });
    await auditService.append({
      actorType: 'admin',
      actorUserId: adminId,
      action: 'user.banned',
      targetType: 'user',
      targetId: userId,
      detail: { reason, expiresAt: expiresAt ?? null },
    });
    // A banned owner cannot answer, so their waiting Runs end instead of timing out into a banned account.
    await runService.cancelWaitingRunsOfUser(userId, logger);
  },
  async unbanUser(userId: string, adminId: string, headers: Headers) {
    const user = await findModerationTarget(userId);
    if (!isBannedNow(user)) {
      throw new ConflictError('This user is not banned.');
    }
    await adminApi().unbanUser({ body: { userId }, headers });
    await auditService.append({
      actorType: 'admin',
      actorUserId: adminId,
      action: 'user.unbanned',
      targetType: 'user',
      targetId: userId,
      detail: { reason: user.banReason },
    });
  },
  // An Admin undoing an Account deletion (ADR-0028 §1); the User signing in restores through better-auth instead.
  async restoreUser(userId: string, adminId: string) {
    const user = await adminRepository.findPendingDeletion(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    if (!user.pendingDeletionAt) {
      throw new ConflictError('This user is not pending deletion.');
    }
    await adminRepository.clearPendingDeletion(userId);
    await auditService.append({
      actorType: 'admin',
      actorUserId: adminId,
      action: 'user.restored',
      targetType: 'user',
      targetId: userId,
      detail: { pendingDeletionAt: user.pendingDeletionAt.toISOString() },
    });
  },
};
