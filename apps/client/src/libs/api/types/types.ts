export type CreateQueryClientOptions = {
  /** Retries per failed query; tests pass `false` so a failure surfaces at once. */
  retry?: number | false;
};
