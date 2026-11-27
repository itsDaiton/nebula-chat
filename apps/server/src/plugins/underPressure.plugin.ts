import underPressure from '@fastify/under-pressure';
import fp from 'fastify-plugin';
import { env } from '@server/env';

/** Route `config` for the liveness probe: a slow but running process must not read as down. */
export const neverShed = {
  pressureHandler: (): undefined => undefined,
};

/** Sheds load with a 503 while the mean event loop delay is over `MAX_EVENT_LOOP_DELAY_MS`. */
export default fp(
  async (app) => {
    await app.register(underPressure, {
      maxEventLoopDelay: env.MAX_EVENT_LOOP_DELAY_MS,
      pressureHandler: async (_req, reply, type, value) => {
        reply.header('Retry-After', 10);
        // The measured value rides in the message, so the shed request's `http.request.failed` line shows it.
        const message = `Service Unavailable: ${type} ${Math.round(Number(value))} ms over the ${env.MAX_EVENT_LOOP_DELAY_MS} ms limit`;
        throw Object.assign(new Error(message), { code: 'FST_UNDER_PRESSURE', statusCode: 503 });
      },
    });
  },
  { name: 'underPressure' },
);
