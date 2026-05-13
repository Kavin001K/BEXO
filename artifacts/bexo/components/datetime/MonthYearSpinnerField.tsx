import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatMonthYear, parseIsoMonth, toIsoFirstOfMonth } from "@/lib/dateWheel";

type Props = {
  /** ISO `YYYY-MM-DD` (first of month) or empty */
  value: string;
  onChange: (isoYyyyMmDd: string) => void;
  placeholder: string;
  disabled?: boolean;
  /** Earliest selectable month (default Jan 1970) */
  minimumDate?: Date;
  /** Latest selectable month (default last day of current month) */
  maximumDate?: Date;
};

/**
 * Tap field → native **spinner** date picker (month + day + year wheels).
 * Stored value is **ISO first-of-month** (`YYYY-MM-01`); day wheel is ignored on confirm.
 */
export function MonthYearSpinnerField({
  value,
  onChange,
  placeholder,
  disabled,
  minimumDate,
  maximumDate,
}: Props) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const minD = useMemo(() => minimumDate ?? new Date(1970, 0, 1), [minimumDate]);
  const maxD = useMemo(() => maximumDate ?? new Date(), [maximumDate]);
  const [temp, setTemp] = useState(() =>
    value ? parseIsoMonth(value) : new Date(maxD.getFullYear(), maxD.getMonth(), 1)
  );

  const label = value ? formatMonthYear(value) : "";

  const openPicker = () => {
    if (disabled) return;
    setTemp(value ? parseIsoMonth(value) : new Date(maxD.getFullYear(), maxD.getMonth(), 1));
    setOpen(true);
  };

  const confirm = () => {
    onChange(toIsoFirstOfMonth(temp));
    setOpen(false);
  };

  const cancel = () => {
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        disabled={disabled}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
        activeOpacity={0.75}
      >
        <Text
          style={{
            color: label ? colors.foreground : colors.mutedForeground,
            fontSize: 16,
          }}
        >
          {label || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={cancel}>
        <Pressable style={styles.backdrop} onPress={cancel}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select month & year</Text>
            <DateTimePicker
              value={temp}
              mode="date"
              display="spinner"
              onChange={(_, d) => {
                if (d) setTemp(d);
              }}
              minimumDate={minD}
              maximumDate={maxD}
              {...(Platform.OS === "ios" ? { themeVariant: "dark" as const } : {})}
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={cancel} style={styles.actionBtn}>
                <Text style={{ color: colors.mutedForeground, fontSize: 17 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirm} style={styles.actionBtn}>
                <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "600" }}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "center",
    minHeight: 48,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 28,
    paddingTop: 16,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
});
