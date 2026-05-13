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
import { Feather } from "@expo/vector-icons";

import { BexoButton } from "@/components/ui/BexoButton";
import { useAuthStore } from "@/stores/useAuthStore";

const { width, height } = Dimensions.get("window");
const AUTO_SCROLL_MS = 15000;

const SLIDES = [
  { id: "1", image: require("../../assets/images/Screen_1.png") },
  { id: "2", image: require("../../assets/images/Screen_2.png") },
  { id: "3", image: require("../../assets/images/Screen_3.png") },
  { id: "4", image: require("../../assets/images/Screen_4.png") },
];

export default function WalkthroughScreen() {
  const insets = useSafeAreaInsets();
  const setHasSeenWalkthrough = useAuthStore((s) => s.setHasSeenWalkthrough);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<any>(null);
  
  const progress = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
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

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={styles.slide}>
      <Image 
        source={item.image} 
        style={styles.image} 
        resizeMode="cover" 
        fadeDuration={0}
      />
    </View>
  );

  const getItemLayout = (_: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  });

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Minimal Timer Bar */}
      <View style={[styles.timerTrack, { top: insets.top }]}>
        <Animated.View style={[styles.timerProgress, progressStyle]} />
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        scrollEnabled={true}
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
            // User swiped but it snapped back to current index, reset timer
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
      
      <View style={styles.skipContainer}>
        <TouchableOpacity 
          style={[styles.skipBtn, { top: insets.top + 20 }]} 
          onPress={handleFinish}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { bottom: insets.bottom + 30 }]}>
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex ? "#fff" : "rgba(255,255,255,0.3)",
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  timerTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    zIndex: 20,
  },
  timerProgress: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  skipContainer: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  skipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },
  slide: {
    width,
    height,
  },
  image: {
    width,
    height,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    gap: 20,
    alignItems: "center",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
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
