import React from "react";
import { StyleSheet, View } from "react-native";

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { useProfileStore } from "@/stores/useProfileStore";

const STEP_ORDER = [
  "email",
  "photo",
  "handle",
  "dob",
  "resume",
  "manual_review",
  "manual",
  "cards",
  "about",
  "theme",
  "font",
  "preference",
  "generating",
] as const;

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  stepKey?: (typeof STEP_ORDER)[number];
  footer?: React.ReactNode;
}

export function OnboardingShell({
  title,
  subtitle,
  children,
  showBack = true,
  onBack,
  stepKey,
  footer,
}: Props) {
  const onboardingStep = useProfileStore((s) => s.onboardingStep);
  const getCompletionResult = useProfileStore((s) => s.getCompletionResult);
  const completion = getCompletionResult();

  const current = stepKey ?? onboardingStep;
  const idx = STEP_ORDER.indexOf(current as (typeof STEP_ORDER)[number]);
  const stepLabel =
    idx >= 0 ? `Step ${idx + 1} of ${STEP_ORDER.length - 1}` : undefined;

  return (
    <ScreenShell>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        onBack={onBack}
        stepLabel={stepLabel}
        completionScore={completion.score}
      />
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: 20 },
  footer: { marginTop: 24, gap: 12 },
});
