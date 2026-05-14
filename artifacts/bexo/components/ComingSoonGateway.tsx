import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  TextInput, 
  Platform, 
  ActivityIndicator, 
  Keyboard,
  Image,
  Linking
} from "react-native";
import { usePathname, Link } from "expo-router";
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  withSpring,
  useSharedValue, 
  FadeInDown,
  FadeIn,
  FadeOutUp,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

const { width, height } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// --- Ambient Background Orbs ---
const AmbientOrb = ({ color, size, startX, startY }: any) => {
  const y = useSharedValue(startY);
  const x = useSharedValue(startX);
  const mouseX = useSharedValue(0);
  const mouseY = useSharedValue(0);

  useEffect(() => {
    const duration = 20000 + Math.random() * 10000;
    y.value = withRepeat(withSequence(withTiming(startY - 50, { duration }), withTiming(startY + 50, { duration })), -1, true);
    x.value = withRepeat(withSequence(withTiming(startX + 50, { duration: duration * 1.2 }), withTiming(startX - 150, { duration: duration * 1.2 })), -1, true);

    if (isWeb) {
      const handleMove = (e: MouseEvent) => {
        mouseX.value = withTiming((e.clientX - width / 2) * 0.05, { duration: 500 });
        mouseY.value = withTiming((e.clientY - height / 2) * 0.05, { duration: 500 });
      };
      window.addEventListener('mousemove', handleMove);
      return () => window.removeEventListener('mousemove', handleMove);
    }
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value + mouseY.value }, 
      { translateX: x.value + mouseX.value },
      { scale: withSpring(1) }
    ],
  }));

  return (
    <Animated.View style={[
      { position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.1 },
      isWeb ? { filter: "blur(100px)" } : {}, style
    ]} />
  );
};

// --- Staggered Text Component ---
const StaggeredText = ({ text, style, delay = 0 }: any) => {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {text.split("").map((char: string, i: number) => (
        <Animated.Text 
          key={i} 
          entering={FadeInDown.delay(delay + (i * 30)).springify()} 
          style={style}
        >
          {char === " " ? "\u00A0" : char}
        </Animated.Text>
      ))}
    </View>
  );
};

// --- Custom Animated Toast ---
const AnimatedToast = ({ visible, message }: { visible: boolean; message: string }) => {
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(40, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(-150, { duration: 400 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[S.toastContainer, style]}>
      <LinearGradient colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.05)"]} style={StyleSheet.absoluteFill} />
      <View style={S.toastIconWrapper}>
        <CheckIcon color="#fff" />
      </View>
      <Text style={S.toastText}>{message}</Text>
    </Animated.View>
  );
};

const CheckIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const SocialIcon = ({ type, color }: { type: string, color: string }) => {
  const props = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.5", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (type === "twitter") return (
    <svg {...props}><path d="M22 4s-1 2.1-3 2.8c1.6 1 5.1 3.5 3 14.2-12.2-12-1.2 5.4-18-12.2 5-1.1 1.5-4.5 1-4.5s-4 1-5 2c3 1 3 4 3 4s-4 9-11 3c0 0 12 11 21-1.1 0 0 1-2.1 1-2.1z"></path></svg>
  );
  if (type === "instagram") return (
    <svg {...props}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
  );
  return (
    <svg {...props}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
  );
};

