// services/quoteService.ts

import quotesData from "@/assets/quotes.json";
import { storage } from "@/services/storage";
import { Quote, QuoteHistory } from "@/types/quotes";

const HISTORY_KEY = "quote_history_v1";
const MAX_HISTORY_SIZE = 100; // Nach 100 Zitaten dürfen sie wiederkommen

/**
 * Alle verfügbaren Quotes
 */
export function getAllQuotes(): Quote[] {
  return quotesData.quotes as Quote[];
}

/**
 * Lädt Quote History aus Storage
 */
export async function loadQuoteHistory(): Promise<QuoteHistory> {
  try {
    const history = await storage.load<QuoteHistory>(HISTORY_KEY);
    return (
      history || {
        usedQuotes: [],
        lastUpdated: 0,
      }
    );
  } catch {
    return {
      usedQuotes: [],
      lastUpdated: 0,
    };
  }
}

/**
 * Speichert Quote History
 */
export async function saveQuoteHistory(history: QuoteHistory): Promise<void> {
  await storage.save(HISTORY_KEY, history);
}

/**
 * Gibt ein tägliches Zitat zurück (konsistent für den Tag)
 * Verwendet Date-Seed für konsistente Randomness
 */
export async function getDailyQuote(): Promise<Quote> {
  const allQuotes = getAllQuotes();
  const history = await loadQuoteHistory();

  // Ermittle bereits verwendete Quote IDs (letzte 100)
  const recentlyUsedIds = history.usedQuotes
    .slice(-MAX_HISTORY_SIZE)
    .map((u) => u.quoteId);

  // Filtere noch nicht verwendete Quotes
  let availableQuotes = allQuotes.filter(
    (q) => !recentlyUsedIds.includes(q.id)
  );

  // Falls alle Quotes verwendet wurden → Reset (erlaubt Wiederholung)
  if (availableQuotes.length === 0) {
    availableQuotes = allQuotes;
  }

  // Deterministisch random basierend auf Datum
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  const index = seededRandom(seed, availableQuotes.length);
  const selectedQuote = availableQuotes[index];

  // Prüfe ob dieses Zitat heute bereits gezeigt wurde
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).getTime();
  const lastShown = history.usedQuotes.find(
    (u) => u.quoteId === selectedQuote.id && u.shownAt >= todayStart
  );

  // Wenn heute noch nicht gezeigt → zur History hinzufügen
  if (!lastShown) {
    const updatedHistory: QuoteHistory = {
      usedQuotes: [
        ...history.usedQuotes,
        {
          quoteId: selectedQuote.id,
          shownAt: Date.now(),
        },
      ],
      lastUpdated: Date.now(),
    };

    await saveQuoteHistory(updatedHistory);
  }

  return selectedQuote;
}

/**
 * Seeded Random für konsistente Tages-Quotes
 */
function seededRandom(seed: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

/**
 * Gibt ein komplett zufälliges Zitat (für "Nächstes" Button)
 */
export function getRandomQuote(): Quote {
  const allQuotes = getAllQuotes();
  const randomIndex = Math.floor(Math.random() * allQuotes.length);
  return allQuotes[randomIndex];
}

/**
 * Statistiken über Quote History
 */
export async function getQuoteStats(): Promise<{
  totalQuotes: number;
  viewedQuotes: number;
  remainingQuotes: number;
}> {
  const allQuotes = getAllQuotes();
  const history = await loadQuoteHistory();

  const uniqueViewedIds = new Set(history.usedQuotes.map((u) => u.quoteId));

  return {
    totalQuotes: allQuotes.length,
    viewedQuotes: uniqueViewedIds.size,
    remainingQuotes: allQuotes.length - uniqueViewedIds.size,
  };
}
