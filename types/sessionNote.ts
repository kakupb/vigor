// types/sessionNote.ts
// Strukturierte Reflexion nach einer Fokus-Session.
// Wird in sessionNoteStore per sessionId gespeichert und
// vor der nächsten Session im selben Projekt angezeigt.

export type NextStep = {
  id: string;
  text: string;
  done: boolean;
};

export type SessionNote = {
  id: string; // == sessionId
  sessionId: string;
  projectId?: string; // für "letztes Mal in diesem Projekt" Lookup
  date: string; // YYYY-MM-DD
  score: number; // 1–10
  answers: Record<string, string>; // questionId → Antwort
  freeText: string;
  nextSteps: NextStep[];
  createdAt: number;
};

// ─── Smart-Fragen Pool ────────────────────────────────────────────────────────
// Kontextabhängig: je nach Tageszeit + Session-Länge 3-4 Fragen vorgeschlagen.
// IDs sind stabil damit Antworten zugeordnet bleiben.

export type SmartQuestion = {
  id: string;
  text: string;
  placeholder: string;
  context: "always" | "morning" | "evening" | "long" | "short";
};

export const SMART_QUESTIONS: SmartQuestion[] = [
  // Immer sinnvoll
  {
    id: "accomplished",
    text: "Was hast du erreicht?",
    placeholder: "Kapitel gelesen, Aufgabe fertiggestellt…",
    context: "always",
  },
  {
    id: "obstacle",
    text: "Was hat dich aufgehalten oder abgelenkt?",
    placeholder: "Handy, Lärm, unklar wo anfangen…",
    context: "always",
  },
  // Längere Sessions
  {
    id: "flow",
    text: "Warst du im Flow? Wann genau?",
    placeholder: "Beim Schreiben des zweiten Abschnitts…",
    context: "long",
  },
  {
    id: "energy",
    text: "Wie war deine Energie im Verlauf?",
    placeholder: "Anfangs gut, nach 30 Min abgefallen…",
    context: "long",
  },
  // Kurze Sessions
  {
    id: "why_short",
    text: "Was hat die Session kurz gemacht?",
    placeholder: "Nur 20 Min Zeit gehabt, trotzdem gut…",
    context: "short",
  },
  // Morgens
  {
    id: "intention",
    text: "Hast du deine Absicht für heute umgesetzt?",
    placeholder: "Ich wollte X — habe ich Y davon geschafft…",
    context: "morning",
  },
  // Abends
  {
    id: "tomorrow",
    text: "Was nimmst du für morgen mit?",
    placeholder: "Morgen früh mit X weitermachen…",
    context: "evening",
  },
  {
    id: "learned",
    text: "Was hast du heute gelernt?",
    placeholder: "Neues Konzept, bessere Methode…",
    context: "evening",
  },
];

// Gibt 3-4 Fragen passend zum Kontext zurück
export function getSmartQuestions(
  sessionMinutes: number,
  hour: number
): SmartQuestion[] {
  const isLong = sessionMinutes >= 30;
  const isMorning = hour < 13;
  const isEvening = hour >= 17;

  const always = SMART_QUESTIONS.filter((q) => q.context === "always");
  const contextual = SMART_QUESTIONS.filter((q) => {
    if (q.context === "long") return isLong;
    if (q.context === "short") return !isLong;
    if (q.context === "morning") return isMorning;
    if (q.context === "evening") return isEvening;
    return false;
  });

  // Max 2 Always + 2 Contextual = max 4 Fragen
  return [...always.slice(0, 2), ...contextual.slice(0, 2)];
}
