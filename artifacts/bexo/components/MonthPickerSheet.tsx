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
    const snapPoints = useMemo(() => ["40%"], []);

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
          <Text style={styles.title}>Select Month</Text>
          <View style={styles.grid}>
            {MONTHS.map((m) => {
              const sel = m === value;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => handleSelect(m)}
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
    marginBottom: 20,
    textAlign: "center",
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
