import { MESSAGE_ERRORS } from '@backend/shared/errors/message.errors';
import { messageService } from '@backend/modules/message/message.service';
import type { NextFunction, Request, Response } from 'express';

export const messageController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId, content, role, tokens } = req.body;
      if (!conversationId) {
        return res.status(400).json({ error: MESSAGE_ERRORS.INVALID_CONVERSATION_ID });
      }
      if (!content || !content.trim()) {
        return res.status(400).json({ error: MESSAGE_ERRORS.INVALID_CONTENT });
      }
      if (!role || !['user', 'assistant', 'system'].includes(role)) {
        return res.status(400).json({ error: MESSAGE_ERRORS.INVALID_ROLE });
      }
      if (tokens !== undefined && typeof tokens !== 'number') {
        return res.status(400).json({ error: MESSAGE_ERRORS.INVALID_TOKENS });
      }
      const message = await messageService.createMessage({
        conversationId,
        content,
        role,
        tokens,
      });
      return res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  },
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;
      if (!messageId) {
        return res.status(400).json({ error: MESSAGE_ERRORS.INVALID_MESSAGE_ID });
      }
      const message = await messageService.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: MESSAGE_ERRORS.INVALID_MESSAGE });
      }
      return res.status(200).json(message);
    } catch (error) {
      next(error);
    }
  },
};
