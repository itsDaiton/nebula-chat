import { ConflictError, NotFoundError } from '@nebula-chat/errors';
import { auditService } from '@server/modules/audit/audit.service';
import { userRepository } from '@server/modules/user/user.repository';

export const userService = {
  // An Admin undoing an Account deletion (ADR-0028 §1); the User signing in restores through better-auth instead.
  async restore(userId: string, adminId: string) {
    const user = await userRepository.findPendingDeletion(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    if (!user.pendingDeletionAt) {
      throw new ConflictError('This user is not pending deletion.');
    }
    await userRepository.clearPendingDeletion(userId);
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
