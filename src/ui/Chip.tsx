import React from "react";
import { Pressable } from "react-native";
import { AppText } from "./AppText";
import { theme } from "./theme";

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: selected ? "transparent" : theme.colors.border,
          backgroundColor: selected ? theme.colors.primary : "transparent",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <AppText style={{ fontWeight: "800" }}>{selected ? `✓ ${label}` : label}</AppText>
    </Pressable>
  );
}