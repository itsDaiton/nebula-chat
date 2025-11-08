export const route = {
  chat: {
    root: () => "/",
    conversation: (id: string) => `/c/${id}`,
  },
  auth: () => "/auth",
};
