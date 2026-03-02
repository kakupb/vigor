// hooks/useLoadingState.ts
import { useCallback, useState } from "react";

export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);

  const withLoading = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      try {
        const result = await fn();
        return result;
      } catch (error) {
        console.error("[useLoadingState]:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    setIsLoading,
    withLoading,
  };
}
