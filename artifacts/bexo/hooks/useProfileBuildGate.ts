import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildStatusLabel,
  hasTriggeredInitialBuild,
  markInitialBuildTriggered,
  resolveBuildGatePhase,
  type BuildGatePhase,
} from "@/lib/profileBuildOrchestrator";
import { success as hapticSuccess } from "@/lib/haptics";
import { usePortfolioStore } from "@/stores/usePortfolioStore";
import { useProfileStore } from "@/stores/useProfileStore";

const DEBOUNCE_MS = 2000;

export function useProfileBuildGate(options?: { autoTrigger?: boolean }) {
  const autoTrigger = options?.autoTrigger ?? true;
  const profile = useProfileStore((s) => s.profile);
  const education = useProfileStore((s) => s.education);
  const experiences = useProfileStore((s) => s.experiences);
  const projects = useProfileStore((s) => s.projects);
  const skills = useProfileStore((s) => s.skills);
  const getCompletionResult = useProfileStore((s) => s.getCompletionResult);

  const buildStatus = usePortfolioStore((s) => s.buildStatus);
  const portfolioUrl = usePortfolioStore((s) => s.portfolioUrl);
  const currentBuild = usePortfolioStore((s) => s.currentBuild);
  const triggerBuild = usePortfolioStore((s) => s.triggerBuild);
  const fetchBuildStatus = usePortfolioStore((s) => s.fetchBuildStatus);

  const completion = getCompletionResult();
  const phase = resolveBuildGatePhase(completion, buildStatus, portfolioUrl);
  const statusLabel = buildStatusLabel(phase, currentBuild?.build_log);

  const [triggering, setTriggering] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPassingRef = useRef(completion.isPassing);

  const tryAutoBuild = useCallback(async () => {
    if (!autoTrigger || !profile?.id || !completion.isPassing) return;
    if (buildStatus === "queued" || buildStatus === "building" || buildStatus === "done") return;

    const already = await hasTriggeredInitialBuild(profile.id);
    if (already && buildStatus !== "failed") return;

    setTriggering(true);
    try {
      await triggerBuild(profile.id);
      await markInitialBuildTriggered(profile.id);
    } finally {
      setTriggering(false);
    }
  }, [autoTrigger, profile?.id, completion.isPassing, buildStatus, triggerBuild]);

  useEffect(() => {
    if (!profile?.id) return;
    fetchBuildStatus(profile.id);
  }, [profile?.id, fetchBuildStatus]);

  useEffect(() => {
    if (!completion.isPassing) {
      prevPassingRef.current = false;
      return;
    }

    const justCrossed = !prevPassingRef.current && completion.isPassing;
    prevPassingRef.current = true;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (justCrossed || buildStatus === "failed") {
        void tryAutoBuild();
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    completion.isPassing,
    completion.score,
    education.length,
    experiences.length,
    projects.length,
    skills.length,
    profile?.id,
    tryAutoBuild,
    buildStatus,
  ]);

  useEffect(() => {
    if (phase === "ready") void hapticSuccess();
  }, [phase]);

  const manualTrigger = useCallback(async () => {
    if (!profile?.id || !completion.isPassing) return false;
    setTriggering(true);
    try {
      await triggerBuild(profile.id);
      await markInitialBuildTriggered(profile.id);
      return true;
    } finally {
      setTriggering(false);
    }
  }, [profile?.id, completion.isPassing, triggerBuild]);

  return {
    completion,
    phase: phase as BuildGatePhase,
    statusLabel,
    triggering,
    tryAutoBuild,
    manualTrigger,
    canBuild: completion.isPassing,
  };
}
