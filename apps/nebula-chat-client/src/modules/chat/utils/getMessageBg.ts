export const getMessageBg = (isUserMessage: boolean) =>
  isUserMessage
    ? { base: 'bg.subtle', _dark: 'bg.muted' }
    : { base: 'bg.input', _dark: 'bg.subtle' };