export const ComingSoonGateway = ({ children }: { children: React.ReactNode }) => {
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  
  const focusValue = useSharedValue(0);
  const shineX = useSharedValue(-1);

  // GSAP Refs
  const planeTimeline = useRef<any>(null);

  useEffect(() => {
    if (isWeb) {
      gsap.registerPlugin(MotionPathPlugin);
      
      // Initialize states
      gsap.set("#paperPlaneRoute", { attr: { "stroke-dasharray": "0, 999999", "stroke-dashoffset": 0 } });
      gsap.set("#rectSentItems", { x: -240 });
      
      const t = gsap.timeline({ paused: true });
      planeTimeline.current = t;

      t.to("#baseButton", { duration: 0.2, scale: 1, transformOrigin: "50% 50%" });
      t.to("#txtSend", { duration: 0.4, opacity: 0, scale: 0.5 }, "start");
      t.to("#btnBase", { duration: 0.6, attr: { rx: 50, width: 100, x: 650 }, ease: "power2.inOut" }, "start");
      
      t.to("#paperPlane", {
        duration: 1.2,
        ease: "power2.inOut",
        motionPath: {
          path: "#paperPlaneRoute",
          align: "#paperPlaneRoute",
          alignOrigin: [0.5, 0.5],
          autoRotate: 90
        }
      }, "start");

      t.to("#paperPlanePath", { duration: 0.2, fill: "#ffffff" }, "start");
      t.to("#btnBase", { duration: 0.4, attr: { width: 480, x: 460, rx: 23 }, fill: "#ffffff", ease: "power2.out" }, "revealStart");
      t.to("#rectSentItems", { x: 0, duration: 0.5 }, "revealStart");
      t.to("#mask1", { x: -260, duration: 0.5, ease: "power1.inOut" }, "revealStart");
    }

    shineX.value = withRepeat(withSequence(withTiming(2, { duration: 4000 }), withTiming(-1, { duration: 0 })), -1);
  }, [colors.primary, isWeb]);

  const triggerToast = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const handleSignup = async () => {
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    Keyboard.dismiss();
    try {
      const { error } = await supabase.from("waitlist").insert([{ email, source: "web_coming_soon" }]);
      if (error && error.code !== "23505") throw error;
      
      setSubscribed(true);
      if (isWeb && planeTimeline.current) {
        planeTimeline.current.play();
      }
      setEmail("");
      triggerToast();
    } catch (err: any) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const borderAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focusValue.value, [0, 1], ["rgba(255,255,255,0.08)", colors.primary]),
    transform: [{ scale: withSpring(focusValue.value ? 1.02 : 1) }]
  }));

  const shineStyle = useAnimatedStyle(() => ({
    left: `${shineX.value * 100}%`,
  }));

  const pathname = usePathname();
  const isLegalPage = pathname === "/terms" || pathname === "/privacy";

  if (!isWeb || isLegalPage) return <>{children}</>;

  return (
    <View style={S.container}>
      {/* Dynamic Background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={["#020203", "#08080A", "#000000"]} style={StyleSheet.absoluteFill} />
        <AmbientOrb color={colors.primary} size={width < 600 ? 300 : 600} startX={-100} startY={-100} />
        <AmbientOrb color="#4A00E0" size={width < 600 ? 350 : 700} startX={width - 200} startY={height - 200} />
        <AmbientOrb color="#6AFAD0" size={width < 600 ? 250 : 500} startX={width / 2 - 150} startY={height / 2 - 150} />
      </View>

      <AnimatedToast visible={toastVisible} message="You're on the list. Keep an eye on your inbox." />

      <Animated.View entering={FadeInDown.duration(1200).springify()} style={S.glassCard}>
        {isWeb && <View style={[StyleSheet.absoluteFill, { backdropFilter: "blur(40px)" } as any]} />}
        <LinearGradient colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.01)"]} style={[StyleSheet.absoluteFill, { borderRadius: 32 }]} />
        
        <Animated.View style={[S.borderShine, shineStyle]}>
          <LinearGradient colors={["transparent", "rgba(255,255,255,0.12)", "transparent"]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <View style={S.contentInner}>
          <View style={S.header}>
            <Animated.View entering={FadeIn.delay(400)} style={[S.logoBadge, { shadowColor: colors.primary }]}>
              <Image source={require("@/assets/images/icon.png")} style={S.logoImage} resizeMode="contain" />
            </Animated.View>
            <Animated.Text entering={FadeIn.delay(600)} style={S.brandName}>B E X O</Animated.Text>
          </View>

          <View style={S.textSection}>
            <StaggeredText text="The Future of" style={S.title} delay={800} />
            <StaggeredText text="Digital Identity." style={[S.title, { color: colors.primary }]} delay={1200} />
            <Animated.Text entering={FadeIn.delay(2000)} style={S.subtitle}>
              An AI-driven engine architected for premium portfolios. Claim your early access before the public rollout.
            </Animated.Text>
          </View>

          <View style={S.ctaSection}>
            <Animated.View style={[S.inputWrapper, borderAnimatedStyle, subscribed && { opacity: 0, height: 0 }]}>
              <TextInput
                placeholder="Enter your email address"
                placeholderTextColor="rgba(255,255,255,0.2)"
                style={S.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => { focusValue.value = withTiming(1, { duration: 300 }); }}
                onBlur={() => { focusValue.value = withTiming(0, { duration: 300 }); }}
                onSubmitEditing={handleSignup}
              />
              <TouchableOpacity style={S.button} onPress={handleSignup} disabled={loading}>
                <LinearGradient colors={[colors.primary, "#0055FF"]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={StyleSheet.absoluteFill} />
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={S.buttonText}>Join Waitlist</Text>}
              </TouchableOpacity>
            </Animated.View>

            {/* GSAP Animated SVG Button Area */}
            {isWeb && (
              <View style={[S.svgButtonContainer, !subscribed && { display: 'none' }]}>
                <svg viewBox="0 0 1400 300" fill="none" style={{ width: '100%', height: 120 }}>
                  <path id="paperPlaneRoute" d="M563.558,150 C638.854,50 787.84,10 916.53,100 1041.712,180 858.791,280 743.926,260 642.241,250 699.637,200 700,150" stroke="transparent" />
                  <g id="rectSent" clipPath="url(#clipPath)">
                    <g id="rectSentItems">
                      <rect id="sentBase" x="460" y="78.5" width="480" height="143" rx="23" fill="white"/>
                      <text id="txtSent" fill={colors.primary} style={{ whiteSpace: 'pre', fontFamily: 'Roboto', fontSize: 82, fontWeight: 'bold' }}><tspan x="637" y="178">Joined!</tspan></text>
                    </g>
                  </g>
                  <g id="baseButton">
                    <rect id="btnBase" x="418" y="70.5" width="563" height="158" rx="27" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
                    <text id="txtSend" fill="#fff" style={{ whiteSpace: 'pre', fontFamily: 'Roboto', fontSize: 82, fontWeight: 'bold' }}><tspan x="679" y="178">Send</tspan></text>
                    <g id="paperPlane" transform="matrix(0.8,0.5,-0.5,0.8,377,-222)">
                      <path id="paperPlanePath" d="M560.6 481.3C562 479.2 565.1 479.2 566.5 481.3L607 543.1C615.6 556.2 607.5 573.3 592.7 575.6L566.4 557.4V510C566.4 508.4 565.1 507.1 563.5 507.1C561.9 507.1 560.6 508.4 560.6 510V557.4L534.3 575.6C519.6 573.3 511.4 556.2 520 543.1L560.6 481.3Z" fill={colors.primary}/>
                    </g>
                  </g>
                  <defs>
                    <clipPath id="clipPath"><rect id="mask1" x="700" y="60" width="520" height="180" fill="white" /></clipPath>
                  </defs>
                </svg>
              </View>
            )}
          </View>

          <View style={S.footer}>
            <View style={S.socials}>
              {["twitter", "instagram", "linkedin"].map((icon, idx) => (
                <Animated.View key={icon} entering={FadeIn.delay(2500 + (idx * 200))}>
                  <TouchableOpacity style={[S.socialBtn, { cursor: 'pointer' } as any]}>
                    <SocialIcon type={icon} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
            <Animated.Text entering={FadeIn.delay(3200)} style={S.versionText}>BEXO OS / WEB CORE • v1.0.0-BETA</Animated.Text>
            
            <Animated.View entering={FadeIn.delay(3400)} style={S.legalLinks}>
              <Link href="/terms" asChild>
                <TouchableOpacity><Text style={S.legalLink}>Terms of Service</Text></TouchableOpacity>
              </Link>
              <View style={S.legalDot} />
              <Link href="/privacy" asChild>
                <TouchableOpacity><Text style={S.legalLink}>Privacy Policy</Text></TouchableOpacity>
              </Link>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const S = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000", 
    alignItems: "center", 
    justifyContent: "center", 
    padding: width < 600 ? 12 : 20 
  },
  glassCard: { 
    width: "100%", 
    maxWidth: 760, 
    borderRadius: width < 600 ? 24 : 32, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.08)", 
    overflow: "hidden", 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 40 }, 
    shadowOpacity: 0.6, 
    shadowRadius: 80 
  },
  borderShine: { 
    position: 'absolute', 
    top: 0, 
    bottom: 0, 
    width: 200, 
    opacity: 0.5, 
    zIndex: 1 
  },
  contentInner: { 
    padding: width < 600 ? 24 : 60, 
    alignItems: "center", 
    zIndex: 2 
  },
  header: { 
    alignItems: "center", 
    marginBottom: width < 600 ? 24 : 40 
  },
  logoBadge: { 
    width: width < 600 ? 56 : 68, 
    height: width < 600 ? 56 : 68, 
    borderRadius: width < 600 ? 18 : 22, 
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: 16, 
    overflow: 'hidden', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.7, 
    shadowRadius: 20 
  },
  logoImage: { 
    width: "100%", 
    height: "100%" 
  },
  brandName: { 
    fontSize: 12, 
    fontWeight: "800", 
    color: "#fff", 
    letterSpacing: 8, 
    opacity: 0.7, 
    paddingLeft: 8 
  },
  textSection: { 
    alignItems: "center", 
    marginBottom: width < 600 ? 32 : 50, 
    width: "100%" 
  },
  title: { 
    fontSize: width < 600 ? 36 : 58, 
    fontWeight: "900", 
    color: "#fff", 
    textAlign: "center", 
    lineHeight: width < 600 ? 44 : 68, 
    letterSpacing: -1.5 
  },
  subtitle: { 
    fontSize: width < 600 ? 15 : 18, 
    color: "rgba(255,255,255,0.4)", 
    textAlign: "center", 
    lineHeight: width < 600 ? 22 : 28, 
    maxWidth: 500, 
    fontWeight: "400", 
    marginTop: 16 
  },
  ctaSection: { 
    width: "100%", 
    maxWidth: 520, 
    marginBottom: width < 600 ? 40 : 60, 
    minHeight: 64 
  },
  inputWrapper: { 
    flexDirection: "row", 
    height: width < 600 ? 64 : 76, 
    borderRadius: 38, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    borderWidth: 1.5, 
    padding: 6, 
    alignItems: "center" 
  },
  input: { 
    flex: 1, 
    paddingHorizontal: width < 600 ? 20 : 28, 
    color: "#fff", 
    fontSize: 15, 
    fontWeight: "500", 
    ...(isWeb ? { outlineStyle: 'none' } as any : {}) 
  },
  button: { 
    height: "100%", 
    borderRadius: 32, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: width < 600 ? 20 : 36, 
    overflow: 'hidden' 
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "800", 
    fontSize: width < 600 ? 14 : 15, 
    letterSpacing: 0.5 
  },
  svgButtonContainer: { 
    width: '100%', 
    alignItems: 'center', 
    marginTop: -10 
  },
  footer: { 
    alignItems: "center", 
    width: "100%", 
    borderTopWidth: 1, 
    borderTopColor: "rgba(255,255,255,0.06)", 
    paddingTop: width < 600 ? 32 : 40 
  },
  socials: { 
    flexDirection: "row", 
    gap: width < 600 ? 20 : 30, 
    marginBottom: 24 
  },
  socialBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: "rgba(255,255,255,0.03)", 
    justifyContent: "center", 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.06)" 
  },
  versionText: { 
    fontSize: 10, 
    color: "rgba(255,255,255,0.2)", 
    fontWeight: "700", 
    letterSpacing: 1.5, 
    textTransform: "uppercase",
    marginBottom: 12
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  legalLink: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  legalDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  toastContainer: { 
    position: 'absolute', 
    top: 0, 
    alignSelf: 'center', 
    zIndex: 9999, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0A0A0C', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.15)', 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 100, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 20 }, 
    shadowOpacity: 0.6, 
    shadowRadius: 30, 
    overflow: 'hidden' 
  },
  toastIconWrapper: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#6AFAD0', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  toastText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '700', 
    letterSpacing: 0.3 
  }
});