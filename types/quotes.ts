export type Quote = {
  id: string;
  text: string;
  author?: string;
  category?: "motivation" | "wisdom" | "focus" | "gratitude" | "funny";
  language: "de" | "en";
};

export type QuoteHistory = {
  usedQuotes: {
    quoteId: string;
    shownAt: number; // timestamp
  }[];
  lastUpdated: number;
};
