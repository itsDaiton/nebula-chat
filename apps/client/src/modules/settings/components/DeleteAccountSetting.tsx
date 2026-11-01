import { DeleteAccountForm } from '@/modules/settings/components/DeleteAccountForm';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

const { deleteAccount } = resources.settings.account;

/** The Delete account row; its button opens a confirmation over the Settings dialog. */
export const DeleteAccountSetting = () => (
  <SettingsRow label={deleteAccount.label} description={deleteAccount.description}>
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>
        {deleteAccount.action}
      </DialogTrigger>
      <DialogContent role="alertdialog" className="app-shell sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{deleteAccount.dialogTitle}</DialogTitle>
          <DialogDescription>{deleteAccount.warning}</DialogDescription>
        </DialogHeader>
        <DeleteAccountForm />
        <DialogClose render={<Button variant="outline" />}>{deleteAccount.cancel}</DialogClose>
      </DialogContent>
    </Dialog>
  </SettingsRow>
);
