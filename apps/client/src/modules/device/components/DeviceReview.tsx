import { AuthStatus } from '@/modules/auth/components/AuthStatus';
import { DeviceRequestCard } from '@/modules/device/components/DeviceRequestCard';
import { DeviceUnavailable } from '@/modules/device/components/DeviceUnavailable';
import { useDeviceDecision } from '@/modules/device/hooks/useDeviceDecision';
import { useDeviceRequest } from '@/modules/device/hooks/useDeviceRequest';
import { useSecondsLeft } from '@/modules/device/hooks/useSecondsLeft';
import type { DeviceReviewProps } from '@/modules/device/types/types';
import { serverRefusal } from '@/modules/device/utils/deviceRefusal';
import { resources } from '@/resources';

const { device } = resources;

/** Loads the device code for an Admin who may approve it, then shows the request or its outcome. */
export const DeviceReview = ({ userCode }: DeviceReviewProps) => {
  const request = useDeviceRequest(userCode);
  const decision = useDeviceDecision(userCode);
  const secondsLeft = useSecondsLeft(request.data?.expires_at);

  if (decision.isSuccess) {
    const approved = decision.variables === 'approve';
    return (
      <AuthStatus
        title={approved ? device.approvedTitle : device.deniedTitle}
        status={approved ? 'success' : 'error'}
        message={approved ? device.approved : device.denied}
      />
    );
  }
  if (request.isPending) return null;
  if (request.isError || !request.data) {
    const refusal = serverRefusal(request.error);
    return <DeviceUnavailable message={refusal ? device[refusal] : device.invalid} />;
  }
  if (request.data.status !== 'pending') return <DeviceUnavailable message={device.handled} />;
  // No client: another Admin claimed the code first. No time left: it expired on screen.
  if (!request.data.client_id || secondsLeft === 0) {
    return <DeviceUnavailable message={device.invalid} />;
  }

  return (
    <DeviceRequestCard
      request={request.data}
      secondsLeft={secondsLeft}
      isDeciding={decision.isPending}
      hasFailed={decision.isError}
      onDecide={decision.mutate}
    />
  );
};
