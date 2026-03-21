import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web") {
      document.body.style.margin = "0";
      document.body.style.backgroundColor = "#000";
    }
  }, []);

  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="home" />
      <Stack.Screen name="symptom-log" />
      <Stack.Screen name="result" />
      <Stack.Screen name="history" />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      <Stack.Screen name="wellness" />
      <Stack.Screen name="wellness-breathing" />
      <Stack.Screen name="wellness-body-scan" />
      <Stack.Screen name="wellness-grounding" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="chat-room" />
    </Stack>
  );
}
