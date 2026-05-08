import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CARDS = [
  {
    icon: "zap",
    title: "Your portfolio,\nyour identity.",
    subtitle: "Build a stunning student portfolio in minutes. Stand out with a professional online presence.",
    gradient: ["#7C6AFA", "#A06AFA"],
  },
  {
    icon: "upload-cloud",
    title: "AI-powered\nresume parsing.",
    subtitle: "Upload your resume and let our AI extract your education, experience, projects, and skills automatically.",
    gradient: ["#6AFAD0", "#3EC8A0"],
  },
  {
    icon: "share-2",
    title: "Share anywhere.\nTrack everything.",
    subtitle: "Get a live portfolio site with analytics. See who views, clicks, and shares your work in real-time.",
    gradient: ["#FA6A6A", "#FAD06A"],
  },
];

export default function IntroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIdx(idx);
  };

  const isLast = activeIdx === CARDS.length - 1;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 20);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 20);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: topPad + 8 }]}
          onPress={() => router.replace("/(auth)")}
        >
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: topPad + 60, paddingBottom: bottomPad }}
      >
        {CARDS.map((card, i) => (
          <View key={i} style={[styles.card, { width: SCREEN_WIDTH }]}>
            {/* Icon */}
            <LinearGradient
              colors={card.gradient}
              style={styles.iconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name={card.icon as any} size={36} color="#fff" />
            </LinearGradient>

            <Text style={[styles.title, { color: colors.foreground }]}>{card.title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{card.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={[styles.bottom, { paddingBottom: bottomPad + 12 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {CARDS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIdx ? colors.primary : colors.border,
                  width: i === activeIdx ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {isLast ? (
          <BexoButton
            label="Get Started"
            onPress={() => router.replace("/(auth)")}
            icon={<Feather name="arrow-right" size={16} color="#fff" />}
          />
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => {
              const nextIdx = activeIdx + 1;
              scrollRef.current?.scrollTo({ x: nextIdx * SCREEN_WIDTH, animated: true });
            }}
          >
            <LinearGradient
              colors={["#7C6AFA", "#A06AFA"]}
              style={styles.nextCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="arrow-right" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: { fontSize: 15, fontWeight: "500" },
  card: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
    gap: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 320,
  },
  bottom: {
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    alignItems: "center",
  },
  nextCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
