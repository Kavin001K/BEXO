import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Modal,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as ImageManipulator from "expo-image-manipulator";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CROP_SIZE = SCREEN_WIDTH * 0.85;

interface ProfilePhotoCropperProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onCrop: (croppedUri: string) => void;
}

export function ProfilePhotoCropper({
  visible,
  imageUri,
  onClose,
  onCrop,
}: ProfilePhotoCropperProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Reset values when modal opens
  React.useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      setLoading(false);
    }
  }, [visible]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleDone = async () => {
    if (!imageUri) return;
    setLoading(true);

    try {
      // Get image dimensions first using Image.getSize (standard RN way)
      const { width: imgW, height: imgH } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const { Image } = require("react-native");
        Image.getSize(imageUri, (w: number, h: number) => resolve({ width: w, height: h }), reject);
      });

      // Calculate center crop based on the smaller dimension
      const size = Math.min(imgW, imgH);
      const originX = (imgW - size) / 2;
      const originY = (imgH - size) / 2;

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width: size, height: size } },
          { resize: { width: 1000, height: 1000 } }, // High quality output
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      onCrop(result.uri);
    } catch (e) {
      console.error("[Cropper] Failed to crop", e);
    } finally {
      setLoading(false);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.overlay}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.background + "DD" }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>Crop Photo</Text>
            <TouchableOpacity onPress={handleDone} style={styles.headerBtn} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Viewport */}
          <View style={styles.viewport}>
            <GestureDetector gesture={composed}>
              <Animated.Image
                source={{ uri: imageUri }}
                style={[styles.image, imageStyle]}
                resizeMode="contain"
              />
            </GestureDetector>
            
            {/* Crop Mask */}
            <View style={styles.maskContainer} pointerEvents="none">
              <View style={[styles.mask, { borderColor: colors.primary }]} />
              <View style={styles.circularMask} />
            </View>
          </View>

          {/* Instructions */}
          <View style={[styles.footer, { backgroundColor: colors.background + "DD" }]}>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Pinch to zoom · Drag to position
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerBtn: {
    padding: 8,
    minWidth: 50,
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  doneText: {
    fontSize: 17,
    fontWeight: "600",
  },
  viewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.5,
  },
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  mask: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 2,
  },
  circularMask: {
    position: "absolute",
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  footer: {
    paddingBottom: 40,
    paddingTop: 20,
    alignItems: "center",
  },
  hint: {
    fontSize: 14,
  },
});
