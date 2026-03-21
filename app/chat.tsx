import React from "react";
import { View, Pressable, Platform } from "react-native";
import { router } from "expo-router";

import { Screen } from "../src/ui/Screen";
import { AppHeader } from "../src/ui/AppHeader";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";

type Mode = "vent" | "reframe" | "plan";

export default function ChatScreen() {
  const go = (mode: Mode) => router.push({ pathname: "/chat-room", params: { mode } });

  return (
    <Screen>
      <AppHeader title="Chat Support" />

      <View style={{ gap: theme.space.lg }}>
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.xl,
            padding: theme.space.lg,
            gap: 8,
          }}
        >
          <AppText style={{ fontWeight: "900" }}>Private, judgment-free space</AppText>
          <AppText variant="sub">
            This is not medical care. If you’re in danger or feel unsafe, contact emergency services.
          </AppText>
        </View>

        <Card
          title="Vent"
          subtitle="Get it out. No advice unless you ask."
          onPress={() => go("vent")}
        />
        <Card
          title="Reframe"
          subtitle="Turn a stressful thought into a more balanced one."
          onPress={() => go("reframe")}
        />
        <Card
          title="Action plan"
          subtitle="Make a small plan you can do today (5–15 mins)."
          onPress={() => go("plan")}
        />

        <AppText variant="small" style={{ opacity: 0.85 }}>
          Tip: Your chats are saved to your account so you can revisit later.
        </AppText>
      </View>
    </Screen>
  );
}

function Card({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        padding: theme.space.lg,
        gap: 6,
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "900", fontSize: 18 }}>{title}</AppText>
      <AppText variant="sub">{subtitle}</AppText>
    </Pressable>
  );
}