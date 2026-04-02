// modules/widgetBridge.ts

export type WidgetData = {
  streak: number;
  todayFocusMinutes: number;
  habitsCompleted: number;
  habitsTotal: number;
  userName: string | null;
  lastUpdated: string;
};

export async function syncWidgetData(_data: WidgetData): Promise<void> {
  // Temporär deaktiviert — Widget Bridge wird nach Build-Fix reaktiviert
  return;
}
