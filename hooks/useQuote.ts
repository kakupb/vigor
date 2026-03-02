// hooks/useQuote.ts

import { getDailyQuote, getRandomQuote } from "@/services/quoteService";
import { Quote } from "@/types/quotes";
import { useEffect, useState } from "react";

export function useDailyQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadQuote() {
      try {
        const dailyQuote = await getDailyQuote();
        setQuote(dailyQuote);
      } catch (error) {
        console.error("Failed to load quote:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadQuote();
  }, []);

  // Optional: Refresh Function für "Nächstes Zitat"
  async function refreshQuote() {
    const newQuote = getRandomQuote();
    setQuote(newQuote);
  }

  return {
    quote,
    isLoading,
    refreshQuote,
  };
}
