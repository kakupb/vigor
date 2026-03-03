// /Users/yakupadar/code_projects/HabitTracker/components/planner/DateTimeField.tsx
import { minutesToTime } from "@/utils/dateUtils";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

/* ---------------- Locale (DE) ---------------- */

LocaleConfig.locales.de = {
  monthNames: [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ],
  monthNamesShort: [
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
  ],
  dayNames: [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ],
  dayNamesShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
};

LocaleConfig.defaultLocale = "de";

/* ---------------- Types ---------------- */

type DateTimeFieldProps = {
  date: string; // YYYY-MM-DD
  startMinutes: number; // z.B. 1020
  allDay?: boolean;
  onChangeDate: (d: string) => void;
  onChangeTime: (m: number) => void;
};

/* ---------------- Helpers ---------------- */

function formatDateDE(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function minutesToDate(m: number): Date {
  const d = new Date();
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

/* ---------------- Component ---------------- */

export function DateTimeField({
  date,
  startMinutes,
  allDay,
  onChangeDate,
  onChangeTime,
}: DateTimeFieldProps) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  return (
    <>
      {/* -------- Row: Date | Time -------- */}
      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: "#999",
          borderRadius: 10,
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        {/* Date */}
        <Pressable
          onPress={() => {
            setShowDate((v) => !v);
            setShowTime(false);
          }}
          style={{
            flex: 1,
            padding: 14,
            borderRightWidth: 1,
            borderColor: "#ccc",
          }}
        >
          <Text style={{ fontSize: 12, color: "#666" }}>Datum</Text>
          <Text style={{ fontSize: 16 }}>{formatDateDE(date)}</Text>
        </Pressable>

        {/* Time */}
        <Pressable
          onPress={() => {
            if (!allDay) {
              setShowTime((v) => !v);
              setShowDate(false);
            }
          }}
          disabled={allDay}
          style={{
            flex: 1,
            padding: 14,
            opacity: allDay ? 0.4 : 1,
          }}
        >
          <Text style={{ fontSize: 12, color: "#666" }}>Uhrzeit</Text>
          <Text style={{ fontSize: 16 }}>{minutesToTime(startMinutes)}</Text>
        </Pressable>
      </View>

      {/* -------- Calendar -------- */}
      {showDate && (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <Calendar
            current={date}
            onDayPress={(day) => {
              onChangeDate(day.dateString);
              setShowDate(false);
            }}
            enableSwipeMonths
            markedDates={{
              [date]: {
                selected: true,
                selectedColor: "#111",
                selectedTextColor: "#fff",
              },
            }}
            theme={{
              backgroundColor: "#fff",
              calendarBackground: "#fff",
              textSectionTitleColor: "#777",
              dayTextColor: "#111",
              todayTextColor: "#777",
              arrowColor: "#111",
              monthTextColor: "#111",
              textMonthFontWeight: "600",
              textMonthFontSize: 16,
              textDayFontSize: 14,
              textDayHeaderFontSize: 12,
              textDisabledColor: "#ccc",
            }}
          />
        </View>
      )}

      {/* -------- Time Picker -------- */}
      {showTime && !allDay && (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            marginBottom: 12,
            overflow: "hidden",
            backgroundColor: "white",
          }}
        >
          <DateTimePicker
            value={minutesToDate(startMinutes)}
            mode="time"
            display="spinner"
            textColor="#111111" // ← NEU: erzwingt dunkle Schrift
            themeVariant="light" // ← NEU: immer Light Mode
            onChange={(_, selected) => {
              if (!selected) return;
              onChangeTime(selected.getHours() * 60 + selected.getMinutes());
            }}
          />
        </View>
      )}
    </>
  );
}
