import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BexoButton } from "@/components/ui/BexoButton";
import { useColors } from "@/hooks/useColors";
import type { ParsedResume } from "@/services/resumeParser";

export interface ModalProps {
  visible: boolean;
  data: ParsedResume | null;
  onClose: () => void;
  onReplace: () => void | Promise<void>;
  onMerge: () => void | Promise<void>;
  title?: string;
  showMerge?: boolean;
  loading?: boolean;
  lowStructureWarning?: boolean;
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  const colors = useColors();
  if (value == null || String(value).trim() === "") return null;
  return (
    <View style={S.fieldRow}>
      <Text style={[S.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[S.fieldValue, { color: colors.foreground }]}>{String(value).trim()}</Text>
    </View>
  );
}

/** Scrollable body — reuse inside RebuildModal or other screens */
export function ParsedResumeReviewContent({
  data,
  lowStructureWarning,
}: {
  data: ParsedResume;
  lowStructureWarning?: boolean;
}) {
  const colors = useColors();
  return (
    <>
      {lowStructureWarning && (
        <View style={[S.banner, { backgroundColor: "#FAD06A22", borderColor: "#FAD06A55" }]}>
          <Feather name="info" size={18} color="#C9A227" />
          <Text style={[S.bannerText, { color: colors.foreground }]}>
            No education, jobs, projects, or skills were detected. You can still apply profile text fields or edit manually.
          </Text>
        </View>
      )}

      <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[S.sectionTitle, { color: colors.foreground }]}>Profile</Text>
        <FieldRow label="Name" value={data.full_name} />
        <FieldRow label="Headline" value={data.headline} />
        <FieldRow label="Bio" value={data.bio} />
        <FieldRow label="Email" value={data.email} />
        <FieldRow label="Phone" value={data.phone} />
        <FieldRow label="Location" value={data.location} />
        <FieldRow label="Website" value={data.website} />
        <FieldRow label="GitHub" value={data.github_url} />
        <FieldRow label="LinkedIn" value={data.linkedin_url} />
      </View>

      {(data.education?.length ?? 0) > 0 && (
        <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>
            Education ({data.education!.length})
          </Text>
          {data.education!.map((e, i) => (
            <View key={`edu-${i}`} style={[S.itemBlock, { borderBottomColor: colors.border }]}>
              <Text style={[S.itemTitle, { color: colors.foreground }]}>
                {e.institution} · {e.degree}
              </Text>
              <Text style={[S.itemMeta, { color: colors.mutedForeground }]}>
                {e.field} · {e.start_year}
                {e.end_year != null ? `–${e.end_year}` : ""}
                {e.gpa ? ` · GPA ${e.gpa}` : ""}
              </Text>
              {e.description ? (
                <Text style={[S.itemBody, { color: colors.mutedForeground }]}>{e.description}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {(data.experiences?.length ?? 0) > 0 && (
        <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>
            Experience ({data.experiences!.length})
          </Text>
          {data.experiences!.map((x, i) => (
            <View key={`exp-${i}`} style={[S.itemBlock, { borderBottomColor: colors.border }]}>
              <Text style={[S.itemTitle, { color: colors.foreground }]}>
                {x.role} @ {x.company}
              </Text>
              <Text style={[S.itemMeta, { color: colors.mutedForeground }]}>
                {x.start_date}
                {x.end_date ? ` – ${x.end_date}` : x.is_current ? " – Present" : ""}
              </Text>
              <Text style={[S.itemBody, { color: colors.mutedForeground }]} numberOfLines={8}>
                {x.description}
              </Text>
            </View>
          ))}
        </View>
      )}

      {(data.projects?.length ?? 0) > 0 && (
        <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>
            Projects ({data.projects!.length})
          </Text>
          {data.projects!.map((p, i) => (
            <View key={`pr-${i}`} style={[S.itemBlock, { borderBottomColor: colors.border }]}>
              <Text style={[S.itemTitle, { color: colors.foreground }]}>{p.title}</Text>
              <Text style={[S.itemBody, { color: colors.mutedForeground }]} numberOfLines={6}>
                {p.description}
              </Text>
              {(p.tech_stack?.length ?? 0) > 0 && (
                <Text style={[S.itemMeta, { color: colors.primary }]}>
                  {p.tech_stack!.join(" · ")}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {(data.skills?.length ?? 0) > 0 && (
        <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[S.sectionTitle, { color: colors.foreground }]}>
            Skills ({data.skills!.length})
          </Text>
          <View style={S.skillWrap}>
            {data.skills!.map((sk, i) => (
              <View
                key={`sk-${i}`}
                style={[S.skillChip, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}
              >
                <Text style={[S.skillText, { color: colors.foreground }]}>
                  {sk.name}
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                    {" "}
                    · {sk.level}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

export function ParsedResumeReviewModal({
  visible,
  data,
  onClose,
  onReplace,
  onMerge,
  title = "Review extracted data",
  showMerge = true,
  loading = false,
  lowStructureWarning = false,
}: ModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!data) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[S.wrap, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={[S.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12} style={S.headerBtn}>
            <Text style={[S.cancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
          <Text style={[S.title, { color: colors.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={S.scroll}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: 20,
            gap: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <ParsedResumeReviewContent data={data} lowStructureWarning={lowStructureWarning} />
        </ScrollView>

        <View
          style={[
            S.footer,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <BexoButton
                label="Replace all with this data"
                onPress={() => void onReplace()}
                variant="danger"
                icon={<Feather name="trash-2" size={14} color="#fff" />}
              />
              {showMerge && (
                <BexoButton
                  label="Add to existing (merge)"
                  onPress={() => void onMerge()}
                  variant="secondary"
                  icon={<Feather name="git-merge" size={14} color={colors.primary} />}
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 60 },
  cancel: { fontSize: 16 },
  title: { fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  scroll: { flex: 1 },
  banner: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  fieldRow: { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldValue: { fontSize: 14, lineHeight: 20 },
  itemBlock: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTitle: { fontSize: 14, fontWeight: "700" },
  itemMeta: { fontSize: 12, marginTop: 4 },
  itemBody: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  skillText: { fontSize: 13, fontWeight: "600" },
  footer: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({ ios: { shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 4 } }),
  },
});
