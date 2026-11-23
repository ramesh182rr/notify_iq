import { Alert } from 'react-native';

import { openSourceApp } from '../native/notifyIQ';

/** Opens the app that posted a notification; explains when that is not possible. */
export function openInApp(eventId: number, appLabel: string): void {
  openSourceApp(eventId)
    .then(result => {
      if (result === 'unavailable') Alert.alert(`Can’t open ${appLabel}`, `${appLabel} may have been uninstalled, or it has no screen NotifyIQ can open.`);
    })
    .catch(() => Alert.alert(`Can’t open ${appLabel}`, 'Please open it from your home screen.'));
}
