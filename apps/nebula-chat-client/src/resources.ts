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
    loading: 'Starting your session...',
    sessionFailed: 'Unable to start a session. Please refresh the page to try again.',
    page: {
      title: 'Keep your conversations',
      subtitle: 'Sign in or create an account. Your Guest conversations come with you.',
      continueAsGuest: 'Continue as Guest',
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
      nameRequired: 'Enter your name.',
      emailRequired: 'Enter your email address.',
      emailInvalid: 'Enter a valid email address.',
      passwordRequired: 'Enter your password.',
      passwordTooShort: 'Use at least 8 characters.',
      passwordTooLong: 'Use at most 128 characters.',
    },
    errors: {
      passwordCompromised:
        'This password has appeared in a data breach. Please choose a different one.',
      userExists: 'An account with this email already exists. Sign in instead.',
      invalidCredentials: 'Incorrect email or password.',
      unknown: 'Authentication failed. Please try again.',
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
