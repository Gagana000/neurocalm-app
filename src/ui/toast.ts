import { Alert, Platform, ToastAndroid } from "react-native";

export function toast(title: string, message?: string) {
  const text = message ? `${title}: ${message}` : title;

  if (Platform.OS === "web") {
    // Guaranteed visible on web
    // eslint-disable-next-line no-alert
    window.alert(text);
    return;
  }

  if (Platform.OS === "android") {
    ToastAndroid.show(text, ToastAndroid.SHORT);
    return;
  }

  Alert.alert(title, message);
}
