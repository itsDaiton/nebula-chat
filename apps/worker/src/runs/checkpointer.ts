import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

// The worker's own `pg` pool, shared with `@nebula-chat/db`.
type Pool = ConstructorParameters<typeof PostgresSaver>[0];

// Its tables live in their own `langgraph` schema, created and migrated by `setup()` at boot; Drizzle never sees them.
export const createCheckpointer = async (pool: Pool): Promise<PostgresSaver> => {
  const checkpointer = new PostgresSaver(pool, undefined, { schema: 'langgraph' });
  await checkpointer.setup();
  return checkpointer;
};
