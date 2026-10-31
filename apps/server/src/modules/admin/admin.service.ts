import { ConflictError, NotFoundError, ValidationError } from '@nebula-chat/errors';
import { adminRepository } from '@server/modules/admin/admin.repository';
import type { ListUsersQuery } from '@server/modules/admin/admin.types';
import { auditService } from '@server/modules/audit/audit.service';

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

// The Operator's grants and revocations (ADR-0027 §7); Admins promoting each other comes later.
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
