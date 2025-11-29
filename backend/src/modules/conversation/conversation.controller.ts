import { CONVERSATION_ERRORS } from '@backend/shared/errors/conversation.errors';
import { conversationService } from '@backend/modules/conversation/conversation.service';
import type { Request, Response, NextFunction } from 'express';

export const conversationController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { title } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ error: CONVERSATION_ERRORS.INVALID_TITLE });
      }
      const conversation = await conversationService.createConversation(title);
      return res.status(201).json(conversation);
    } catch (error) {
      next(error);
    }
  },
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params;
      if (!conversationId) {
        return res.status(400).json({ error: CONVERSATION_ERRORS.INVALID_CONVERSATION_ID });
      }
      const conversation = await conversationService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: CONVERSATION_ERRORS.INVALID_CONVERSATION });
      }
      return res.status(200).json(conversation);
    } catch (error) {
      next(error);
    }
  },
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = await conversationService.getAllConversations();
      return res.status(200).json(conversations);
    } catch (error) {
      next(error);
    }
  },
};
