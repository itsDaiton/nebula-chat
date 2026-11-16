import { z } from 'zod';
import { apiFetch, type ApiTarget } from '@cli/api/apiFetch';
import { responseError } from '@cli/api/responseError';

// better-auth's own routes are not in openapi.yaml, so Orval generates nothing for them.
const CLI_CLIENT_ID = 'nebula-cli';
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

const deviceCodeSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  verification_uri_complete: z.string(),
  expires_in: z.number(),
  interval: z.number(),
});

const deviceTokenSchema = z.object({ access_token: z.string() });

const deviceErrorSchema = z.object({
  error: z.enum(['authorization_pending', 'slow_down', 'access_denied', 'expired_token']),
});

const authSessionSchema = z.object({
  user: z.object({
    email: z.string(),
    name: z.string(),
    role: z.string().nullish(),
  }),
});

export type DeviceCode = z.infer<typeof deviceCodeSchema>;
export type AuthSessionUser = z.infer<typeof authSessionSchema>['user'];

/** What one poll of the token endpoint says (RFC 8628 §3.5). */
export type DevicePoll =
  { status: 'approved'; token: string } | { status: z.infer<typeof deviceErrorSchema>['error'] };

const post = (path: string, target: ApiTarget, body?: unknown) =>
  apiFetch<{ data: unknown; status: number; headers: Headers }>(path, {
    target,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });

export const requestDeviceCode = async (target: ApiTarget): Promise<DeviceCode> => {
  const response = await post('/api/auth/device/code', target, { client_id: CLI_CLIENT_ID });
  const parsed = deviceCodeSchema.safeParse(response.data);
  if (response.status !== 200 || !parsed.success) throw responseError(response);
  return parsed.data;
};

export const pollDeviceToken = async (
  target: ApiTarget,
  deviceCode: string,
): Promise<DevicePoll> => {
  const response = await post('/api/auth/device/token', target, {
    grant_type: DEVICE_GRANT,
    device_code: deviceCode,
    client_id: CLI_CLIENT_ID,
  });
  const token = deviceTokenSchema.safeParse(response.data);
  if (response.status === 200 && token.success) {
    return { status: 'approved', token: token.data.access_token };
  }
  const error = deviceErrorSchema.safeParse(response.data);
  if (response.status !== 400 || !error.success) throw responseError(response);
  return { status: error.data.error };
};

/** The User behind the target's token; `null` when the auth session has expired or was revoked. */
export const getAuthSessionUser = async (target: ApiTarget): Promise<AuthSessionUser | null> => {
  const response = await apiFetch<{ data: unknown; status: number; headers: Headers }>(
    '/api/auth/get-session',
    { target, method: 'GET' },
  );
  if (response.status === 401 || (response.status === 200 && response.data === null)) return null;
  const parsed = authSessionSchema.safeParse(response.data);
  if (response.status !== 200 || !parsed.success) throw responseError(response);
  return parsed.data.user;
};

/** Ends the target's auth session; one that is already gone counts as ended. */
export const signOut = async (target: ApiTarget) => {
  const response = await post('/api/auth/sign-out', target);
  if (response.status !== 200 && response.status !== 401) throw responseError(response);
};
