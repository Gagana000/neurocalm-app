import React from "react";
import { TextInput, View } from "react-native";
import { theme } from "./theme";
import { AppText } from "./AppText";

export function Input({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label?: string }) {
  return (
    <View style={{ gap: theme.space.sm }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        placeholderTextColor={theme.colors.subtext}
        style={{
          backgroundColor: theme.colors.inputBg,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.space.lg,
          paddingVertical: 12,
          color: theme.colors.text,
          fontSize: theme.text.body,
        }}
        {...props}
      />
    </View>
  );
}
