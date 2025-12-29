import { generateOpenAPIDocument } from '@backend/config/openapi.config';
import { registerCacheRoutes } from '@backend/cache/cache.openapi';
import { registerChatRoutes } from '@backend/modules/chat/chat.openapi';
import { registerConversationRoutes } from '@backend/modules/conversation/conversation.openapi';
import { registerMessageRoutes } from '@backend/modules/message/message.openapi';
import { registerAuthRoutes } from '@backend/modules/auth/auth.openapi';

function initializeOpenAPI() {
  registerAuthRoutes();
  registerChatRoutes();
  registerConversationRoutes();
  registerMessageRoutes();
  registerCacheRoutes();

  return generateOpenAPIDocument();
}

export const openApiDocument = initializeOpenAPI();
