export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public statusText: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function handleHttpError(response: Response): Promise<never> {
  const { status, statusText } = response;

  let errorMessage: string;

  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.error || `Request failed with status ${status}`;
  } catch {
    errorMessage = `Request failed with status ${status}: ${statusText}`;
  }

  throw new HttpError(errorMessage, status, statusText);
}

export function handleNetworkError(error: unknown): never {
  if (error instanceof HttpError) {
    throw error;
  }

  if (error instanceof TypeError) {
    throw new Error(
      'Unable to connect to the server. Please check your internet connection and try again.',
    );
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('An unknown error occurred. Please try again.');
}
