import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { COMPLETENESS_PASS_SCORE } from "@/lib/profileCompleteness";
import { useColors } from "@/hooks/useColors";

interface Props {
  score: number;
  size?: number;
}

export function ProgressRing({ score, size = 48 }: Props) {
  const colors = useColors();
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference - (clamped / 100) * circumference;
  const pass = clamped >= COMPLETENESS_PASS_SCORE;
  const ringColor = pass ? colors.success : colors.warning;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[styles.text, { color: colors.foreground, fontSize: size * 0.26 }]}>
        {clamped}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { position: "absolute", fontWeight: "700" },
});
