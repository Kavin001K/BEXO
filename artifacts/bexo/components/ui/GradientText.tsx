import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TextStyle, View } from "react-native";

interface Props {
  text: string;
  colors: string[];
  style?: TextStyle;
}

export function GradientText({ text, colors: _gradColors, style }: Props) {
  return (
    <Text style={[styles.text, style, { color: _gradColors[0] }]}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: "700",
  },
});
