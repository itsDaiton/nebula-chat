/** The Model a Step called: an Agent's input names it, a tool call's doesn't. */
export const stepModel = (input: unknown) => {
  const model: unknown =
    typeof input === 'object' && input !== null && 'model' in input ? input.model : null;
  return typeof model === 'string' ? model : null;
};
