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

import { BexoButton } from "@/components/ui/BexoButton";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";

const { width: W } = Dimensions.get("window");

const SCREENS = [
  {
    image: require("../../assets/images/Screen_1.png"),
    headline: "Your portfolio.\nYour identity.",
    subtitle: "Create a professional portfolio website in minutes.",
  },
  {
    image: require("../../assets/images/Screen_2.png"),
    headline: "Upload resume.\nLet AI do the work.",
    subtitle: "We extract projects, skills, experience, and more.",
  },
  {
    image: require("../../assets/images/Screen_3.png"),
    headline: "Stand out\nonline.",
    subtitle: "Choose themes, fonts, and your personal style.",
  },
  {
    image: require("../../assets/images/Screen_4.png"),
    headline: "Launch your\npersonal website.",
    subtitle: "username.mybexo.com — live in minutes.",
  },
];

function AnimatedDot({ active, color }: { active: boolean; color: string }) {
  const dotWidth = useSharedValue(active ? 28 : 8);

  React.useEffect(() => {
    dotWidth.value = withSpring(active ? 28 : 8, { stiffness: 300, damping: 22 });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    width: dotWidth.value,
    height: 8,
    borderRadius: 4,
    backgroundColor: active ? color : color + "33",
  }));

  return <Animated.View style={style} />;
}

export default function IntroScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const isLast = activeIdx === SCREENS.length - 1;
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 20);

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
    void tapLight();
    if (isLast) {
      router.replace("/(auth)");
      return;
    }
    const next = activeIdx + 1;
    scrollRef.current?.scrollTo({ x: next * W, animated: true });
  };

  const current = SCREENS[activeIdx];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
        bounces={false}
        decelerationRate="fast"
      >
        {SCREENS.map((screen, i) => (
          <View key={i} style={{ width: W }}>
            <Image source={screen.image} style={styles.screenImage} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>

      <Animated.View entering={FadeIn.duration(500)} style={[styles.logoContainer, { top: topPad }]}>
        <Image source={require("../../assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      {!isLast && (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.skipWrap, { top: topPad }]}>
          <TouchableOpacity
            style={[styles.skipBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.replace("/(auth)")}
            activeOpacity={0.85}
          >
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Animated.View
        entering={FadeInUp.delay(200).springify()}
        style={[styles.bottom, { paddingBottom: bottomPad + 12, backgroundColor: colors.background }]}
      >
        <View style={styles.textBlock}>
          <Text style={[styles.headline, { color: colors.foreground }]}>{current.headline}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{current.subtitle}</Text>
        </View>

        <View style={styles.dots}>
          {SCREENS.map((_, i) => (
            <AnimatedDot key={i} active={i === activeIdx} color={colors.primary} />
          ))}
        </View>

        <View style={styles.ctaWrap}>
          {isLast ? (
            <BexoButton label="Get started" onPress={() => router.replace("/(auth)")} />
          ) : (
            <BexoButton label="Next" variant="secondary" onPress={goNext} />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  carousel: { flex: 1 },
  screenImage: { width: W, height: "72%" },
  logoContainer: { position: "absolute", left: 24, zIndex: 10 },
  logo: { width: 72, height: 72, borderRadius: 18 },
  skipWrap: { position: "absolute", right: 24, zIndex: 10 },
  skipBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  skipText: { fontSize: 14, fontWeight: "600" },
  bottom: {
    flex: 1,
    paddingHorizontal: 28,
    gap: 20,
    paddingTop: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  textBlock: { gap: 8 },
  headline: {
    fontSize: 30,
    fontWeight: "700",
    fontFamily: fonts.sansBold,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: { fontSize: 15, lineHeight: 22 },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  ctaWrap: { width: "100%" },
});
