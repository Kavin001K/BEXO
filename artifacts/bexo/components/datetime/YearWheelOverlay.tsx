import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CY = new Date().getFullYear();
const YEARS = Array.from({ length: CY - 1984 + 6 }, (_, i) => String(CY + 5 - i));

export type YearWheelOverlayProps = {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
  allowPresent?: boolean;
  /**
   * `modal` — separate RN Modal (default).
   * `layer` — absolute overlay inside the parent view (required inside another Modal / pageSheet so the picker isn’t trapped behind it).
   */
  attachMode?: "modal" | "layer";
};

/**
 * Year wheel: default uses RN `Modal`. For Edit Education (nested inside a page-sheet `Modal`),
 * pass **`attachMode="layer"`** so the wheel paints above the form.
 */
export function YearWheelOverlay({
  visible,
  onClose,
  value,
  onChange,
  accentColor,
  allowPresent,
  attachMode = "modal",
}: YearWheelOverlayProps) {
  const items = useMemo(() => (allowPresent ? ["Present", ...YEARS] : YEARS), [allowPresent]);

  const normalizedValue = useMemo(() => {
    const v = value?.trim();
    if (!v) return items[0];
    return items.includes(v) ? v : items[0];
  }, [value, items]);

  const [pending, setPending] = useState(normalizedValue);
  useEffect(() => setPending(normalizedValue), [normalizedValue]);

  const dismiss = () => onClose();

  const handleDone = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    onChange(pending);
    dismiss();
  };

  const handleCancel = () => {
    setPending(normalizedValue);
    dismiss();
  };

  const handleSelectWeb = (item: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    onChange(item);
    dismiss();
  };

  const sheetBody = (
    <>
      <Text style={styles.title}>Select Year</Text>

      {Platform.OS === "web" ? (
        <>
          <FlatList
            style={{ maxHeight: 320 }}
            data={items}
            keyExtractor={(x) => x}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const sel = item === normalizedValue;
              return (
                <TouchableOpacity
                  onPress={() => handleSelectWeb(item)}
                  style={[styles.row, sel && { backgroundColor: accentColor + "22" }]}
                >
                  <Text style={[styles.rowTxt, sel && { color: accentColor, fontWeight: "800" }]}>
                    {item}
                  </Text>
                  {sel ? <View style={[styles.dot, { backgroundColor: accentColor }]} /> : null}
                </TouchableOpacity>
              );
            }}
          />
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleCancel} hitSlop={12}>
              <Text style={styles.footerCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Picker
            selectedValue={pending}
            onValueChange={(v) => setPending(String(v))}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {items.map((y) => (
              <Picker.Item key={y} label={y} value={y} color="#ffffff" />
            ))}
          </Picker>
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleCancel} hitSlop={12}>
              <Text style={styles.footerCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDone} hitSlop={12}>
              <Text style={[styles.footerDone, { color: accentColor }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
  );

  if (attachMode === "layer") {
    if (!visible) return null;
    return (
      <View
        style={[StyleSheet.absoluteFillObject, styles.layerRoot]}
        pointerEvents="box-none"
      >
        <Pressable style={styles.layerBackdrop} onPress={handleCancel} />
        <Pressable style={[styles.sheet, styles.layerSheet]} onPress={(e) => e.stopPropagation()}>
          {sheetBody}
        </Pressable>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {sheetBody}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layerRoot: {
    zIndex: 100000,
    elevation: 100000,
  },
  layerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  layerSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#111118",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    paddingTop: 16,
    paddingHorizontal: 24,
    maxHeight: "55%",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  picker: { height: 216 },
  pickerItem: { color: "#fff", fontSize: 22 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  footerCancel: { fontSize: 17, color: "rgba(255,255,255,0.55)" },
  footerDone: { fontSize: 17, fontWeight: "700" },
  row: {
    height: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    gap: 8,
  },
  rowTxt: { fontSize: 18, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
