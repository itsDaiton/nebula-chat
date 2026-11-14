import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DevicePage } from '@/modules/device/DevicePage';
import { requireSignedIn } from '@/modules/device/utils/deviceGuard';
import { optionalSearchText } from '@/routing/searchParams';

// `user_code`: the code `nebula login` printed; better-auth's device flow names the param.
const searchSchema = z.object({
  user_code: optionalSearchText(),
});

// Where an Admin approves a `nebula login`; a Guest signs in first and comes back.
export const Route = createFileRoute('/_app/device')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => requireSignedIn(search.user_code),
  component: DevicePage,
});
