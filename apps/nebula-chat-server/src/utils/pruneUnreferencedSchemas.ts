const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isReferenced = (serialized: string, name: string) =>
  serialized.includes(`"#/components/schemas/${name}"`);

/**
 * Drops the component schemas nothing references. fastify-type-provider-zod
 * emits an `…Input` twin of every schema registered with an id, and a schema
 * used only in responses never references its twin — left in, each would be a
 * dead type in the generated client.
 */
export const pruneUnreferencedSchemas = <T extends object>(document: T): T => {
  if (
    !('components' in document) ||
    !isRecord(document.components) ||
    !isRecord(document.components.schemas)
  ) {
    return document;
  }

  const { components } = document;
  let kept = document.components.schemas;
  // Repeat until stable: dropping a schema can orphan the ones only it referenced.
  for (;;) {
    const serialized = JSON.stringify({ ...document, components: { schemas: kept } });
    const next = Object.fromEntries(
      Object.entries(kept).filter(([name]) => isReferenced(serialized, name)),
    );
    if (Object.keys(next).length === Object.keys(kept).length) {
      return { ...document, components: { ...components, schemas: kept } };
    }
    kept = next;
  }
};
