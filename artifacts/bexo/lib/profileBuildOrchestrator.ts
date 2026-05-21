import AsyncStorage from "@react-native-async-storage/async-storage";

import { COMPLETENESS_PASS_SCORE } from "@/lib/profileCompleteness";
import type { CompletionResult } from "@/stores/useProfileStore";
import type { BuildStatus } from "@/stores/usePortfolioStore";

const BUILD_TRIGGERED_KEY = "bexo_initial_build_triggered";

export type BuildGatePhase =
  | "idle"
  | "blocked_incomplete"
  | "queued"
  | "building"
  | "ready"
  | "failed";

export function resolveBuildGatePhase(
  completion: CompletionResult,
  buildStatus: BuildStatus,
  portfolioUrl: string | null,
): BuildGatePhase {
  if (!completion.isPassing) return "blocked_incomplete";
  if (buildStatus === "done" && portfolioUrl) return "ready";
  if (buildStatus === "failed") return "failed";
  if (buildStatus === "building") return "building";
  if (buildStatus === "queued") return "queued";
  return "idle";
}

export function buildStatusLabel(
  phase: BuildGatePhase,
  buildLog?: string | null,
): string {
  switch (phase) {
    case "blocked_incomplete":
      return `Complete ${COMPLETENESS_PASS_SCORE}% of your profile to publish`;
    case "queued":
      return "Your site is queued…";
    case "building":
      return buildLog?.trim() || "Building your portfolio…";
    case "ready":
      return "Your portfolio is live";
    case "failed":
      return buildLog?.trim() || "Build failed. Tap to try again.";
    default:
      return "Ready to build your site";
  }
}

export async function hasTriggeredInitialBuild(profileId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(`${BUILD_TRIGGERED_KEY}:${profileId}`);
  return raw === "1";
}

export async function markInitialBuildTriggered(profileId: string): Promise<void> {
  await AsyncStorage.setItem(`${BUILD_TRIGGERED_KEY}:${profileId}`, "1");
}

export async function clearInitialBuildTriggered(profileId: string): Promise<void> {
  await AsyncStorage.removeItem(`${BUILD_TRIGGERED_KEY}:${profileId}`);
}

export function needsResumeDocument(
  resumeUrl: string | null | undefined,
  educationCount: number,
  experienceCount: number,
): boolean {
  return !resumeUrl?.trim() && educationCount === 0 && experienceCount === 0;
}
