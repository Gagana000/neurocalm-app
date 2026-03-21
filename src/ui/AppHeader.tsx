import React from "react";
import { View, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { AppText } from "./AppText";
import { theme } from "./theme";

export function AppHeader({
  title,
  canGoBack = true,
}: {
  title: string;
  canGoBack?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space.md,
        paddingBottom: theme.space.lg,
      }}
    >
      {canGoBack ? (
        <Pressable
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace("/home"))}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.9 : 1,
            ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
          })}
        >
          {/* IMPORTANT: icon/text MUST be inside AppText/Text */}
          <AppText style={{ fontWeight: "900", fontSize: 18 }}>←</AppText>
        </Pressable>
      ) : (
        <View style={{ width: 42, height: 42 }} />
      )}

      <AppText style={{ fontWeight: "900", fontSize: 20 }}>{title}</AppText>
    </View>
  );
}
