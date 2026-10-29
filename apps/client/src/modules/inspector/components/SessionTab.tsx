import { InfoIcon } from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useListMessages } from '@/libs/api/generated/messages/messages';
import { useGetModelCatalog } from '@/libs/api/generated/models/models';
import { useGetSession } from '@/libs/api/generated/sessions/sessions';
import { InspectorRow } from '@/modules/inspector/components/InspectorRow';
import { InspectorSection } from '@/modules/inspector/components/InspectorSection';
import { formatSessionDate } from '@/modules/inspector/utils/formatSessionDate';
import { useModel } from '@/modules/chat/hooks/useModel';
import { resources } from '@/resources';
import { ProviderLogo } from '@/shared/components/ProviderLogo';
import { formatRelativeTime } from '@/shared/utils/relativeTime';

const { session: text } = resources.inspector;

const formatTokens = (count: number) => text.tokens(count.toLocaleString('en-US'));

export const SessionTab = () => {
  const { id } = useParams({ strict: false });
  const { selectedModel } = useModel();
  const { data: session } = useGetSession(id ?? '', { query: { enabled: Boolean(id) } });
  const { data: messages } = useListMessages(
    { sessionId: id },
    { query: { enabled: Boolean(id) } },
  );
  const { data: catalog } = useGetModelCatalog();
  const model = catalog?.models.find((entry) => entry.id === selectedModel);
  const lastMessage = messages?.at(-1);

  return (
    <div className="flex flex-col gap-4 p-3.5">
      {!id && (
        <div className="flex gap-2.5 rounded-[10px] border border-border bg-raised p-3 text-[12.5px] text-foreground-secondary">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p>{text.newChatNotice}</p>
        </div>
      )}
      <InspectorSection label={text.model}>
        <div className="flex items-center gap-2.5 rounded-[10px] border border-border bg-raised p-3">
          {model && <ProviderLogo provider={model.provider} className="size-5" />}
          <div className="min-w-0">
            <p className="truncate font-medium">{model?.label ?? selectedModel}</p>
            <p className="truncate font-mono text-[11px] text-faint">{selectedModel}</p>
          </div>
        </div>
      </InspectorSection>
      {model && (
        <InspectorSection label={text.limits}>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 text-[12.5px]">
            <InspectorRow label={text.contextWindow} value={formatTokens(model.contextWindow)} />
            <InspectorRow label={text.maxOutput} value={formatTokens(model.maxOutput)} />
          </dl>
        </InspectorSection>
      )}
      {session && (
        <InspectorSection label={text.session}>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 text-[12.5px]">
            <InspectorRow label={text.messages} value={String(messages?.length ?? 0)} />
            <InspectorRow label={text.created} value={formatSessionDate(session.createdAt)} />
            <InspectorRow
              label={text.lastActivity}
              value={formatRelativeTime(lastMessage?.createdAt ?? session.createdAt, Date.now())}
            />
          </dl>
        </InspectorSection>
      )}
    </div>
  );
};
