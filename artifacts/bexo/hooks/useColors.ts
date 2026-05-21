import { useColorScheme } from "react-native";
import colors from "@/constants/colors";

/**
 * Returns design tokens for the current color scheme.
 *
 * Switches between `theme` and `dark` palettes based on the device
 * appearance setting. When no `dark` key exists, falls back to `theme`.
 */
type ThemePalette = typeof colors.theme;

export function useColors() {
  const scheme = useColorScheme();
  const palette: ThemePalette =
    scheme === "dark" && "dark" in colors
      ? (colors.dark as ThemePalette)
      : colors.theme;
  return {
    ...palette,
    radius: colors.radius,
    spacing: colors.spacing,
  };
}
