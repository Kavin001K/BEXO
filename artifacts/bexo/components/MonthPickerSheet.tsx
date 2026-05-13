import { Picker } from "@react-native-picker/picker";
import React, { useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
  onClose?: () => void;
}

export const MonthPickerSheet = React.forwardRef<BottomSheetModal, Props>(
  ({ value, onChange, accentColor, onClose }, ref) => {
    const snapPoints = useMemo(() => ["42%"], []);

    const normalizedValue = useMemo(() => {
      const v = value?.trim();
      if (!v || !MONTHS.includes(v)) return MONTHS[0];
      return v;
    }, [value]);

    const [pending, setPending] = React.useState(normalizedValue);
    React.useEffect(() => setPending(normalizedValue), [normalizedValue]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
        />
      ),
      []
    );

    const dismiss = () => {
      (ref as React.MutableRefObject<BottomSheetModal | null>).current?.dismiss();
      onClose?.();
    };

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
      (ref as React.MutableRefObject<BottomSheetModal | null>).current?.dismiss();
      onClose?.();
    };

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#111118" }}
        handleIndicatorStyle={{ backgroundColor: accentColor, opacity: 0.7 }}
      >
        {Platform.OS === "web" ? (
          <View style={styles.content}>
            <Text style={styles.title}>Select Month</Text>
            <View style={styles.grid}>
              {MONTHS.map((m) => {
                const sel = m === normalizedValue;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => handleSelectWeb(m)}
                    style={[
                      styles.chip,
                      sel
                        ? { backgroundColor: accentColor, borderColor: accentColor }
                        : { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" },
                    ]}
                  >
                    <Text style={[styles.txt, { color: sel ? "#fff" : "rgba(255,255,255,0.65)" }]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <BottomSheetView style={styles.content}>
            <Text style={styles.title}>Select Month</Text>
            <Picker
              selectedValue={pending}
              onValueChange={(v) => setPending(String(v))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {MONTHS.map((m) => (
                <Picker.Item key={m} label={m} value={m} color="#ffffff" />
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
          </BottomSheetView>
        )}
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  picker: {
    height: 216,
  },
  pickerItem: {
    color: "#fff",
    fontSize: 22,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  footerCancel: {
    fontSize: 17,
    color: "rgba(255,255,255,0.55)",
  },
  footerDone: {
    fontSize: 17,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  txt: {
    fontSize: 14,
    fontWeight: "600",
  },
});
