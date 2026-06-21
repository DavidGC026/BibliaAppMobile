import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import * as api from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BibliaAPP',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

export async function syncPushTokenWithServer(): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (token) {
      await api.registerPushToken(token, Platform.OS);
    }
  } catch {
    // Permisos denegados o Expo Go sin projectId en dev
  }
}

export async function clearPushTokenFromServer(): Promise<void> {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    if (token?.data) {
      await api.unregisterPushToken(token.data);
    }
  } catch {
    // Ignorar si no hay token
  }
}
