// components/habits/ReminderPicker.tsx
import {
  cancelHabitReminders,
  getHabitReminderTime,
  openNotificationSettings,
  scheduleHabitReminder,
} from "@/services/notificationService";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  habitId: string;
  habitTitle: string;
  weekdays?: number[];
};

export function ReminderPicker({ habitId, habitTitle, weekdays }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHabitReminderTime(habitId).then((t) => {
      if (t) {
        const d = new Date();
        d.setHours(t.hour, t.minute, 0, 0);
        setTime(d);
        setEnabled(true);
      }
      setLoading(false);
    });
  }, [habitId]);

  async function toggle() {
    if (enabled) {
      await cancelHabitReminders(habitId);
      setEnabled(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    await save(time, true);
  }

  async function save(date: Date, enabling = false) {
    setLoading(true);
    try {
      const result = await scheduleHabitReminder({
        habitId,
        habitTitle,
        hour: date.getHours(),
        minute: date.getMinutes(),
        weekdays,
      });

      if (result === "granted") {
        setEnabled(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Dauerhaft abgelehnt – Einstellungen anbieten
        if (enabling) {
          Alert.alert(
            "Benachrichtigungen deaktiviert",
            "Bitte aktiviere Benachrichtigungen für Vigor in den Einstellungen, um Erinnerungen zu erhalten.",
            [
              { text: "Abbrechen", style: "cancel" },
              {
                text: "Einstellungen öffnen",
                onPress: () => openNotificationSettings(),
              },
            ]
          );
        }
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.wrapper}>
      <View style={s.row}>
        <View style={s.left}>
          <View style={[s.iconWrap, enabled && s.iconWrapActive]}>
            <Ionicons
              name="alarm-outline"
              size={18}
              color={enabled ? "#3b8995" : "#94a3b8"}
            />
          </View>
          <View style={s.textCol}>
            <Text style={s.label}>Erinnerung</Text>
            <Text style={s.sublabel}>
              {enabled
                ? `Täglich um ${time.toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Keine Erinnerung"}
            </Text>
          </View>
        </View>

        <View style={s.right}>
          {enabled && !loading && (
            <Pressable onPress={() => setShowPicker(true)} style={s.timeBtn}>
              <Text style={s.timeBtnText}>
                {time.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </Pressable>
          )}

          {loading ? (
            <ActivityIndicator size="small" color="#3b8995" />
          ) : (
            <Pressable
              onPress={toggle}
              style={[s.toggle, enabled && s.toggleOn]}
            >
              <View style={[s.knob, enabled && s.knobOn]} />
            </Pressable>
          )}
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display="spinner"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) {
              setTime(date);
              save(date);
            }
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { paddingVertical: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapActive: { backgroundColor: "#f0fbfc" },
  textCol: { gap: 1 },
  label: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  sublabel: { fontSize: 12, color: "#94a3b8" },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#f0fbfc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#a5e8ef",
  },
  timeBtnText: { fontSize: 13, fontWeight: "600", color: "#3b8995" },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: "#3b8995" },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  knobOn: { alignSelf: "flex-end" },
});
