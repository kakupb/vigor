// store/authStore.ts
// Auth-Store: Email/Passwort + Apple Sign-In + Konto löschen
// Token-Speicherung: iOS Keychain via expo-secure-store (in lib/supabase.ts konfiguriert)
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthReady: boolean;

  initialize: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signInWithApple: (
    identityToken: string,
    fullName?: { firstName?: string | null; lastName?: string | null } | null
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  updateName: (name: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthReady: false,

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isAuthReady: true,
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, isAuthReady: true });
    });
  },

  signUp: async (email, password, name) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // @ts-ignore — Supabase erlaubt data, Typ-Definition ist veraltet
          data: { name },
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? "Unbekannter Fehler" };
    }
  },

  signIn: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? "Unbekannter Fehler" };
    }
  },

  // Apple Sign-In: identityToken kommt von expo-apple-authentication
  signInWithApple: async (identityToken, fullName) => {
    try {
      const name =
        [fullName?.firstName, fullName?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || undefined;

      // options.data wird von SignInWithIdTokenCredentials nicht unterstützt —
      // Name wird stattdessen nach dem Login direkt ins Profil geschrieben.
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: identityToken,
      });
      if (error) return { error: error.message };

      // Name in Profil speichern falls vorhanden
      if (name) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").upsert({ id: user.id, name });
          // Auch in user_metadata für Kompatibilität
          // @ts-ignore
          await supabase.auth.updateUser({ data: { name } });
        }
      }
      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? "Apple Sign-In fehlgeschlagen" };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  // Sendet eine Reset-E-Mail an den Nutzer
  resetPassword: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: "vigor://reset-password", // Deep Link — muss in app.json konfiguriert sein
        }
      );
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? "Fehler beim Senden der E-Mail" };
    }
  },

  // Löscht alle Nutzerdaten und das Konto unwiderruflich
  // Läuft über eine Supabase Edge Function (account-delete) die server-seitig ausgeführt wird
  deleteAccount: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: "Nicht eingeloggt" };

      // Alle Daten des Users löschen (CASCADE via RLS übernimmt den Rest)
      await Promise.all([
        supabase.from("habits").delete().eq("user_id", user.id),
        supabase.from("planner_entries").delete().eq("user_id", user.id),
        supabase.from("notes").delete().eq("user_id", user.id),
        supabase.from("focus_sessions").delete().eq("user_id", user.id),
        supabase.from("focus_stats").delete().eq("user_id", user.id),
        supabase.from("health_metrics_config").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);

      // Auth-User löschen (braucht Service-Role — via Edge Function)
      const { error } = await supabase.functions.invoke("delete-user");
      if (error) {
        // Fallback: ausloggen und lokal bereinigen
        console.warn(
          "[auth] deleteAccount edge function error:",
          error.message
        );
      }

      await supabase.auth.signOut();
      set({ user: null, session: null });
      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? "Fehler beim Löschen" };
    }
  },

  updateName: async (name) => {
    const user = get().user;
    if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id, name });
    await supabase.auth.updateUser({ data: { name } });
  },
}));
