import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
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
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";

const { width: W, height: H } = Dimensions.get("window");

const SCREENS = [
  {
    image: require("../../assets/images/Screen_1.png"),
    headline: "Your Portfolio.\nYour Identity.",
    subtitle: "Create a professional portfolio website in minutes.",
  },
  {
    image: require("../../assets/images/Screen_2.png"),
    headline: "Upload Resume.\nLet AI Do The Work.",
    subtitle: "We automatically extract projects, skills, experience and more.",
  },
  {
    image: require("../../assets/images/Screen_3.png"),
    headline: "Stand Out\nOnline.",
    subtitle: "Choose themes, fonts and your personal style.",
  },
  {
    image: require("../../assets/images/Screen_4.png"),
    headline: "Launch Your\nPersonal Website.",
    subtitle: "username.mybexo.com — live in minutes.",
  },
];

function AnimatedDot({ active }: { active: boolean }) {
  const dotWidth = useSharedValue(active ? 28 : 8);

  React.useEffect(() => {
    dotWidth.value = withSpring(active ? 28 : 8, { stiffness: 300, damping: 22 });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    width: dotWidth.value,
    height: 8,
    borderRadius: 4,
    backgroundColor: active ? "#7C6AFA" : "rgba(255,255,255,0.2)",
  }));

  return <Animated.View style={style} />;
}

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const isLast = activeIdx === SCREENS.length - 1;
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    if (idx >= 0 && idx < SCREENS.length && idx !== activeIdx) {
      setActiveIdx(idx);
    }
  };

  React.useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeIdx + 1) % SCREENS.length;
      scrollRef.current?.scrollTo({ x: next * W, animated: true });
      setActiveIdx(next);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeIdx]);

  const goNext = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      router.replace("/(auth)");
      return;
    }
    const next = activeIdx + 1;
    scrollRef.current?.scrollTo({ x: next * W, animated: true });
  };

  const current = SCREENS[activeIdx];

  return (
    <View style={[styles.container, { backgroundColor: "#08081A" }]}>
      {/* Full-screen image carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFill}
        bounces={false}
        decelerationRate="fast"
      >
        {SCREENS.map((screen, i) => (
          <View key={i} style={{ width: W, height: H }}>
            <Image
              source={screen.image}
              style={styles.screenImage}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>

      {/* Top logo */}
      <Animated.View
        entering={FadeIn.duration(500)}
        style={[styles.logoContainer, { top: insets.top + (Platform.OS === "web" ? 67 : 20) }]}
      >
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Skip button */}
      {!isLast && (
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[styles.skipWrap, { top: insets.top + (Platform.OS === "web" ? 67 : 20) }]}
        >
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace("/(auth)")}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bottom gradient + content */}
      <LinearGradient
        colors={["transparent", "rgba(8,8,26,0.5)", "rgba(8,8,26,0.97)"]}
        style={styles.bottomGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      <Animated.View
        entering={FadeInUp.delay(200).springify()}
        style={[styles.bottom, { paddingBottom: bottomPad + 12 }]}
      >
        {/* Per-slide text */}
        <View style={styles.textBlock}>
          <Text style={styles.headline}>{current.headline}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {SCREENS.map((_, i) => (
            <AnimatedDot key={i} active={i === activeIdx} />
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          {isLast ? (
            <BexoButton
              label="Get Started"
              onPress={() => router.replace("/(auth)")}
            />
          ) : (
            <TouchableOpacity
              onPress={goNext}
              activeOpacity={0.85}
              style={styles.nextBtnWrap}
            >
              <LinearGradient
                colors={["#7C6AFA", "#9C6AFA"]}
                style={styles.nextBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenImage: { width: W, height: H },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  logoContainer: {
    position: "absolute",
    left: 20,
    zIndex: 10,
  },
  logo: { width: 80, height: 32 },
  skipWrap: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    gap: 20,
  },
  textBlock: { gap: 8 },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  ctaWrap: { width: "100%" },
  nextBtnWrap: { width: "100%" },
  nextBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#7C6AFA",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      web: { boxShadow: "0 8px 24px rgba(124,106,250,0.4)" },
    }),
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
