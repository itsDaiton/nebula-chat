export const resources = {
  chat: {
    appName: 'nebula chat',
    welcomeMessage: 'Welcome to Nebula Chat! 👋',
    welcomeIntro:
      "I'm your AI assistant, ready to help you with any questions or tasks you might have. Feel free to start a conversation by typing a message below!",
    emptyConversation: 'This conversation has no messages yet. 😔',
    emptyConversationHint: 'Start the conversation by asking Nebula Chat something!',
    streamError: 'An error occurred during streaming.',
  },
  conversations: {
    title: 'Conversations',
    loading: 'Loading conversations...',
    loadingMore: 'Loading more...',
    empty: 'No conversations yet',
    emptyHint: 'Start a new chat to create your first conversation',
    searchPlaceholder: 'Search chats...',
    noResults: 'No chats found',
    searchHint: 'Start typing to search all conversations',
    single: {
      loading: 'Loading conversation...',
      error: 'Error loading conversation',
    },
  },
  auth: {
    loading: 'Getting things ready...',
    sessionFailed: "We couldn't connect you right now. Refresh the page to try again.",
    page: {
      or: 'or',
      continueWithoutAccount: 'Continue without an account',
    },
    signIn: {
      title: 'Welcome back',
      description: 'Sign in to pick up right where you left off.',
    },
    signUp: {
      title: 'Create your account',
      description: "Chat as much as you like, and keep the conversations you've already started.",
    },
    tabs: {
      signIn: 'Sign in',
      signUp: 'Sign up',
    },
    fields: {
      name: 'Name',
      email: 'Email',
      password: 'Password',
    },
    actions: {
      signIn: 'Sign in',
      signUp: 'Create account',
      signOut: 'Sign out',
    },
    validation: {
      nameRequired: 'Tell us what to call you.',
      emailRequired: 'Enter your email address.',
      emailInvalid: "That doesn't look like a valid email address.",
      passwordRequired: 'Enter your password.',
      passwordTooShort: 'Your password needs at least 8 characters.',
      passwordTooLong: 'Your password can be at most 128 characters.',
    },
    errors: {
      passwordCompromised:
        'This password has shown up in a known data breach. Please pick a different one.',
      userExists: 'You already have an account with this email. Try signing in instead.',
      invalidCredentials: "That email and password don't match. Please try again.",
      unknown: 'Something went wrong on our end. Please try again.',
    },
  },
  passwordInput: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  errors: {
    title: 'Something went wrong',
    requestFailed: 'The request failed. Please try again.',
    network:
      'Unable to connect to the server. Please check your internet connection and try again.',
  },
  notFound: {
    status: 404,
    title: 'Page Not Found',
    message: "The page you're looking for doesn't exist or has been moved.",
    action: 'Go Home',
  },
  sidebar: {
    newChat: 'New chat',
    searchChats: 'Search chats',
    files: 'Files',
    aiStudio: 'AI Studio',
    conversations: 'Recent conversations',
  },
};
