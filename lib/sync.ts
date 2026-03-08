// lib/sync.ts
// Zentrale Sync-Logik für alle Stores.
// Prinzip: Offline-first — lokal immer sofort, Supabase im Hintergrund.
// Sicherheit:
//   - RLS:         Jeder User sieht nur eigene Zeilen (Supabase)
//   - HTTPS:       Alle Requests TLS-verschlüsselt (Supabase Default)
//   - Disk:        Supabase Cloud = AES-256 at-rest Encryption (Default)
//   - Tokens:      Auth-Token im iOS Keychain via expo-secure-store
//   - HealthKit:   Daten verlassen NIEMALS das Gerät (nur lokal genutzt)

import { supabase } from "@/lib/supabase";

// ─── Aktuellen eingeloggten User holen ───────────────────────────────────────
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ─── Generischer Upsert (Insert oder Update) ─────────────────────────────────
export async function syncUpsert(
  table: string,
  rows: object | object[]
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return; // Nicht eingeloggt — kein Sync, kein Fehler

    const data = Array.isArray(rows) ? rows : [rows];
    const { error } = await supabase
      .from(table)
      .upsert(data, { onConflict: "id" });

    if (error) console.warn(`[sync] upsert ${table}:`, error.message);
  } catch (e: any) {
    // Offline oder Netzwerkfehler — still fail, lokal ist gespeichert
    console.warn(`[sync] ${table} offline:`, e?.message ?? e);
  }
}

// ─── Generisches Delete ───────────────────────────────────────────────────────
export async function syncDelete(table: string, id: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) console.warn(`[sync] delete ${table}:`, error.message);
  } catch (e: any) {
    console.warn(`[sync] delete ${table} offline:`, e?.message ?? e);
  }
}

// ─── Generisches Laden von Supabase ──────────────────────────────────────────
export async function syncLoad<T>(
  table: string,
  transform: (row: any) => T
): Promise<T[] | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) return null;
    return data.map(transform);
  } catch {
    return null;
  }
}

// ─── Single-Row Load (für Stats, Config) ─────────────────────────────────────
export async function syncLoadSingle<T>(
  table: string,
  transform: (row: any) => T
): Promise<T | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return null;
    return transform(data);
  } catch {
    return null;
  }
}

// ─── Single-Row Upsert (für Stats, Config) ───────────────────────────────────
export async function syncUpsertSingle(
  table: string,
  data: object
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from(table)
      .upsert({ ...data, user_id: user.id });

    if (error) console.warn(`[sync] upsert single ${table}:`, error.message);
  } catch (e: any) {
    console.warn(`[sync] upsertSingle ${table} offline:`, e?.message ?? e);
  }
}

// ─── Lokale Daten zu Supabase migrieren (einmalig nach Login) ────────────────
// Wird aufgerufen wenn User sich einloggt und Cloud-Daten leer sind.
export async function migrateLocalToSupabase(
  table: string,
  rows: object[]
): Promise<void> {
  if (!rows.length) return;
  try {
    const user = await getCurrentUser();
    if (!user) return;

    await supabase
      .from(table)
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  } catch (e: any) {
    console.warn(`[sync] migration ${table}:`, e?.message ?? e);
  }
}
