import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../src/firebase/firebaseConfig";
import { theme } from "../src/ui/theme";

export default function Entry() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      router.replace(user ? "/home" : "/login");
    });

    return () => unsub();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
      <ActivityIndicator />
    </View>
  );
}
