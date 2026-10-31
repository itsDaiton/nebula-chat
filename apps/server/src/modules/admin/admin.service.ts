import { ConflictError, NotFoundError, ValidationError } from '@nebula-chat/errors';
import { adminRepository } from '@server/modules/admin/admin.repository';
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
};
