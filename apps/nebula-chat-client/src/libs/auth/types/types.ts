import type { authClient } from '@/libs/auth/client';

export type AuthUser = (typeof authClient.$Infer.Session)['user'];
