import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/stores/useAuthStore";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "US (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "AU (+61)" },
  { code: "+49", label: "DE (+49)" },
  { code: "+33", label: "FR (+33)" },
  { code: "+81", label: "JP (+81)" },
  { code: "+86", label: "CN (+86)" },
  { code: "+55", label: "BR (+55)" },
  { code: "+234", label: "NG (+234)" },
];

export default function CollectPhoneScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setCollectedPhone } = useAuthStore();
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");

  const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

  const handleContinue = () => {
    if (!phone || phone.replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number");
      return;
    }
    setCollectedPhone(fullPhone);
    router.replace("/dashboard");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#FA6A6A18", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconBadge, { backgroundColor: colors.surface }]}>
            <Feather name="smartphone" size={32} color={colors.primary} />
          </View>

          <Text style={[styles.headline, { color: colors.foreground }]}>
            What's your phone number?
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            We'll use this to send you portfolio updates and login codes.
          </Text>

          <View style={[styles.phoneRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.countryBtn, { borderRightColor: colors.border }]}
              onPress={() => setShowPicker(!showPicker)}
            >
              <Text style={[styles.countryText, { color: colors.foreground }]}>{countryCode}</Text>
              <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TextInput
              style={[styles.phoneInput, { color: colors.foreground }]}
              placeholder="Phone number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              selectionColor={colors.primary}
              autoFocus
            />
          </View>

          {/* Country picker Modal */}
          <Modal
            visible={showPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPicker(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[styles.pickerModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select Country</Text>
                    <ScrollView>
                      {COUNTRY_CODES.map((c) => (
                        <TouchableOpacity
                          key={c.code}
                          style={[
                            styles.pickerItem,
                            countryCode === c.code && { backgroundColor: colors.surface }
                          ]}
                          onPress={() => {
                            setCountryCode(c.code);
                            setShowPicker(false);
                          }}
                        >
                          <Text style={[styles.pickerLabel, { color: colors.foreground }]}>{c.label}</Text>
                          {countryCode === c.code && (
                            <Feather name="check" size={16} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {error ? (
            <Text style={[styles.error, { color: colors.accent }]}>{error}</Text>
          ) : null}

          <BexoButton label="Continue" onPress={handleContinue} icon={<Feather name="arrow-right" size={16} color="#fff" />} />

          <TouchableOpacity onPress={() => router.replace("/dashboard")}>
            <Text style={[styles.skip, { color: colors.mutedForeground }]}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 250 },
  scroll: { paddingHorizontal: 28, gap: 20, alignItems: "stretch" },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  headline: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 15, lineHeight: 22 },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    height: 52,
    overflow: "hidden",
  },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    height: "100%",
    borderRightWidth: 1,
  },
  countryText: { fontSize: 14, fontWeight: "600" },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    height: "100%",
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerModal: {
    width: "100%",
    maxHeight: "60%",
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 12,
    ...Platform.select({
      web: { boxShadow: "0 10px 20px rgba(0,0,0,0.3)" },
      default: {
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pickerLabel: { fontSize: 16, fontWeight: "500" },
  error: { fontSize: 13, marginTop: -8 },
  skip: { textAlign: "center", fontSize: 14 },
});
