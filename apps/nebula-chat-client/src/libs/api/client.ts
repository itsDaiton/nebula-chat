import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { AppError, errorCodeForStatus, parseErrorEnvelope } from '@nebula-chat/errors';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';
import { resources } from '@/resources';

export const axiosInstance = axios.create({
  baseURL: SERVER_CONFIG.BASE_URL,
  // The better-auth session is a cookie on the API origin; the browser only
  // sends it cross-origin when asked to.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Every failed request rejects with an AppError (ADR-0011), so a query's
// `error` is typed and its message is safe to show.
const toAppError = (error: AxiosError): AppError => {
  if (!error.response) {
    return new AppError('Internal', resources.errors.network, { cause: error });
  }
  const envelope = parseErrorEnvelope(error.response.data);
  if (envelope) {
    return new AppError(envelope.error, envelope.message, { cause: error });
  }
  return new AppError(errorCodeForStatus(error.response.status), resources.errors.requestFailed, {
    cause: error,
  });
};

axiosInstance.interceptors.response.use(undefined, (error: unknown) =>
  // A cancelled request (react-query aborting a stale fetch) is not a failure.
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

// Orval types each hook's error as `ErrorType<ErrorEnvelope>`; the interceptor
// above guarantees it is an AppError whatever the documented body.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Orval's mutator contract requires the parameter
export type ErrorType<E> = AppError;
export type BodyType<B> = B;
