import React, { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "../src/firebase/firebaseConfig";
import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { Input } from "../src/ui/Input";
import { Button } from "../src/ui/Button";
import { theme } from "../src/ui/theme";
import { toast } from "../src/ui/toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert("Check details", "Enter a valid email and password (min 6).");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast("Signed in", "Good to see you!");
      router.replace("/home");
    } catch (e: any) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.space.xl }}>
        <View style={{ gap: theme.space.sm }}>
          <AppText variant="h1">Neuro Calm</AppText>
          <AppText variant="sub">Sign in to track stress and get recommendations.</AppText>
        </View>

        <View style={{ gap: theme.space.lg }}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@gmail.com"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          <Button title="Sign In" onPress={onLogin} loading={loading} />
          <Button
            title="Create new account"
            variant="ghost"
            onPress={() => router.push("/register")}
          />

          <AppText variant="small">Self-management tool. Not emergency care.</AppText>
        </View>
      </View>
    </Screen>
  );
}
