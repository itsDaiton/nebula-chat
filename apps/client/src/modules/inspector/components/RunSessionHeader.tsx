import { useParams } from '@tanstack/react-router';
import { useListMessages } from '@/libs/api/generated/messages/messages';
import { useGetSession } from '@/libs/api/generated/sessions/sessions';
import { InspectorRow } from '@/modules/inspector/components/InspectorRow';
import { formatSessionDate } from '@/modules/inspector/utils/formatSessionDate';
import { resources } from '@/resources';

const { session: text } = resources.inspector;

/** What the Run view says about its Session: the Model is per Agent there, so only when and how much. */
export const RunSessionHeader = () => {
  const { id } = useParams({ strict: false });
  const { data: session } = useGetSession(id ?? '', { query: { enabled: Boolean(id) } });
  const { data: messages } = useListMessages(
    { sessionId: id },
    { query: { enabled: Boolean(id) } },
  );
  if (!session) return null;

  return (
    <dl className="mx-3.5 mt-3.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 border-b border-border pb-3.5 text-[12.5px]">
      <InspectorRow label={text.created} value={formatSessionDate(session.createdAt)} />
      <InspectorRow label={text.messages} value={String(messages?.length ?? 0)} />
    </dl>
  );
};
