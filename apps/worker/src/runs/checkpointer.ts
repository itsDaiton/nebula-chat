import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

// The worker's own `pg` pool, shared with `@nebula-chat/db`.
type Pool = ConstructorParameters<typeof PostgresSaver>[0];

/**
 * The Run graph's Postgres checkpointer (ADR-0033). Its tables live in their own `langgraph` schema,
 * which `setup()` creates and migrates at boot; Drizzle neither creates nor sees them.
 */
export const createCheckpointer = async (pool: Pool): Promise<PostgresSaver> => {
  const checkpointer = new PostgresSaver(pool, undefined, { schema: 'langgraph' });
  await checkpointer.setup();
  return checkpointer;
};
