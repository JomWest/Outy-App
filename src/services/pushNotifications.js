import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure global notification behavior ("push up" / heads-up)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show banner/alert
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Ensure Android notification channel with high importance for heads-up
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Mensajes',
    importance: Notifications.AndroidImportance.MAX,
    description: 'Notificaciones de mensajes',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
    enableVibrate: true,
    bypassDnd: true,
    showBadge: true,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function requestPermissionsAsync() {
  // iOS foreground presentation options for visible alerts when app is open
  if (Platform.OS === 'ios') {
    await Notifications.setNotificationCategoryAsync('messages', []);
  }

  const settings = await Notifications.getPermissionsAsync();
  let finalStatus = settings.status;
  if (finalStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: true },
    });
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * Register device to receive push and return Expo push token.
 * Also prepares Android channel for heads-up notifications.
 */
export async function registerForPushNotificationsAsync() {
  try {
    const granted = await requestPermissionsAsync();
    if (!granted) return null;

    await ensureAndroidChannel();

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const { data: token } = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return token || null;
  } catch (e) {
    console.error('registerForPushNotificationsAsync error', e);
    return null;
  }
}

export function addMessageNotificationListeners(onReceived, onResponse) {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    if (typeof onReceived === 'function') onReceived(notification);
  });
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (typeof onResponse === 'function') onResponse(response);
  });
  return () => {
    try { receivedSub.remove(); } catch {}
    try { responseSub.remove(); } catch {}
  };
}

/**
 * Helper to schedule a local heads-up notification for latest message
 * (used when app is foreground to emphasize recent messages).
 */
export async function showHeadsUpMessage({ title, body, data }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'Nuevo mensaje',
        body: body || '',
        data: data || {},
        sound: 'default',
      },
      trigger: null, // deliver immediately
    });
  } catch (e) {
    console.error('showHeadsUpMessage error', e);
  }
}