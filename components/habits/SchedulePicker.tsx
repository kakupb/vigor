// components/habits/SchedulePicker.tsx
import { HabitSchedule, RepeatUnit } from "@/types/habit";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  value: HabitSchedule;
  onChange: (s: HabitSchedule) => void;
  accentColor?: string;
};

// ─── tiny inline select modal ────────────────────────────────────────────────
function SelectModal<T extends string | number>({
  visible,
  options,
  selected,
  onSelect,
  onClose,
  title,
}: {
  visible: boolean;
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
  title: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={m.backdrop} onPress={onClose}>
        <View style={m.sheet}>
          <Text style={m.title}>{title}</Text>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={String(opt.value)}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                style={[m.option, opt.value === selected && m.optionSelected]}
              >
                <Text
                  style={[
                    m.optionText,
                    opt.value === selected && m.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.value === selected && <Text style={m.check}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── tiny date picker ─────────────────────────────────────────────────────────
function DatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
  title,
  minDate,
}: {
  visible: boolean;
  value: string;
  onSelect: (d: string) => void;
  onClose: () => void;
  title: string;
  minDate?: string;
}) {
  const parsed = value ? new Date(value) : new Date();
  const [year, setYear] = useState(parsed.getFullYear());
  const [month, setMonth] = useState(parsed.getMonth()); // 0-indexed
  const [day, setDay] = useState(parsed.getDate());

  const MONTHS = [
    "Jan",
    "Feb",
    "Mär",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() + i - 1
  );

  function confirm() {
    const clampedDay = Math.min(day, daysInMonth);
    const d = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      clampedDay
    ).padStart(2, "0")}`;
    onSelect(d);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={m.backdrop} onPress={onClose}>
        <View style={[m.sheet, { paddingBottom: 0 }]}>
          <Text style={m.title}>{title}</Text>

          {/* Three column pickers */}
          <View style={dp.cols}>
            {/* Day */}
            <ScrollView style={dp.col} showsVerticalScrollIndicator={false}>
              {days.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDay(d)}
                  style={[dp.item, day === d && dp.itemActive]}
                >
                  <Text style={[dp.itemText, day === d && dp.itemTextActive]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {/* Month */}
            <ScrollView style={dp.col} showsVerticalScrollIndicator={false}>
              {MONTHS.map((mn, i) => (
                <Pressable
                  key={i}
                  onPress={() => setMonth(i)}
                  style={[dp.item, month === i && dp.itemActive]}
                >
                  <Text style={[dp.itemText, month === i && dp.itemTextActive]}>
                    {mn}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {/* Year */}
            <ScrollView style={dp.col} showsVerticalScrollIndicator={false}>
              {years.map((y) => (
                <Pressable
                  key={y}
                  onPress={() => setYear(y)}
                  style={[dp.item, year === y && dp.itemActive]}
                >
                  <Text style={[dp.itemText, year === y && dp.itemTextActive]}>
                    {y}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Pressable style={dp.confirmBtn} onPress={confirm}>
            <Text style={dp.confirmText}>Übernehmen</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Main SchedulePicker ──────────────────────────────────────────────────────
export function SchedulePicker({
  value,
  onChange,
  accentColor = "#3b8995",
}: Props) {
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [showUnit, setShowUnit] = useState(false);
  const [showEvery, setShowEvery] = useState(false);

  const repeatUnit = value.repeatUnit ?? "day";
  const repeatEvery = value.repeatEvery ?? 1;

  const UNIT_OPTIONS: { label: string; value: RepeatUnit }[] = [
    { label: "Tag", value: "day" },
    { label: "Woche", value: "week" },
    { label: "Monat", value: "month" },
    { label: "Jahr", value: "year" },
  ];

  const UNIT_PLURAL: Record<RepeatUnit, string> = {
    day: "Tage",
    week: "Wochen",
    month: "Monate",
    year: "Jahre",
  };

  const EVERY_OPTIONS = Array.from({ length: 30 }, (_, i) => ({
    label:
      i === 0
        ? `1 ${UNIT_PLURAL[repeatUnit]}`
        : `${i + 1} ${UNIT_PLURAL[repeatUnit]}`,
    value: i + 1,
  }));

  function formatDate(iso?: string) {
    if (!iso) return "–";
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <View style={s.container}>
      {/* Row: Beginnt am */}
      <View style={s.row}>
        <Text style={s.rowLabel}>Beginnt am</Text>
        <Pressable
          onPress={() => setShowStart(true)}
          style={[s.pill, { borderColor: accentColor }]}
        >
          <Text style={[s.pillText, { color: accentColor }]}>
            {formatDate(value.startDate) ?? today}
          </Text>
        </Pressable>
      </View>

      {/* Row: Endet am */}
      <View style={s.row}>
        <Text style={s.rowLabel}>Endet am</Text>
        <View style={s.pillGroup}>
          <Pressable
            onPress={() => setShowEnd(true)}
            style={[s.pill, value.endDate ? { borderColor: accentColor } : {}]}
          >
            <Text
              style={[
                s.pillText,
                value.endDate ? { color: accentColor } : { color: "#94a3b8" },
              ]}
            >
              {value.endDate ? formatDate(value.endDate) : "Kein Ende"}
            </Text>
          </Pressable>
          {value.endDate && (
            <Pressable
              onPress={() => onChange({ ...value, endDate: undefined })}
              style={s.clearBtn}
            >
              <Text style={s.clearBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Row: Wiederholung */}
      <View style={s.row}>
        <Text style={s.rowLabel}>Wiederholung</Text>
        <View style={s.pillGroup}>
          {/* Every N */}
          <Pressable
            onPress={() => setShowEvery(true)}
            style={[s.pill, { borderColor: accentColor }]}
          >
            <Text style={[s.pillText, { color: accentColor }]}>
              {repeatEvery === 1 ? "1" : repeatEvery}
            </Text>
          </Pressable>
          {/* Unit */}
          <Pressable
            onPress={() => setShowUnit(true)}
            style={[s.pill, { borderColor: accentColor }]}
          >
            <Text style={[s.pillText, { color: accentColor }]}>
              {UNIT_OPTIONS.find((u) => u.value === repeatUnit)?.label ?? "Tag"}
            </Text>
            <Text style={s.chevron}>▾</Text>
          </Pressable>
        </View>
      </View>

      {/* Wochentage – nur wenn Einheit = Woche */}
      {repeatUnit === "week" && (
        <View style={s.weekdayRow}>
          {[
            { label: "So", value: 0 },
            { label: "Mo", value: 1 },
            { label: "Di", value: 2 },
            { label: "Mi", value: 3 },
            { label: "Do", value: 4 },
            { label: "Fr", value: 5 },
            { label: "Sa", value: 6 },
          ].map((wd) => {
            const active = (value.weekDays ?? []).includes(wd.value);
            return (
              <Pressable
                key={wd.value}
                onPress={() => {
                  const current = value.weekDays ?? [];
                  const next = active
                    ? current.filter((d) => d !== wd.value)
                    : [...current, wd.value];
                  onChange({ ...value, weekDays: next });
                }}
                style={[
                  s.dayBtn,
                  active && {
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                  },
                ]}
              >
                <Text style={[s.dayLabel, active && { color: "white" }]}>
                  {wd.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Summary */}
      <View
        style={[
          s.summary,
          {
            backgroundColor: accentColor + "18",
            borderColor: accentColor + "40",
          },
        ]}
      >
        <Text style={[s.summaryText, { color: accentColor }]}>
          {repeatEvery === 1
            ? `Jeden ${UNIT_OPTIONS.find((u) => u.value === repeatUnit)?.label}`
            : `Alle ${repeatEvery} ${UNIT_PLURAL[repeatUnit]}`}
          {repeatUnit === "week" && (value.weekDays ?? []).length > 0
            ? ` · ${(value.weekDays ?? [])
                .slice()
                .sort((a, b) => a - b)
                .map((d) => ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][d])
                .join(", ")}`
            : ""}
          {value.startDate ? ` · ab ${formatDate(value.startDate)}` : ""}
          {value.endDate ? ` · bis ${formatDate(value.endDate)}` : ""}
        </Text>
      </View>

      {/* Modals */}
      <DatePickerModal
        visible={showStart}
        title="Beginnt am"
        value={value.startDate ?? today}
        onSelect={(d) => onChange({ ...value, startDate: d })}
        onClose={() => setShowStart(false)}
      />
      <DatePickerModal
        visible={showEnd}
        title="Endet am"
        value={value.endDate ?? today}
        onSelect={(d) => onChange({ ...value, endDate: d })}
        onClose={() => setShowEnd(false)}
        minDate={value.startDate}
      />
      <SelectModal
        visible={showUnit}
        title="Einheit"
        options={UNIT_OPTIONS}
        selected={repeatUnit}
        onSelect={(v) => onChange({ ...value, repeatUnit: v })}
        onClose={() => setShowUnit(false)}
      />
      <SelectModal
        visible={showEvery}
        title="Alle … wiederholen"
        options={EVERY_OPTIONS}
        selected={repeatEvery}
        onSelect={(v) => onChange({ ...value, repeatEvery: v })}
        onClose={() => setShowEvery(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "60%",
    paddingBottom: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionSelected: { backgroundColor: "#f8fafc" },
  optionText: { fontSize: 16, color: "#334155" },
  optionTextSelected: { fontWeight: "700", color: "#0f172a" },
  check: { fontSize: 16, color: "#3b8995" },
});

const dp = StyleSheet.create({
  cols: { flexDirection: "row", gap: 8, height: 200 },
  col: { flex: 1 },
  item: { paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  itemActive: { backgroundColor: "#f0fbfc" },
  itemText: { fontSize: 16, color: "#64748b" },
  itemTextActive: { fontWeight: "700", color: "#3b8995" },
  confirmBtn: {
    margin: 16,
    backgroundColor: "#3b8995",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: { color: "white", fontWeight: "700", fontSize: 16 },
});

const s = StyleSheet.create({
  container: { gap: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: { fontSize: 14, fontWeight: "500", color: "#475569" },
  pillGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  pillText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  chevron: { fontSize: 10, color: "#94a3b8", marginTop: 1 },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 13, color: "#94a3b8" },
  divider: { height: 1, backgroundColor: "#f1f5f9" },
  summary: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  summaryText: { fontSize: 13, fontWeight: "600" },
  weekdayRow: { flexDirection: "row", justifyContent: "space-between" },
  dayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8f9fb",
  },
  dayLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },
});
