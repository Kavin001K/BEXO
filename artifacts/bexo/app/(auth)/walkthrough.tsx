import { router } from "expo-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

import { BexoButton } from "@/components/ui/BexoButton";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { tapLight } from "@/lib/haptics";
import { useAuthStore } from "@/stores/useAuthStore";

const { width, height } = Dimensions.get("window");
const AUTO_SCROLL_MS = 15000;

const SLIDES = [
  {
    id: "1",
    image: require("../../assets/images/Screen_1.png"),
    title: "Your work, beautifully framed",
    subtitle: "A portfolio that feels editorial, not templated.",
  },
  {
    id: "2",
    image: require("../../assets/images/Screen_2.png"),
    title: "Built in minutes",
    subtitle: "Upload a resume or add details step by step.",
  },
  {
    id: "3",
    image: require("../../assets/images/Screen_3.png"),
    title: "Share one link",
    subtitle: "A clean home for projects, experience, and contact.",
  },
  {
    id: "4",
    image: require("../../assets/images/Screen_4.png"),
    title: "Ready when you are",
    subtitle: "Sign in with WhatsApp and start shaping your site.",
  },
];

export default function WalkthroughScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const setHasSeenWalkthrough = useAuthStore((s) => s.setHasSeenWalkthrough);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cancelAnimation(progress);
    progress.value = 0;
  }, [progress]);

  const handleFinish = useCallback(() => {
    stopTimer();
    setHasSeenWalkthrough(true);
    router.replace("/(auth)");
  }, [stopTimer, setHasSeenWalkthrough]);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
      setActiveIndex(activeIndex + 1);
    } else {
      handleFinish();
    }
  }, [activeIndex, handleFinish]);

  const startTimer = useCallback(() => {
    stopTimer();
    progress.value = withTiming(1, {
      duration: AUTO_SCROLL_MS,
      easing: Easing.linear,
    });

    timerRef.current = setInterval(() => {
      handleNext();
    }, AUTO_SCROLL_MS);
  }, [stopTimer, progress, handleNext]);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [activeIndex, startTimer, stopTimer]);

  const renderItem = ({ item }: { item: (typeof SLIDES)[0] }) => (
    <View style={styles.slide}>
      <Image
        source={item.image}
        style={styles.image}
        resizeMode="cover"
        fadeDuration={0}
      />
    </View>
  );

  const getItemLayout = (_: unknown, index: number) => ({
    length: width,
    offset: width * index,
    index,
  });

  const slide = SLIDES[activeIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.timerTrack, { top: insets.top, backgroundColor: colors.border }]}>
        <Animated.View style={[styles.timerProgress, { backgroundColor: colors.primary }, progressStyle]} />
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={2}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          if (index !== activeIndex) {
            setActiveIndex(index);
          } else {
            startTimer();
          }
        }}
        onScrollBeginDrag={stopTimer}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
        keyExtractor={(item) => item.id}
      />

      <TouchableOpacity
        style={[styles.skipBtn, { top: insets.top + 16 }]}
        onPress={() => {
          void tapLight();
          handleFinish();
        }}
      >
        <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
      </TouchableOpacity>

      <View style={[styles.footer, { bottom: insets.bottom + 24, backgroundColor: colors.background }]}>
        <View style={styles.copyBlock}>
          <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: fonts.sansBold }]}>
            {slide.title}
          </Text>
          <Text style={[styles.slideSub, { color: colors.mutedForeground }]}>{slide.subtitle}</Text>
        </View>

        <View style={styles.footerActions}>
          <View style={styles.pagination}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === activeIndex ? colors.primary : colors.border,
                    width: i === activeIndex ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.nextBtn}>
            <BexoButton
              label={activeIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
              onPress={handleNext}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  timerTrack: {
    position: "absolute",
    left: 24,
    right: 24,
    height: 2,
    borderRadius: 1,
    zIndex: 20,
    overflow: "hidden",
  },
  timerProgress: {
    height: "100%",
    borderRadius: 1,
  },
  skipBtn: {
    position: "absolute",
    right: 24,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  slide: {
    width,
    height,
  },
  image: {
    width,
    height: height * 0.62,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  copyBlock: {
    alignItems: "flex-start",
    gap: 8,
    maxWidth: "88%",
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  slideSub: {
    fontSize: 15,
    lineHeight: 22,
  },
  footerActions: {
    gap: 16,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    width: "100%",
  },
});
