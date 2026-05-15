import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import QRCode from "react-native-qrcode-svg";

import type { CardTemplateId } from "@/constants/identityCard";

export const BexoLogo = ({
  color = "#fff",
  size = 16,
  style,
  accentX = "#00C2FF",
}: {
  color?: string;
  size?: number;
  style?: any;
  accentX?: string;
}) => (
  <View style={[styles.logoWrapper, style]}>
    <View style={[styles.logoContainer, { gap: size * 0.08 }]}>
      <Text style={[styles.logoText, { color, fontSize: size }]}>B</Text>
      <View style={[styles.logoEContainer, { marginHorizontal: size * 0.04 }]}>
        <View style={[styles.logoEBar, { backgroundColor: color, height: size * 0.12, width: size * 0.65 }]} />
        <View style={[styles.logoEBar, { backgroundColor: color, height: size * 0.12, width: size * 0.45, marginVertical: size * 0.12 }]} />
        <View style={[styles.logoEBar, { backgroundColor: color, height: size * 0.12, width: size * 0.65 }]} />
      </View>
      <View style={[styles.logoXWrapper, { marginHorizontal: size * 0.06 }]}>
        <Text style={[styles.logoXText, { color: accentX, fontSize: size * 1.2, transform: [{ translateY: -size * 0.05 }] }]}>X</Text>
      </View>
      <Text style={[styles.logoText, { color, fontSize: size }]}>O</Text>
    </View>
  </View>
);

interface IdentityCardProps {
  profile: any;
  stats: { views: number; projects: number };
  themeColor?: string;
  borderColor?: string;
  accent?: string;
  fontFamily?: string;
  templateId?: CardTemplateId;
  onViewCard?: () => void;
  forceSide?: "front" | "back";
  /** Removes vertical margin when embedding in share sheet */
  noOuterMargins?: boolean;
}

const TEMPLATE_DIMS: Record<
  CardTemplateId,
  {
    cardH: number;
    avatar: number;
    avatarRadius: number;
    nameSize: number;
    headlineSize: number;
    statNum: number;
    statLabel: number;
    pad: number;
    statGap: number;
    iconCircle: number;
  }
> = {
  standard: {
    cardH: 280,
    avatar: 124,
    avatarRadius: 28,
    nameSize: 28,
    headlineSize: 14,
    statNum: 22,
    statLabel: 9,
    pad: 24,
    statGap: 14,
    iconCircle: 34,
  },
  compact: {
    cardH: 240,
    avatar: 96,
    avatarRadius: 22,
    nameSize: 22,
    headlineSize: 13,
    statNum: 18,
    statLabel: 8,
    pad: 18,
    statGap: 12,
    iconCircle: 30,
  },
  bold: {
    cardH: 300,
    avatar: 132,
    avatarRadius: 32,
    nameSize: 32,
    headlineSize: 15,
    statNum: 26,
    statLabel: 10,
    pad: 24,
    statGap: 14,
    iconCircle: 42,
  },
};

