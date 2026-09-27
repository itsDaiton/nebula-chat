import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { AppError } from '@nebula-chat/errors';
import { toAppError } from '@/libs/api/utils/toAppError';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';

export const axiosInstance = axios.create({
  baseURL: SERVER_CONFIG.BASE_URL,
  // Sends the better-auth session cookie cross-origin.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.response.use(undefined, (error: unknown) =>
  // A cancelled request is react-query aborting a stale fetch, not a failure.
  Promise.reject(axios.isAxiosError(error) && !axios.isCancel(error) ? toAppError(error) : error),
);

export const axiosClient = async <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const response: AxiosResponse<T> = await axiosInstance({
    ...config,
    ...options,
    headers: { ...config.headers, ...options?.headers },
    params: { ...config.params, ...options?.params },
  });
  return response.data;
};

// Orval passes the documented error body as `E`; the interceptor makes every error an AppError.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Orval's mutator contract requires the parameter
export type ErrorType<E> = AppError;
export type BodyType<B> = B;
