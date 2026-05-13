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
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

const CY = new Date().getFullYear();
const YEARS = Array.from({ length: CY - 1984 + 6 }, (_, i) => String(CY + 5 - i));

interface Props {
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
  allowPresent?: boolean;
  onClose?: () => void;
}

export const YearPickerSheet = React.forwardRef<BottomSheetModal, Props>(
  ({ value, onChange, accentColor, allowPresent, onClose }, ref) => {
    const snapPoints = useMemo(() => ["45%"], []);
    const items = useMemo(() => (allowPresent ? ["Present", ...YEARS] : YEARS), [allowPresent]);

    const normalizedValue = useMemo(() => {
      const v = value?.trim();
      if (!v) return items[0];
      return items.includes(v) ? v : items[0];
    }, [value, items]);

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
            <Text style={styles.title}>Select Year</Text>
            <BottomSheetFlatList
              data={items}
              keyExtractor={(x) => x}
              initialScrollIndex={items.indexOf(normalizedValue) > 1 ? items.indexOf(normalizedValue) - 2 : 0}
              getItemLayout={(_, idx) => ({ length: 52, offset: 52 * idx, index: idx })}
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
                    {sel && <View style={[styles.dot, { backgroundColor: accentColor }]} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ) : (
          <BottomSheetView style={styles.content}>
            <Text style={styles.title}>Select Year</Text>
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
    marginBottom: 6,
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
  row: {
    height: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    gap: 8,
  },
  rowTxt: {
    fontSize: 18,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
