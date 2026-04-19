import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const axiosClient = async <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const response: AxiosResponse<T> = await axiosInstance({ ...config, ...options });
  return response.data;
};

export type ErrorType<E> = AxiosResponse<E>;
export type BodyType<B> = B;
