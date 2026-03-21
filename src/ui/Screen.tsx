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
  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
      }}
    >
      <Container
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
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}
