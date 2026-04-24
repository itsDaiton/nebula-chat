import '@backend/env';
import { PrismaClient } from '../prisma/generated/prisma/client';

export const prisma = new PrismaClient();