export const IdentityCard = ({
  profile,
  stats,
  themeColor = "#063852",
  borderColor = "#105A7A",
  accent = "#3abef9",
  fontFamily,
  templateId = "standard",
  onViewCard,
  forceSide,
  noOuterMargins = false,
}: IdentityCardProps) => {
  const rotation = useSharedValue(forceSide === "back" ? 180 : 0);
  const [isFlipped, setIsFlipped] = useState(forceSide === "back");
  const dims = TEMPLATE_DIMS[templateId] ?? TEMPLATE_DIMS.standard;

  const handleFlip = () => {
    if (forceSide) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    rotation.value = withSpring(isFlipped ? 0 : 180, {
      damping: 14,
      stiffness: 100,
      mass: 0.6,
    });
    setIsFlipped(!isFlipped);
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const portfolioUrl = `${profile?.handle ?? "user"}.mybexo.com`;
  const [imgError, setImgError] = useState(false);

  // Reset error when URL changes
  React.useEffect(() => {
    if (profile?.avatar_url) {
      setImgError(false);
    }
  }, [profile?.avatar_url]);

  const showFallback = !profile?.avatar_url || imgError;

  const textStyle = fontFamily ? { fontFamily } : {};

  return (
    <View
      style={[
        styles.cardContainer,
        { height: dims.cardH },
        noOuterMargins && { marginTop: 0, marginBottom: 0 },
      ]}
    >
      {/* FRONT SIDE */}
      <Animated.View
        style={[
          styles.heroCard,
          frontAnimatedStyle,
          {
            backgroundColor: themeColor,
            borderColor,
            padding: dims.pad,
            borderRadius: 24,
          },
        ]}
      >
        <View
          style={[styles.glassHighlight, { backgroundColor: "rgba(255,255,255,0.03)" }]}
          pointerEvents="none"
        />

        <View style={styles.cardInner} pointerEvents="box-none">
          <Pressable
            onPress={handleFlip}
            disabled={!!forceSide}
            style={styles.flipMainPressable}
            accessibilityRole="button"
            accessibilityLabel="Flip card to back"
          >
            <View pointerEvents="none" style={styles.flipMainInner}>
              <View style={styles.cardMainRow}>
                <View
                  style={[
                    styles.cardAvatarWrap,
                    {
                      borderColor,
                      width: dims.avatar,
                      height: dims.avatar,
                      borderRadius: dims.avatarRadius,
                    },
                  ]}
                >
              {profile?.avatar_url ? (
                <Image
                  source={{
                    uri: `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}v=${profile.updated_at ? encodeURIComponent(profile.updated_at) : Date.now()}`
                  }}
                  style={[
                    styles.cardAvatarImg,
                    showFallback && { position: 'absolute', opacity: 0 } // Keep it mounted but hidden if error
                  ]}
                  contentFit="cover"
                  transition={200}
                  onLoad={() => setImgError(false)}
                  onError={() => setImgError(true)}
                />
              ) : null}

              {showFallback && (
                <LinearGradient
                  colors={[accent, borderColor, themeColor]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[styles.cardAvatarImg, { alignItems: "center", justifyContent: "center" }]}
                >
                  <Text
                    style={[
                      {
                        fontSize: dims.nameSize + 6,
                        fontWeight: "900",
                        color: "#fff",
                        textShadowColor: "rgba(0,0,0,0.45)",
                        textShadowOffset: { width: 0, height: 2 },
                        textShadowRadius: 6,
                      },
                      textStyle,
                    ]}
                  >
                    {profile?.full_name?.[0]?.toUpperCase() ?? "B"}
                  </Text>
                </LinearGradient>
              )}
                </View>

                <View style={[styles.cardInfoCol, { marginLeft: templateId === "compact" ? 16 : 22 }]}>
              <View style={{ flex: 1, justifyContent: "center" }}>
                <Text
                  style={[styles.cardName, textStyle, { fontSize: dims.nameSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {(profile?.full_name ?? "User Name")}
                </Text>
                <Text
                  style={[
                    styles.cardHeadline,
                    textStyle,
                    { fontSize: dims.headlineSize, marginBottom: templateId === "bold" ? 12 : 10 },
                  ]}
                  numberOfLines={2}
                >
                  {profile?.headline ?? "Professional Role"}
                </Text>
              </View>

              <View style={[styles.cardStatsRow, { gap: dims.statGap }]}>
                <View style={[styles.cardStatBox, { borderColor: "rgba(255,255,255,0.1)" }]}>
                  <View
                    style={[
                      styles.statIconCircle,
                      {
                        width: dims.iconCircle,
                        height: dims.iconCircle,
                        borderRadius: dims.iconCircle / 2,
                      },
                    ]}
                  >
                    <Feather name="eye" size={templateId === "compact" ? 14 : 16} color="#fff" />
                  </View>
                  <View style={styles.statVerticalDivider} />
                  <View style={styles.statTextCol}>
                    <Text
                      style={[styles.cardStatNum, textStyle, { fontSize: dims.statNum }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {stats.views}
                    </Text>
                    <Text
                      style={[styles.cardStatLabel, textStyle, { fontSize: dims.statLabel }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      VIEWS
                    </Text>
                  </View>
                </View>
                <View style={[styles.cardStatBox, { borderColor: "rgba(255,255,255,0.1)" }]}>
                  <View
                    style={[
                      styles.statIconCircle,
                      {
                        width: dims.iconCircle,
                        height: dims.iconCircle,
                        borderRadius: dims.iconCircle / 2,
                      },
                    ]}
                  >
                    <Feather name="briefcase" size={templateId === "compact" ? 14 : 16} color="#fff" />
                  </View>
                  <View style={styles.statVerticalDivider} />
                  <View style={styles.statTextCol}>
                    <Text
                      style={[styles.cardStatNum, textStyle, { fontSize: dims.statNum }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {stats.projects}
                    </Text>
                    <Text
                      style={[styles.cardStatLabel, textStyle, { fontSize: dims.statLabel }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      PROJECTS
                    </Text>
                  </View>
                </View>
                </View>
              </View>
            </View>
            </View>
          </Pressable>

          <View style={[styles.divider, { marginVertical: templateId === "compact" ? 8 : 10 }]} />

          <View style={styles.cardFooter} pointerEvents="box-none">
            <View pointerEvents="none">
              <BexoLogo size={templateId === "compact" ? 20 : 24} accentX={accent} />
            </View>

            {onViewCard ? (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onViewCard();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [styles.viewCardPressable, pressed && { opacity: 0.92 }]}
                accessibilityRole="button"
                accessibilityLabel="Customize digital card"
              >
                <View collapsable={false}>
                  <LinearGradient
                    colors={[accent, borderColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.viewCardBtnGradient}
                    pointerEvents="none"
                  >
                    <Text style={[styles.viewCardBtnText, textStyle]}>View Card</Text>
                    <Feather name="chevron-right" size={14} color="#fff" />
                  </LinearGradient>
                </View>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Animated.View>

      {/* BACK SIDE */}
      <Animated.View
        style={[
          styles.heroCard,
          styles.cardBack,
          backAnimatedStyle,
          {
            backgroundColor: themeColor,
            borderColor,
            padding: dims.pad,
            borderRadius: 24,
          },
        ]}
      >
        <Pressable
          onPress={handleFlip}
          disabled={!!forceSide}
          style={[styles.flipArea, { bottom: 52 }]}
          accessibilityRole="button"
          accessibilityLabel="Flip card to front"
        />

        <View style={styles.backCardColumn} pointerEvents="box-none">
          <View
            style={[
              styles.backMainBlock,
              { flex: 1, justifyContent: 'center', gap: templateId === "compact" ? 10 : 16 },
            ]}
            pointerEvents="none"
          >
            <View style={styles.qrWrapper}>
              <View style={[styles.qrContainer, { borderColor: accent + "33" }]}>
                <QRCode
                  value={`https://${portfolioUrl}`}
                  size={templateId === "compact" ? 72 : 88}
                  color={accent}
                  backgroundColor="transparent"
                />
              </View>
            </View>

            <View style={[styles.backMetaColumn, { marginTop: templateId === "compact" ? 0 : 4 }]}>
              <Text
                style={[
                  styles.cardType,
                  textStyle,
                  {
                    color: accent,
                    opacity: 0.7,
                    fontSize: 10,
                    letterSpacing: 1.5,
                    marginBottom: 6,
                    textAlign: "center",
                    fontWeight: '800'
                  },
                ]}
              >
                DIGITAL IDENTITY
              </Text>

              <View
                style={[
                  styles.backUrlPill,
                  { borderColor: accent + "44", backgroundColor: "rgba(255,255,255,0.04)" },
                ]}
              >
                <View style={[styles.backUrlIconSlot, { borderColor: accent + "22", backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                  <Feather name="globe" size={15} color="#fff" />
                </View>
                <View style={[styles.backUrlDivider, { backgroundColor: accent + "33" }]} />
                <Text
                  style={[
                    styles.backUrlText,
                    textStyle,
                    { fontSize: templateId === "compact" ? 12 : 14, color: "#fff" },
                  ]}
                  numberOfLines={1}
                >
                  {portfolioUrl.toLowerCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.backBrandBar, { marginTop: 4 }]} pointerEvents="none">
            <BexoLogo size={templateId === "compact" ? 22 : 26} accentX={accent} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  flipArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  cardContainer: {
    width: "100%",
    marginTop: 10,
    marginBottom: 20,
  },
  heroCard: {
    width: "100%",
    height: "100%",
    borderWidth: 1.5,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  cardBack: {},
  glassHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cardInner: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    zIndex: 2,
  },
  flipMainPressable: {
    flex: 1,
    minHeight: 0,
  },
  flipMainInner: {
    flex: 1,
    minHeight: 0,
  },
  cardType: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardAvatarWrap: {
    borderWidth: 1.5,
    overflow: "hidden",
    backgroundColor: "#042233",
  },
  cardAvatarImg: {
    width: "100%",
    height: "100%",
  },
  cardInfoCol: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  cardName: {
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
  },
  cardHeadline: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
    lineHeight: 18,
    fontWeight: "500",
  },
  cardStatsRow: {
    flexDirection: "row",
  },
  cardStatBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
  },
  statIconCircle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  statVerticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 6,
    flexShrink: 0,
  },
  statTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  cardStatNum: {
    fontWeight: "800",
    color: "#fff",
    lineHeight: 24,
  },
  cardStatLabel: {
    color: "rgba(255,255,255,0.42)",
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    width: "100%",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
    elevation: 8,
  },
  viewCardPressable: {
    borderRadius: 12,
  },
  viewCardBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  viewCardBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  backCenterContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  backCardColumn: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    justifyContent: "space-between",
    zIndex: 1,
  },
  backMainBlock: {
    flexShrink: 1,
    flexGrow: 1,
    minHeight: 0,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  backMetaColumn: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "stretch",
  },
  backUrlPill: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    overflow: "hidden",
  },
  backUrlIconSlot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    marginLeft: 4,
    flexShrink: 0,
  },
  backUrlDivider: {
    width: 1,
    height: 22,
    marginHorizontal: 10,
    flexShrink: 0,
  },
  backBrandBar: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 4,
    flexShrink: 0,
    zIndex: 2,
  },
  qrWrapper: {
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  qrContainer: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    borderWidth: 1,
  },
  backUrlText: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logoText: {
    fontWeight: "900",
    letterSpacing: -1,
  },
  logoEContainer: {
    justifyContent: "center",
    alignItems: "flex-start",
  },
  logoEBar: {
    borderRadius: 2,
  },
  logoXWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoXText: {
    fontWeight: "900",
  },
});
