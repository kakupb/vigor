// hooks/useErrorHandler.ts
import { useCallback, useState } from "react";
import { Alert } from "react-native";

type ErrorState = {
  error: Error | null;
  message: string | null;
};

/**
 * Hook für zentrales Error Handling
 */
export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    message: null,
  });

  const handleError = useCallback((error: unknown, context?: string) => {
    console.error(`[Error ${context ? `in ${context}` : ""}]:`, error);

    const message =
      error instanceof Error ? error.message : "Ein Fehler ist aufgetreten";

    setErrorState({
      error: error instanceof Error ? error : new Error(String(error)),
      message,
    });

    // User-Feedback
    Alert.alert("Fehler", message, [
      {
        text: "OK",
        onPress: () => setErrorState({ error: null, message: null }),
      },
    ]);
  }, []);

  const clearError = useCallback(() => {
    setErrorState({ error: null, message: null });
  }, []);

  return {
    error: errorState.error,
    message: errorState.message,
    handleError,
    clearError,
  };
}
