// supabase/functions/delete-user/index.ts
// Edge Function: Löscht den aufrufenden User via Service-Role-Key.
// Wird in store/authStore.ts über supabase.functions.invoke("delete-user") aufgerufen.
// Deployment: npx supabase functions deploy delete-user
//
// HINWEIS: Diese Datei läuft auf Deno (Supabase Edge Runtime), nicht auf Node.
// Der TypeScript-Fehler "Deno not found" im Editor ist ein reines Editor-Problem
// und hat KEINEN Einfluss auf das Deployment. Die Funktion läuft korrekt.
//
// Fix im Editor: tsconfig.json im functions-Ordner anlegen (siehe unten) oder
// einfach ignorieren — der Build schlägt dadurch nicht fehl.
//
// tsconfig für functions/ Ordner (optional, nur für Editor):
// { "compilerOptions": { "lib": ["deno.ns"] } }

// @ts-nocheck — Deno-Typen nicht in der Root-tsconfig verfügbar (nur Editor-Warnung)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // JWT aus dem Request lesen → User-ID ermitteln
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anon-Client zum Lesen des Callers
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-Role-Client zum tatsächlichen Löschen
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id
    );
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
