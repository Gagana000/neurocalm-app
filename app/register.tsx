import React, { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../src/firebase/firebaseConfig";
import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { Input } from "../src/ui/Input";
import { Button } from "../src/ui/Button";
import { theme } from "../src/ui/theme";
import { toast } from "../src/ui/toast";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || password.length < 6) {
      Alert.alert("Check details", "Name, valid email, password (min 6).");
      return;
    }

    try {
      setLoading(true);

      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      // Create Firestore profile document (required for dashboard greeting)
      await setDoc(doc(db, "users", cred.user.uid), {
        name: cleanName,
        email: cleanEmail,
        createdAt: serverTimestamp(),
      });

      toast("Account created", "Welcome to Neuro Calm!");
      router.replace("/home");
    } catch (e: any) {
      // Cleaner common errors
      const msg =
        e?.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : e?.code === "auth/invalid-email"
          ? "Invalid email format."
          : e?.code === "auth/weak-password"
          ? "Password is too weak (min 6 characters)."
          : e?.message || "Something went wrong.";

      Alert.alert("Register failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.space.xl }}>
        <View style={{ gap: theme.space.sm }}>
          <AppText variant="h2">Create account</AppText>
          <AppText variant="sub">Start tracking patterns and improving daily.</AppText>
        </View>

        <View style={{ gap: theme.space.lg }}>
          <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" />

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
            placeholder="Min 6 characters"
          />

          <Button title="Create account" onPress={onRegister} loading={loading} />
          <Button title="Back to login" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
