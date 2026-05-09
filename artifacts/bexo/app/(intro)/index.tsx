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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";

const { width: W } = Dimensions.get("window");

const CARDS = [
  {
    icon: "zap" as const,
    title: "Your portfolio,\nyour identity.",
    subtitle: "Build a stunning student portfolio in minutes. Stand out with a professional online presence.",
    gradient: ["#7C6AFA", "#A06AFA"] as [string, string],
    glow: "#7C6AFA",
  },
  {
    icon: "upload-cloud" as const,
    title: "AI-powered\nresume parsing.",
    subtitle: "Upload your resume and let our AI extract education, experience, projects, and skills automatically.",
    gradient: ["#6AFAD0", "#3EC8A0"] as [string, string],
    glow: "#6AFAD0",
  },
  {
    icon: "share-2" as const,
    title: "Share anywhere.\nTrack everything.",
    subtitle: "Get a live portfolio site with real-time analytics. See who views, clicks, and shares your work.",
    gradient: ["#FA6A6A", "#FAD06A"] as [string, string],
    glow: "#FA6A6A",
  },
];

function AnimatedDot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 24 : 8);
  const colors = useColors();

  React.useEffect(() => {
    width.value = withSpring(active ? 24 : 8, { stiffness: 300, damping: 20 });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    height: 8,
    borderRadius: 4,
    backgroundColor: active ? colors.primary : colors.border,
  }));

  return <Animated.View style={style} />;
}

export default function IntroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const isLast = activeIdx === CARDS.length - 1;

  const topPad    = insets.top + (Platform.OS === "web" ? 67 : 20);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 20);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIdx(idx);
  };

  const goNext = () => {
    const next = activeIdx + 1;
    scrollRef.current?.scrollTo({ x: next * W, animated: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic glow */}
      <LinearGradient
        colors={[CARDS[activeIdx].glow + "22", "transparent"]}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Skip */}
      {!isLast && (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.skipWrap, { top: topPad + 8 }]}>
          <TouchableOpacity
            style={[styles.skipBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.replace("/(auth)")}
          >
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Cards */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 48 }}
      >
        {CARDS.map((card, i) => (
          <View key={i} style={[styles.card, { width: W }]}>
            {/* Icon */}
            <Animated.View entering={FadeInDown.delay(i === activeIdx ? 0 : 0).springify()}>
              <LinearGradient
                colors={card.gradient}
                style={styles.iconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name={card.icon} size={38} color="#fff" />
              </LinearGradient>
            </Animated.View>

            <Text style={[styles.title, { color: colors.foreground }]}>{card.title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {card.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <Animated.View
        entering={FadeInUp.delay(200).springify()}
        style={[styles.bottom, { paddingBottom: bottomPad + 16 }]}
      >
        {/* Dots */}
        <View style={styles.dots}>
          {CARDS.map((_, i) => (
            <AnimatedDot key={i} active={i === activeIdx} />
          ))}
        </View>

        {isLast ? (
          <BexoButton
            label="Get Started"
            onPress={() => router.replace("/(auth)")}
            icon={<Feather name="arrow-right" size={16} color="#fff" />}
          />
        ) : (
          <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
            <LinearGradient
              colors={CARDS[activeIdx].gradient}
              style={styles.nextBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="arrow-right" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 380 },
  skipWrap: { position: "absolute", right: 20, zIndex: 10 },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipText: { fontSize: 14, fontWeight: "500" },
  card: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 22,
    flex: 1,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    ...Platform.select({
      ios:     { shadowColor: "#7C6AFA", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24 },
      android: { elevation: 12 },
      web:     { boxShadow: "0 12px 32px rgba(124,106,250,0.45)" },
    }),
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 42,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  bottom: {
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 24,
  },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  nextBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios:     { shadowColor: "#7C6AFA", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16 },
      android: { elevation: 8 },
      web:     { boxShadow: "0 8px 24px rgba(124,106,250,0.4)" },
    }),
  },
});
