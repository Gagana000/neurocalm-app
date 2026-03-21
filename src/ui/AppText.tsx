import React from "react";
import { Text, TextProps } from "react-native";
import { theme } from "./theme";

type Variant = "h1" | "h2" | "body" | "small" | "label" | "sub";

export function AppText({
  variant = "body",
  style,
  ...props
}: TextProps & { variant?: Variant }) {
  const base = { color: theme.colors.text, fontSize: theme.text.body };

  const map: Record<Variant, any> = {
    h1: { fontSize: theme.text.h1, fontWeight: "800" },
    h2: { fontSize: theme.text.h2, fontWeight: "700" },
    body: { fontSize: theme.text.body, fontWeight: "500" },
    small: { fontSize: theme.text.small, fontWeight: "500", color: theme.colors.subtext },
    label: { fontSize: 13, fontWeight: "700", color: theme.colors.subtext },
    sub: { fontSize: 14, fontWeight: "500", color: theme.colors.subtext },
  };

  return <Text {...props} style={[base, map[variant], style]} />;
}
