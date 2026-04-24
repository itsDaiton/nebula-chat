import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@backend/env';
import { PrismaClient } from '../prisma/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
