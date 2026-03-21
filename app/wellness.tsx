import React from "react";
import { View, Pressable, Platform } from "react-native";
import { router } from "expo-router";

import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { AppHeader } from "../src/ui/AppHeader";

export default function WellnessHub() {
  return (
    <Screen>
      <AppHeader title="Wellness Tools" />

      <View style={{ gap: theme.space.lg }}>
        <AppText variant="sub">
          Quick tools to calm your body. Use one now, then log a check-in later.
        </AppText>

        <Card
          title="Breathing"
          subtitle="Guided inhale / hold / exhale (2–5 min)"
          onPress={() => router.push("/wellness-breathing")}
        />
        <Card
          title="Body scan"
          subtitle="2 min release tension from head to toe"
          onPress={() => router.push("/wellness-body-scan")}
        />
        <Card
          title="Grounding 5-4-3-2-1"
          subtitle="Reduce anxiety by focusing on senses"
          onPress={() => router.push("/wellness-grounding")}
        />

        <AppText variant="small" style={{ opacity: 0.85 }}>
          These tools support self-management. Not emergency care.
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