// components/focus/PomodoroSettingsSheet.tsx
// Pomodoro-Einstellungen als sauberer Bottom Sheet.
// Zugänglich vom Fokus-Screen bevor die Session startet.

import { useAppColors } from "@/hooks/useAppColors";
import { useFocusStore } from "@/store/focusStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = { visible: boolean; onClose: () => void };

type ConfigKey =
  | "workMinutes"
  | "breakMinutes"
  | "longBreakMinutes"
  | "longBreakAfter";

const SETTINGS: {
  key: ConfigKey;
  label: string;
  sub: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  {
    key: "workMinutes",
    label: "Fokus-Zeit",
    sub: "Dauer einer Einheit",
    icon: "timer-outline",
    min: 5,
    max: 90,
    step: 5,
    unit: "Min",
  },
  {
    key: "breakMinutes",
    label: "Kurze Pause",
    sub: "Nach jeder Einheit",
    icon: "cafe-outline",
    min: 1,
    max: 15,
    step: 1,
    unit: "Min",
  },
  {
    key: "longBreakMinutes",
    label: "Lange Pause",
    sub: "Nach dem Zyklus",
    icon: "moon-outline",
    min: 5,
    max: 30,
    step: 5,
    unit: "Min",
  },
  {
    key: "longBreakAfter",
    label: "Einheiten/Zyklus",
    sub: "Bis zur langen Pause",
    icon: "repeat-outline",
    min: 2,
    max: 8,
    step: 1,
    unit: "×",
  },
];

export function PomodoroSettingsSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const config = useFocusStore((s) => s.pomodoroConfig);
  const setConfig = useFocusStore((s) => s.setPomodoroConfig);

  function change(key: ConfigKey, delta: number) {
    const setting = SETTINGS.find((s) => s.key === key)!;
    const current = config[key];
    const next = Math.max(setting.min, Math.min(setting.max, current + delta));
    if (next !== current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setConfig({ ...config, [key]: next });
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.root, { backgroundColor: c.cardBg }]}>
        <View style={[s.handle, { backgroundColor: c.borderDefault }]} />

        <View style={s.header}>
          <Text style={[s.title, { color: c.textPrimary }]}>
            Pomodoro-Timer
          </Text>
          <Pressable
            onPress={onClose}
            style={[s.closeBtn, { backgroundColor: c.subtleBg }]}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={c.textSecondary} />
          </Pressable>
        </View>

        <View style={[s.content, { paddingBottom: insets.bottom + 32 }]}>
          {SETTINGS.map((setting) => {
            const value = config[setting.key];
            const atMin = value <= setting.min;
            const atMax = value >= setting.max;

            return (
              <View
                key={setting.key}
                style={[
                  s.row,
                  {
                    backgroundColor: c.dark ? "#1e293b" : "#f8f9fb",
                    borderColor: c.borderDefault,
                  },
                ]}
              >
                {/* Icon */}
                <View
                  style={[
                    s.iconWrap,
                    { backgroundColor: c.dark ? "#334155" : "#e2e8f0" },
                  ]}
                >
                  <Ionicons
                    name={setting.icon as any}
                    size={18}
                    color={c.textSecondary}
                  />
                </View>

                {/* Label */}
                <View style={s.labelCol}>
                  <Text style={[s.label, { color: c.textPrimary }]}>
                    {setting.label}
                  </Text>
                  <Text style={[s.sub, { color: c.textMuted }]}>
                    {setting.sub}
                  </Text>
                </View>

                {/* Stepper */}
                <View style={s.stepper}>
                  <Pressable
                    onPress={() => change(setting.key, -setting.step)}
                    disabled={atMin}
                    hitSlop={10}
                    style={[
                      s.stepBtn,
                      {
                        backgroundColor: c.dark ? "#334155" : "#e2e8f0",
                        opacity: atMin ? 0.3 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="remove" size={16} color={c.textPrimary} />
                  </Pressable>

                  <Text
                    style={[s.stepValue, { color: "#3b8995", minWidth: 46 }]}
                  >
                    {value}
                    {setting.unit}
                  </Text>

                  <Pressable
                    onPress={() => change(setting.key, setting.step)}
                    disabled={atMax}
                    hitSlop={10}
                    style={[
                      s.stepBtn,
                      {
                        backgroundColor: c.dark ? "#334155" : "#e2e8f0",
                        opacity: atMax ? 0.3 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="add" size={16} color={c.textPrimary} />
                  </Pressable>
                </View>
              </View>
            );
          })}

          {/* Zusammenfassung */}
          <View
            style={[
              s.summary,
              {
                backgroundColor: c.dark ? "#0c2430" : "#f0fbfc",
                borderColor: c.dark ? "#164e63" : "#a5e8ef",
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={14}
              color="#3b8995"
            />
            <Text style={[s.summaryText, { color: c.textSecondary }]}>
              {config.workMinutes}min Fokus · {config.breakMinutes}min Pause ·
              Lange Pause nach {config.longBreakAfter} Einheiten
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { paddingHorizontal: 16, gap: 10 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  labelCol: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600" },
  sub: { fontSize: 11, marginTop: 1 },

  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  stepValue: { fontSize: 15, fontWeight: "700", textAlign: "center" },

  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  summaryText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
