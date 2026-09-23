import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Android back button in the APKs: go back a page when there is one (from a game
// to the hub in the all-games app), otherwise close the app. Does nothing on the web.
export function handleAndroidBack() {
  if (!Capacitor.isNativePlatform()) return;
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });
}
