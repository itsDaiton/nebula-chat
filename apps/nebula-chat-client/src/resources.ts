export const resources = {
  chat: {
    appName: 'nebula chat',
    welcomeMessage: 'Welcome to Nebula Chat! 👋',
    welcomeIntro:
      "I'm your AI assistant, ready to help you with any questions or tasks you might have. Feel free to start a conversation by typing a message below!",
    emptyConversation: 'This conversation has no messages yet. 😔',
    emptyConversationHint: 'Start the conversation by asking Nebula Chat something!',
    streamError: 'An error occurred during streaming.',
    messageAllowance: {
      title: "You've reached the free message limit",
      description: 'Register or sign in to keep chatting. Your conversations come with you.',
      action: 'Register or sign in',
    },
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
      backToSignIn: 'Back to sign in',
    },
    signIn: {
      title: 'Welcome back',
      description: 'Sign in to pick up right where you left off.',
      forgotPassword: 'Forgot your password?',
    },
    forgotPassword: {
      title: 'Reset your password',
      description: "Enter your account's email and we'll send you a link to choose a new password.",
      submit: 'Send reset link',
      sent: 'If an account exists for that email, a reset link is on its way. Check your inbox.',
    },
    resetPassword: {
      title: 'Choose a new password',
      description: 'Your new password replaces the old one and signs you out everywhere else.',
      submit: 'Update password',
      done: 'Your password has been updated. Sign in with your new password.',
      linkInvalid:
        'This reset link has expired or was already used. Each link works once, for one hour.',
      requestNewLink: 'Request a new link',
    },
    verifyEmail: {
      verifiedTitle: 'Email verified',
      verified: 'Thanks for confirming your email address. Your account is all set.',
      failedTitle: "We couldn't verify your email",
      linkExpired: 'This verification link has expired. Send yourself a new one.',
      linkInvalid: 'This verification link is invalid or no longer works.',
      startChatting: 'Start chatting',
    },
    emailVerification: {
      title: 'Verify your email',
      description: 'Follow the link we emailed you to remove the message limit.',
      allowanceReachedTitle: 'Verify your email to keep chatting',
      allowanceReachedDescription:
        "You've used the messages available before verification. Follow the link we emailed you to keep going.",
      resend: 'Resend email',
      sent: 'Verification email sent. Check your inbox.',
    },
    signUp: {
      title: 'Create your account',
      description: "Chat as much as you like, and keep the conversations you've already started.",
    },
    social: {
      google: 'Continue with Google',
      github: 'Continue with GitHub',
      errors: {
        cancelled: 'Sign-in was cancelled. Choose a way to continue whenever you are ready.',
        accountNotLinked:
          'An account with this email already exists. Sign in the way you did when you created it.',
        emailNotFound:
          "We couldn't get an email address from that account, so we can't sign you in with it.",
        unavailable: "That sign-in option isn't available right now. Try another way.",
        failed: "We couldn't sign you in with that account. Please try again.",
      },
    },
    tabs: {
      signIn: 'Sign in',
      signUp: 'Sign up',
    },
    fields: {
      name: 'Name',
      email: 'Email',
      password: 'Password',
      newPassword: 'New password',
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
      passwordReused: 'Choose a password different from your current one.',
      tooManyRequests: 'Too many attempts. Wait a minute, then try again.',
      unknown: 'Something went wrong on our end. Please try again.',
    },
  },
  account: {
    menu: 'Account menu',
    guest: 'Guest',
    settings: 'Settings',
  },
  settings: {
    title: 'Settings',
    password: {
      title: 'Password',
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
