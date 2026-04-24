import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@backend/env';
import { PrismaClient, Prisma } from '../prisma/generated/prisma/client';

export { Prisma };

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
