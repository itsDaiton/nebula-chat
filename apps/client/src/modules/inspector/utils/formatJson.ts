/** A Step's input or output as text: a string as it is, anything else as indented JSON. */
export const formatJson = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2);
