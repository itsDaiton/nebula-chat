import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react';
import { DeleteAccountForm } from '@/modules/settings/components/DeleteAccountForm';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { resources } from '@/resources';

const { deleteAccount } = resources.settings.account;

/** The Delete account row; its button opens a confirmation that can't be skipped. */
export const DeleteAccountSetting = () => (
  <SettingsRow label={deleteAccount.label} description={deleteAccount.description}>
    <Dialog.Root lazyMount unmountOnExit role="alertdialog">
      <Dialog.Trigger asChild>
        <Button variant="outline" colorPalette="red">
          {deleteAccount.action}
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{deleteAccount.dialogTitle}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap={4}>
              <Text>{deleteAccount.warning}</Text>
              <DeleteAccountForm />
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">{deleteAccount.cancel}</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  </SettingsRow>
);
