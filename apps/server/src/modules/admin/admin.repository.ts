import { asc, eq } from 'drizzle-orm';
import { users } from '@nebula-chat/db';
import { auth } from '@server/auth';
import { db } from '@server/db';
import type { AdminRole } from '@server/modules/admin/admin.types';

const userColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  emailVerified: users.emailVerified,
  isAnonymous: users.isAnonymous,
  banned: users.banned,
  role: users.role,
  twoFactorEnabled: users.twoFactorEnabled,
  createdAt: users.createdAt,
};

export const adminRepository = {
  async findUserByEmail(email: string) {
    const [row] = await db.select(userColumns).from(users).where(eq(users.email, email));
    return row ?? null;
  },
  listAdmins() {
    return db
      .select(userColumns)
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(asc(users.createdAt))
      .limit(100);
  },
  // The write `auth.api.setRole` makes, which also refreshes the user cached in their auth sessions;
  // the endpoint itself needs an Admin's session, which an Operator does not have.
  async setRole(userId: string, role: AdminRole) {
    const { internalAdapter } = await auth.$context;
    await internalAdapter.updateUser(userId, { role });
  },
};
