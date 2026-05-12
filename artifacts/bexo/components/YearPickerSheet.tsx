import React, { useCallback, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
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
    const snapPoints = useMemo(() => ["50%"], []);
    const items = useMemo(() => (allowPresent ? ["Present", ...YEARS] : YEARS), [allowPresent]);

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

    const handleSelect = (item: string) => {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      onChange(item);
      (ref as any).current?.dismiss();
      if (onClose) onClose();
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
        <View style={styles.content}>
          <Text style={styles.title}>Select Year</Text>
          <BottomSheetFlatList
            data={items}
            keyExtractor={(x) => x}
            initialScrollIndex={items.indexOf(value) > 1 ? items.indexOf(value) - 2 : 0}
            getItemLayout={(_, idx) => ({ length: 52, offset: 52 * idx, index: idx })}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const sel = item === value;
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
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
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
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
