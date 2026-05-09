import { useColorScheme } from "react-native";
import colors from "@/constants/colors";

/**
 * Returns design tokens for the current color scheme.
 *
 * Switches between `theme` and `dark` palettes based on the device
 * appearance setting. When no `dark` key exists, falls back to `theme`.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as Record<string, typeof colors.theme>).dark
      : colors.theme;
  return { ...palette, radius: colors.radius };
}
