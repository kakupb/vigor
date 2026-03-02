// components/habits/FrequencyPicker.tsx
import { HabitFrequency } from "@/types/habit";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  value: HabitFrequency;
  onChange: (f: HabitFrequency) => void;
  accentColor?: string;
};

const WEEKDAYS = [
  { label: "So", value: 0 },
  { label: "Mo", value: 1 },
  { label: "Di", value: 2 },
  { label: "Mi", value: 3 },
  { label: "Do", value: 4 },
  { label: "Fr", value: 5 },
  { label: "Sa", value: 6 },
];

type FreqType = HabitFrequency["type"];

const FREQ_OPTIONS: { type: FreqType; label: string; emoji: string }[] = [
  { type: "daily", label: "Täglich", emoji: "📅" },
  { type: "weekdays", label: "Wochentage", emoji: "📆" },
  { type: "xPerWeek", label: "X pro Woche", emoji: "🔁" },
  { type: "xPerMonth", label: "X pro Monat", emoji: "🗓️" },
  { type: "interval", label: "Alle N …", emoji: "⏱️" },
];

export function FrequencyPicker({
  value,
  onChange,
  accentColor = "#3b8995",
}: Props) {
  const type = value.type;

  function setType(t: FreqType) {
    if (t === "daily") onChange({ type: "daily" });
    if (t === "weekdays") onChange({ type: "weekdays", days: [1, 2, 3, 4, 5] }); // Mo–Fr default
    if (t === "xPerWeek") onChange({ type: "xPerWeek", count: 3 });
    if (t === "xPerMonth") onChange({ type: "xPerMonth", count: 4 });
    if (t === "interval")
      onChange({ type: "interval", every: 2, unit: "days" });
  }

  function toggleDay(day: number) {
    if (value.type !== "weekdays") return;
    const days = value.days.includes(day)
      ? value.days.filter((d) => d !== day)
      : [...value.days, day];
    onChange({ type: "weekdays", days });
  }

  return (
    <View style={s.container}>
      {/* Type selector */}
      <View style={s.typeRow}>
        {FREQ_OPTIONS.map((opt) => (
          <Pressable
            key={opt.type}
            onPress={() => setType(opt.type)}
            style={[
              s.typeChip,
              type === opt.type && {
                backgroundColor: accentColor,
                borderColor: accentColor,
              },
            ]}
          >
            <Text style={s.typeEmoji}>{opt.emoji}</Text>
            <Text
              style={[s.typeLabel, type === opt.type && { color: "white" }]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Weekday picker */}
      {type === "weekdays" && value.type === "weekdays" && (
        <View style={s.weekdayRow}>
          {WEEKDAYS.map((wd) => (
            <Pressable
              key={wd.value}
              onPress={() => toggleDay(wd.value)}
              style={[
                s.dayBtn,
                value.days.includes(wd.value) && {
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                },
              ]}
            >
              <Text
                style={[
                  s.dayLabel,
                  value.days.includes(wd.value) && { color: "white" },
                ]}
              >
                {wd.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* X per Week */}
      {type === "xPerWeek" && value.type === "xPerWeek" && (
        <View style={s.counterRow}>
          <Text style={s.counterLabel}>Mal pro Woche:</Text>
          <CountStepper
            value={value.count}
            min={1}
            max={7}
            color={accentColor}
            onChange={(n) => onChange({ type: "xPerWeek", count: n })}
          />
        </View>
      )}

      {/* X per Month */}
      {type === "xPerMonth" && value.type === "xPerMonth" && (
        <View style={s.counterRow}>
          <Text style={s.counterLabel}>Mal pro Monat:</Text>
          <CountStepper
            value={value.count}
            min={1}
            max={31}
            color={accentColor}
            onChange={(n) => onChange({ type: "xPerMonth", count: n })}
          />
        </View>
      )}

      {/* Interval */}
      {type === "interval" && value.type === "interval" && (
        <View style={s.intervalBox}>
          <Text style={s.counterLabel}>Alle</Text>
          <CountStepper
            value={value.every}
            min={1}
            max={99}
            color={accentColor}
            onChange={(n) => onChange({ ...value, every: n })}
          />
          <View style={s.unitRow}>
            {(["days", "weeks", "months"] as const).map((u) => (
              <Pressable
                key={u}
                onPress={() => onChange({ ...value, unit: u })}
                style={[
                  s.unitBtn,
                  value.unit === u && {
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                  },
                ]}
              >
                <Text
                  style={[s.unitLabel, value.unit === u && { color: "white" }]}
                >
                  {u === "days" ? "Tage" : u === "weeks" ? "Wochen" : "Monate"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Mini stepper
function CountStepper({
  value,
  min,
  max,
  color,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  color: string;
  onChange: (n: number) => void;
}) {
  return (
    <View style={cs.row}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[cs.btn, { borderColor: color }]}
      >
        <Text style={[cs.btnText, { color }]}>−</Text>
      </Pressable>
      <Text style={cs.value}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        style={[cs.btn, { backgroundColor: color, borderColor: color }]}
      >
        <Text style={[cs.btnText, { color: "white" }]}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 14 },

  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8f9fb",
  },
  typeEmoji: { fontSize: 13 },
  typeLabel: { fontSize: 13, fontWeight: "600", color: "#475569" },

  weekdayRow: { flexDirection: "row", justifyContent: "space-between" },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8f9fb",
  },
  dayLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  counterLabel: { fontSize: 14, color: "#475569", fontWeight: "500" },

  intervalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  unitRow: { flexDirection: "row", gap: 6 },
  unitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8f9fb",
  },
  unitLabel: { fontSize: 13, fontWeight: "600", color: "#475569" },
});

const cs = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    backgroundColor: "white",
  },
  btnText: { fontSize: 18, fontWeight: "700", lineHeight: 22 },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    minWidth: 28,
    textAlign: "center",
  },
});
