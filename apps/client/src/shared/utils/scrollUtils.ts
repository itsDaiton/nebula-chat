export const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
  ref.current?.scrollIntoView({ behavior: 'smooth' });
};
