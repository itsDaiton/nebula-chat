import { generateResponse } from '@backend/services/chat.service';
import type { ChatResponseBody } from '@backend/types/chat.types';
import { validateChatRequest } from '@backend/validators/chat.validator';
import type { Request, Response } from 'express';

export async function sendMessage(
  req: Request,
  res: Response<ChatResponseBody>,
): Promise<Response<ChatResponseBody>> {
  const validation = validateChatRequest(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { message, model } = validation.data;

  try {
    const aiResponse = await generateResponse(message, model);

    return res.status(200).json({
      success: true,
      data: aiResponse,
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({
      success: false,
      error: err,
    });
  }
}
