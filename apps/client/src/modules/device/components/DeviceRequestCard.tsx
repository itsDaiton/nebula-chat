import { ShieldCheckIcon, TerminalIcon } from 'lucide-react';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import type { DeviceRequestCardProps } from '@/modules/device/types/types';
import { formatCountdown, formatUserCode } from '@/modules/device/utils/deviceCode';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { device } = resources;

/** The pending request as `device.png` draws it: the code to compare, who asks, who approves, and the decision. */
export const DeviceRequestCard = ({
  request,
  secondsLeft,
  isDeciding,
  hasFailed,
  onDecide,
}: DeviceRequestCardProps) => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[10px] border border-border-strong bg-raised text-foreground-secondary">
          <TerminalIcon className="size-[15px]" />
        </span>
        <div>
          <h1 className="text-[17px] font-semibold tracking-[-0.02em]">{device.title}</h1>
          <p className="text-[13px] text-muted-foreground">{device.description}</p>
        </div>
      </div>
      <p className="mt-[18px] rounded-xl border border-dashed border-border-strong bg-raised py-[18px] text-center font-mono text-[30px] font-medium tracking-[0.14em]">
        {formatUserCode(request.user_code)}
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">{device.checkCode}</p>
      <dl className="mt-[18px] grid grid-cols-[1fr_auto] gap-x-3 gap-y-[9px] text-[12.5px] [&_dd]:text-right [&_dd]:font-mono [&_dd]:text-xs [&_dd]:text-foreground-secondary [&_dd]:tabular-nums [&_dt]:text-muted-foreground">
        <dt>{device.client}</dt>
        <dd>{request.client_id}</dd>
        <dt>{device.signedInAs}</dt>
        <dd>
          {user?.name} · {device.admin}
        </dd>
        <dt>{device.expires}</dt>
        <dd>{device.expiresIn(formatCountdown(secondsLeft))}</dd>
      </dl>
      <div className="mt-4 flex gap-2.5 rounded-[10px] border border-border bg-raised px-3.5 py-3 text-[12.5px] text-foreground-secondary">
        <ShieldCheckIcon className="mt-0.5 size-[15px] shrink-0 text-muted-foreground" />
        <p>{device.notice}</p>
      </div>
      {hasFailed && (
        <div className="mt-4">
          <AuthFormAlert message={device.failed} />
        </div>
      )}
      <div className="mt-[18px] flex gap-2">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={isDeciding}
          onClick={() => onDecide('deny')}
        >
          {device.deny}
        </Button>
        <Button
          size="lg"
          className="flex-1"
          disabled={isDeciding}
          onClick={() => onDecide('approve')}
        >
          {device.approve}
        </Button>
      </div>
    </div>
  );
};
