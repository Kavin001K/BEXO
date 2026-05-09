import { Feather } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { CITIES, type CityEntry } from "@/data/cityData";
import { useColors } from "@/hooks/useColors";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * A location input with inline city/country autocomplete.
 * Searches a curated dataset of major cities — no API calls, works offline.
 */
export function LocationInput({
  value,
  onChangeText,
  placeholder = "City, Country",
  autoFocus = false,
}: Props) {
  const colors = useColors();
  const [query, setQuery] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (text: string) => {
      setQuery(text);
      onChangeText(text);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setShowDropdown(text.length >= 2);
      }, 150);
    },
    [onChangeText]
  );

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return CITIES.filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        `${c.city}, ${c.country}`.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [query]);

  const handleSelect = useCallback(
    (entry: CityEntry) => {
      const formatted = `${entry.city}, ${entry.country}`;
      setQuery(formatted);
      onChangeText(formatted);
      setShowDropdown(false);
      inputRef.current?.blur();
    },
    [onChangeText]
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.primary + "18" },
          ]}
        >
          <Feather name="map-pin" size={14} color={colors.primary} />
        </View>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: showDropdown && results.length > 0 ? colors.primary : colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={handleChange}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          autoFocus={autoFocus}
          selectionColor={colors.primary}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {showDropdown && results.length > 0 && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 16,
                },
                android: { elevation: 8 },
                web: { boxShadow: "0 8px 24px rgba(0,0,0,0.2)" },
              }),
            },
          ]}
        >
          {results.map((item, idx) => (
            <TouchableOpacity
              key={`${item.city}-${item.country}`}
              style={[
                styles.item,
                idx < results.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <Feather
                name="map-pin"
                size={13}
                color={colors.mutedForeground}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.cityText, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {item.city}
                </Text>
                <Text
                  style={[
                    styles.countryText,
                    { color: colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {item.country}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 100,
    width: "100%",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  iconWrap: {
    position: "absolute",
    left: 14,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 52,
    paddingRight: 16,
    paddingVertical: 14,
    fontSize: 15,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cityText: {
    fontSize: 14,
    fontWeight: "600",
  },
  countryText: {
    fontSize: 12,
    marginTop: 1,
  },
});
