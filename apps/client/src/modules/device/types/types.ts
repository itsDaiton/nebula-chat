/** A device code as better-auth's `GET /device` answers the Admin reviewing it. */
export type DeviceRequest = {
  user_code: string;
  status: 'pending' | 'approved' | 'denied';
  /** Absent for anyone but the Admin who claimed the code by reading it first. */
  client_id?: string | null;
  expires_at?: string;
};

export type DeviceDecision = 'approve' | 'deny';

/** Why the signed-in User cannot approve: the server's `ADMIN_REQUIRED` and `TWO_FACTOR_REQUIRED`. */
export type DeviceRefusal = 'adminRequired' | 'twoFactorRequired';

export type DeviceReviewProps = { userCode: string };

export type DeviceRequestCardProps = {
  request: DeviceRequest;
  secondsLeft: number;
  isDeciding: boolean;
  hasFailed: boolean;
  onDecide: (decision: DeviceDecision) => void;
};

export type DeviceUnavailableProps = { message: string };
