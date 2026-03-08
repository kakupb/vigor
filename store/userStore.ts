// store/userStore.ts
// Dünne Wrapper-Schicht für Kompatibilität mit bestehendem Code.
// Name & onboarding-Status kommen jetzt aus dem authStore / Supabase-Profil.
import { supabase } from "@/lib/supabase";
import { create } from "zustand";

type UserState = {
  name: string | null;
  hasOnboarded: boolean;
  setName: (name: string) => Promise<void>;
  loadUser: () => Promise<void>;
};

export const useUserStore = create<UserState>((set) => ({
  name: null,
  hasOnboarded: false,

  setName: async (name) => {
    set({ name, hasOnboarded: true });

    // Name in Supabase-Profil speichern
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({ id: user.id, name });
        await supabase.auth.updateUser({ data: { name } });
      }
    } catch {}
  },

  loadUser: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Name aus Profil laden
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();

      const name = data?.name ?? user.user_metadata?.name ?? null;
      set({ name, hasOnboarded: !!name });
    } catch {}
  },
}));
