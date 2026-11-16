import { MessageCircleQuestionIcon } from 'lucide-react';
import { ClarifyingQuestionNote } from '@/modules/chat/components/ClarifyingQuestionNote';
import { MessageMetaRow } from '@/modules/chat/components/MessageMetaRow';
import { RunChip } from '@/modules/chat/components/RunChip';
import { RunEndLine } from '@/modules/chat/components/RunEndLine';
import { RunStepProgress } from '@/modules/chat/components/RunStepProgress';
import { RunWaitingRow } from '@/modules/chat/components/RunWaitingRow';
import { useWaitingRun } from '@/modules/chat/hooks/useWaitingRun';
import type { ChatMessageProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { MarkdownContent } from '@/shared/components/ui/markdown-content';

export const ChatAssistantMessage = ({ message, onRegenerate, isStreaming }: ChatMessageProps) => {
  const { waitingRun } = useWaitingRun();

  // The Clarifying question its Run still waits on: there is no answer yet to copy or inspect.
  if (waitingRun && waitingRun.id === message.runId) {
    return (
      <div className="group/message mb-[26px]">
        <RunWaitingRow stepsCompleted={waitingRun.stepsCompleted} />
        <p className="mb-2 flex items-center gap-2 text-[13px] text-muted-foreground">
          <MessageCircleQuestionIcon className="size-4" />
          {resources.chat.clarify.label}
        </p>
        <MarkdownContent content={message.content} />
        <ClarifyingQuestionNote />
      </div>
    );
  }

  return (
    <div className="group/message mb-[26px]">
      {message.run && <RunStepProgress run={message.run} isStreaming={isStreaming} />}
      <MarkdownContent content={message.content} />
      {message.run && <RunEndLine run={message.run} />}
      {!isStreaming && message.runId && <RunChip runId={message.runId} />}
      {!isStreaming && <MessageMetaRow message={message} onRegenerate={onRegenerate} />}
    </div>
  );
};
