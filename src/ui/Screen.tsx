// src/ui/Screen.tsx
import React from "react";
import { View, SafeAreaView, ScrollView, Platform } from "react-native";
import { theme } from "./theme";

export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  if (!scroll) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
        }}
      >
        <View
          style={{
            flex: 1,
            padding: theme.space.xl,
            width: "100%",
          }}
        >
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: theme.space.xl,
          width: "100%",
        }}
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          width: "100%",
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}