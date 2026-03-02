// components/notes/NoteLinker.tsx
import { getCategoryConfig } from "@/constants/categories";
import { isCompletedToday } from "@/services/habitService";
import { useHabitStore } from "@/store/habitStore";
import { usePlannerStore } from "@/store/plannerStore";
import { dateToLocalString, getTodayTimestamp } from "@/utils/dateUtils";
import { getStreak } from "@/utils/getStreak";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Tab = "habits" | "planner";

type Props = {
  linkedHabitIds: string[];
  linkedPlannerIds: string[];
  onLinkHabit: (habitId: string) => void;
  onLinkPlanner: (plannerId: string) => void;
  visibleTabs?: Tab[]; // NEU
};

export function NoteLinker({
  linkedHabitIds,
  linkedPlannerIds,
  onLinkHabit,
  onLinkPlanner,
  visibleTabs = ["habits", "planner"], // default: beide
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  // Setze activeTab auf ersten sichtbaren Tab
  const [activeTab, setActiveTab] = useState<Tab>(visibleTabs[0] ?? "habits");

  const habits = useHabitStore((s) => s.habits);
  const entries = usePlannerStore((s) => s.entries);

  const today = dateToLocalString(new Date());
  const todayTimestamp = getTodayTimestamp();
  const todayEntries = entries.filter((e) => e.date === today);

  const totalLinked = linkedHabitIds.length + linkedPlannerIds.length;

  return (
    <>
      {/* ── Linked items preview ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="link-outline" size={15} color="#64748b" />
          <Text style={styles.sectionTitle}>Verknüpfungen</Text>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={styles.addLinkButton}
          >
            <Ionicons name="add" size={16} color="#3b8995" />
            <Text style={styles.addLinkText}>Verknüpfen</Text>
          </Pressable>
        </View>

        {totalLinked === 0 ? (
          <Pressable
            onPress={() => setModalVisible(true)}
            style={styles.emptyLinker}
          >
            <Text style={styles.emptyLinkerText}>
              Habit oder Planner-Eintrag verknüpfen...
            </Text>
          </Pressable>
        ) : (
          <View style={styles.linkedItems}>
            {/* Linked Habits */}
            {linkedHabitIds.map((hid) => {
              const habit = habits.find((h) => h.id === hid);
              if (!habit) return null;
              const config = getCategoryConfig(habit.category);
              const completed = isCompletedToday(habit, todayTimestamp);
              const streak = getStreak(habit);
              return (
                <Pressable
                  key={hid}
                  onPress={() => onLinkHabit(hid)}
                  style={[
                    styles.linkedChip,
                    {
                      borderColor: config.color,
                      backgroundColor: config.lightColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.chipDot,
                      { backgroundColor: completed ? "#10b981" : config.color },
                    ]}
                  />
                  <Text style={[styles.chipText, { color: config.color }]}>
                    {habit.title}
                  </Text>
                  {streak > 0 && (
                    <Text style={styles.chipMeta}>
                      <MaterialCommunityIcons
                        name="fire"
                        size={20}
                        color="#F74920"
                      />
                      {streak}
                    </Text>
                  )}
                  <Ionicons name="close" size={12} color={config.color} />
                </Pressable>
              );
            })}

            {/* Linked Planner */}
            {linkedPlannerIds.map((pid) => {
              const entry = entries.find((e) => e.id === pid);
              if (!entry) return null;
              const config = getCategoryConfig(entry.category);
              return (
                <Pressable
                  key={pid}
                  onPress={() => onLinkPlanner(pid)}
                  style={[
                    styles.linkedChip,
                    {
                      borderColor: config.color,
                      backgroundColor: config.lightColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={entry.doneAt ? "checkmark-circle" : "time-outline"}
                    size={12}
                    color={config.color}
                  />
                  <Text style={[styles.chipText, { color: config.color }]}>
                    {entry.title}
                  </Text>
                  {entry.startTime && (
                    <Text style={styles.chipMeta}>{entry.startTime}</Text>
                  )}
                  <Ionicons name="close" size={12} color={config.color} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Picker Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modal}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Verknüpfen</Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={22} color="#0f172a" />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(["habits", "planner"] as Tab[])
              .filter((tab) => visibleTabs.includes(tab))
              .map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.tabTextActive,
                    ]}
                  >
                    {tab === "habits" ? "Habits" : "Planner (Heute)"}
                  </Text>
                </Pressable>
              ))}
          </View>

          <ScrollView style={styles.modalList}>
            {activeTab === "habits" &&
              habits.map((habit) => {
                const config = getCategoryConfig(habit.category);
                const isLinked = linkedHabitIds.includes(habit.id);
                const completed = isCompletedToday(habit, todayTimestamp);
                const streak = getStreak(habit);

                return (
                  <Pressable
                    key={habit.id}
                    onPress={() => {
                      onLinkHabit(habit.id);
                    }}
                    style={[
                      styles.modalItem,
                      isLinked && styles.modalItemLinked,
                    ]}
                  >
                    <View
                      style={[
                        styles.modalItemDot,
                        { backgroundColor: config.color },
                      ]}
                    />
                    <View style={styles.modalItemContent}>
                      <Text style={styles.modalItemTitle}>{habit.title}</Text>
                      <Text style={styles.modalItemMeta}>
                        {completed ? "✓ Heute erledigt" : "Offen"} ·{" "}
                        <MaterialCommunityIcons
                          name="fire"
                          size={20}
                          color="#F74920"
                        />
                        {streak} Tage
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.modalCheckbox,
                        isLinked && {
                          backgroundColor: "#3b8995",
                          borderColor: "#3b8995",
                        },
                      ]}
                    >
                      {isLinked && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </Pressable>
                );
              })}

            {activeTab === "planner" &&
              (todayEntries.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>
                    Keine Einträge für heute
                  </Text>
                </View>
              ) : (
                todayEntries.map((entry) => {
                  const config = getCategoryConfig(entry.category);
                  const isLinked = linkedPlannerIds.includes(entry.id);

                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => onLinkPlanner(entry.id)}
                      style={[
                        styles.modalItem,
                        isLinked && styles.modalItemLinked,
                      ]}
                    >
                      <View
                        style={[
                          styles.modalItemDot,
                          { backgroundColor: config.color },
                        ]}
                      />
                      <View style={styles.modalItemContent}>
                        <Text style={styles.modalItemTitle}>{entry.title}</Text>
                        <Text style={styles.modalItemMeta}>
                          {entry.startTime
                            ? `${entry.startTime}${
                                entry.endTime ? ` – ${entry.endTime}` : ""
                              }`
                            : "Anytime"}
                          {entry.doneAt ? " · ✓ Erledigt" : ""}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.modalCheckbox,
                          isLinked && {
                            backgroundColor: "#3b8995",
                            borderColor: "#3b8995",
                          },
                        ]}
                      >
                        {isLinked && (
                          <Ionicons name="checkmark" size={14} color="white" />
                        )}
                      </View>
                    </Pressable>
                  );
                })
              ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Fertig</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#f0fbfc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a5e8ef",
  },
  addLinkText: {
    fontSize: 12,
    color: "#3b8995",
    fontWeight: "600",
  },
  emptyLinker: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#f8f9fb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eef0f4",
    borderStyle: "dashed",
  },
  emptyLinkerText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  linkedItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linkedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chipMeta: {
    fontSize: 11,
    color: "#64748b",
  },

  // Modal
  modal: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalClose: {
    padding: 6,
    borderRadius: 8,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  tabActive: {
    backgroundColor: "#0f172a",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "white",
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fb",
    gap: 12,
  },
  modalItemLinked: {
    backgroundColor: "#f0fbfc",
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderRadius: 0,
  },
  modalItemDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  modalItemMeta: {
    fontSize: 12,
    color: "#94a3b8",
  },
  modalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  modalEmpty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  doneButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
