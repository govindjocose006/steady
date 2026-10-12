'use client';

import {Dialog} from 'radix-ui';

// Installation help never navigates, writes records, or stores private drafts.
export default function InstallSteady() {
  return <Dialog.Root>
    <Dialog.Trigger asChild><button type="button" className="text-button install-button">Install Steady</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay"/>
      <Dialog.Content className="task-dialog">
        <div className="dialog-heading"><div>
          <Dialog.Title>Steady on your phone</Dialog.Title>
          <Dialog.Description>Keep Steady on your home screen, with the same Google account and workspace.</Dialog.Description>
        </div></div>
        <ol className="install-steps">
          <li>Open this website in Chrome on your Android phone.</li>
          <li>Open Chrome’s three-dot menu, choose <strong>Add to Home screen</strong>, then <strong>Install</strong>. The wording may vary by browser.</li>
          <li>Open Steady from its icon and sign in with your Google account if asked.</li>
        </ol>
        <p className="field-help">Already installed? Open the Steady icon on your home screen. On a laptop, use the browser’s install option if available.</p>
        <p className="field-help">Internet is required for sign-in and syncing. To work without it, enable Offline on this device from your workspace first. Installing does not copy records from the original Sites app.</p>
        <div className="dialog-actions"><Dialog.Close asChild><button type="button" className="primary-button">Got it</button></Dialog.Close></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
