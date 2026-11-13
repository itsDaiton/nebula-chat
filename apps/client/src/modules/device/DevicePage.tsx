import { getRouteApi } from '@tanstack/react-router';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { DeviceReview } from '@/modules/device/components/DeviceReview';
import { DeviceUnavailable } from '@/modules/device/components/DeviceUnavailable';
import { sessionRefusal } from '@/modules/device/utils/deviceRefusal';
import { resources } from '@/resources';

const routeApi = getRouteApi('/_app/device');

/** /device — an Admin signed in with 2FA approves or denies the code `nebula login` printed. */
export const DevicePage = () => {
  const { user_code: userCode } = routeApi.useSearch();
  const auth = useAuth();
  // The guard has let a signed-in User through; wait for the session store to hold them.
  if (auth.isPending) return null;

  const refusal = sessionRefusal(auth);

  return (
    <AuthLayout wide>
      {!userCode && <DeviceUnavailable message={resources.device.missingCode} />}
      {userCode && refusal && <DeviceUnavailable message={resources.device[refusal]} />}
      {userCode && !refusal && <DeviceReview userCode={userCode} />}
    </AuthLayout>
  );
};
