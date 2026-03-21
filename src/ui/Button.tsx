import React from "react";
import { Pressable, View, ActivityIndicator } from "react-native";
import { theme } from "./theme";
import { AppText } from "./AppText";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "ghost";
  disabled?: boolean;
};

export function Button({ title, onPress, loading, variant = "primary", disabled }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          borderWidth: 1,
          borderRadius: theme.radius.md,
          paddingVertical: 14,
          alignItems: "center",
          justifyContent: "center",
          opacity: isDisabled ? 0.55 : pressed ? 0.92 : 1,
          backgroundColor: variant === "primary" ? theme.colors.primary : "transparent",
          borderColor: variant === "primary" ? "transparent" : theme.colors.border,
        },
      ]}
    >
      {loading ? (
        <View style={{ height: 20, justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <AppText style={{ fontWeight: "800" }}>{title}</AppText>
      )}
    </Pressable>
  );
}
