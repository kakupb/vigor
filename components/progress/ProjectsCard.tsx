// components/progress/ProjectsCard.tsx
// Zeigt alle Projekte mit akkumulierten Fokusstunden + Zielfortschritt.
// "Abschlussarbeit: 12h — 15% von 80h Ziel"
//
// Das ist der Kernwert des Projekt-Trackings:
// Fokuszeit wird zu messbarem Fortschritt auf ein echtes Ziel.

import { useAppColors } from "@/hooks/useAppColors";
import { useFocusStore } from "@/store/focusStore";
import { useProjectStore } from "@/store/projectStore";
import { Project } from "@/types/project";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

// ─── Fortschritts-Daten pro Projekt ──────────────────────────────────────────
type ProjectStats = {
  project: Project;
  totalMinutes: number;
  weekMinutes: number;
  sessionCount: number;
  lastSessionAt: number | null;
};

// ─── Einzelne Projekt-Zeile ───────────────────────────────────────────────────
function ProjectRow({ stats, dark }: { stats: ProjectStats; dark: boolean }) {
  const { project, totalMinutes, weekMinutes, sessionCount } = stats;
  const totalHours = totalMinutes / 60;
  const goalProgress = project.goalHours
    ? Math.min(totalHours / project.goalHours, 1)
    : null;
  const pct = goalProgress !== null ? Math.round(goalProgress * 100) : null;

  const totalLabel =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${
          totalMinutes % 60 > 0 ? `${totalMinutes % 60}m` : ""
        }`
      : `${totalMinutes}min`;

  const weekLabel =
    weekMinutes >= 60
      ? `${Math.floor(weekMinutes / 60)}h ${
          weekMinutes % 60 > 0 ? `${weekMinutes % 60}m` : ""
        } diese Woche`
      : weekMinutes > 0
      ? `${weekMinutes}min diese Woche`
      : "";

  return (
    <View
      style={[prow.container, { borderColor: dark ? "#334155" : "#e2e8f0" }]}
    >
      {/* Linker Farbbalken */}
      <View style={[prow.colorBar, { backgroundColor: project.color }]} />

      <View
        style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12, gap: 6 }}
      >
        {/* Titel-Zeile */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {project.emoji ? (
            <Text style={{ fontSize: 14 }}>{project.emoji}</Text>
          ) : null}
          <Text
            style={[prow.title, { color: dark ? "#f1f5f9" : "#0f172a" }]}
            numberOfLines={1}
          >
            {project.title}
          </Text>
          <View
            style={{
              marginLeft: "auto",
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text style={[prow.totalHours, { color: project.color }]}>
              {totalLabel}
            </Text>
            {pct !== null && (
              <Text style={[prow.pct, { color: dark ? "#475569" : "#94a3b8" }]}>
                · {pct}%
              </Text>
            )}
          </View>
        </View>

        {/* Fortschrittsbalken (nur wenn Ziel gesetzt) */}
        {goalProgress !== null && (
          <View
            style={[
              prow.track,
              { backgroundColor: dark ? "#1e293b" : "#f1f5f9" },
            ]}
          >
            <View
              style={[
                prow.fill,
                {
                  width: `${Math.max(
                    pct ?? 0,
                    pct && pct > 0 ? 1 : 0
                  )}%` as any,
                  backgroundColor:
                    (pct ?? 0) >= 100 ? "#10b981" : project.color,
                },
              ]}
            />
          </View>
        )}

        {/* Sub-Info */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {weekLabel ? (
            <Text style={[prow.sub, { color: dark ? "#475569" : "#94a3b8" }]}>
              {weekLabel}
            </Text>
          ) : null}
          {project.goalHours ? (
            <Text style={[prow.sub, { color: dark ? "#334155" : "#cbd5e1" }]}>
              · Ziel: {project.goalHours}h
            </Text>
          ) : null}
          <Text
            style={[
              prow.sub,
              { marginLeft: "auto", color: dark ? "#475569" : "#94a3b8" },
            ]}
          >
            {sessionCount} {sessionCount === 1 ? "Session" : "Sessions"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const prow = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  colorBar: { width: 5 },
  title: { fontSize: 14, fontWeight: "700", flex: 1 },
  totalHours: { fontSize: 14, fontWeight: "800" },
  pct: { fontSize: 12, fontWeight: "600" },
  track: { height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
  sub: { fontSize: 11, fontWeight: "500" },
});

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export function ProjectsCard({ dark }: { dark: boolean }) {
  const c = useAppColors();
  const { getActiveProjects } = useProjectStore();
  const sessions = useFocusStore((s) => s.sessions);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const projectStats = useMemo((): ProjectStats[] => {
    const active = getActiveProjects();
    if (active.length === 0) return [];

    return (
      active
        .map((project) => {
          const projectSessions = sessions.filter(
            (s) => s.projectId === project.id
          );
          const totalMinutes = projectSessions.reduce(
            (sum, s) =>
              sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
            0
          );
          const weekMinutes = projectSessions
            .filter((s) => s.startedAt >= weekStart)
            .reduce(
              (sum, s) =>
                sum + Math.floor((s.focusSeconds ?? s.durationSeconds) / 60),
              0
            );
          const lastSessionAt =
            projectSessions.length > 0
              ? Math.max(...projectSessions.map((s) => s.startedAt))
              : null;

          return {
            project,
            totalMinutes,
            weekMinutes,
            sessionCount: projectSessions.length,
            lastSessionAt,
          };
        })
        // Sortiert nach letzter Session (aktuellste zuerst)
        .sort((a, b) => (b.lastSessionAt ?? 0) - (a.lastSessionAt ?? 0))
    );
  }, [sessions, weekStart, getActiveProjects]);

  // Kein Projekt → nicht rendern
  if (projectStats.length === 0) return null;

  return (
    <View style={pc.container}>
      <View style={pc.headerRow}>
        <Text style={[pc.title, { color: dark ? "#64748b" : "#94a3b8" }]}>
          PROJEKTE
        </Text>
        <Text style={[pc.count, { color: dark ? "#475569" : "#94a3b8" }]}>
          {projectStats.length} aktiv
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        {projectStats.map((stats) => (
          <ProjectRow key={stats.project.id} stats={stats} dark={dark} />
        ))}
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  container: { gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  title: { flex: 1, fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  count: { fontSize: 12, fontWeight: "500" },
});
