import { router } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

import { useAuthStore } from "@/stores/useAuthStore";

export default function RootIndex() {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        router.replace("/(main)/dashboard");
      } else {
        router.replace("/(auth)");
      }
    }
  }, [isLoading, session]);

  return <View style={{ flex: 1, backgroundColor: "#0A0A0F" }} />;
}
