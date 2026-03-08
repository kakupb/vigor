// app/(auth)/reset-password.tsx
// Schickt eine Passwort-Reset-E-Mail via Supabase.
// Nach Erhalt der E-Mail kommt der Nutzer per Deep-Link zurück in die App.
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type State = "idle" | "loading" | "sent" | "error";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetPassword } = useAuthStore();

  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setErrMsg("Bitte eine gültige E-Mail eingeben.");
      setState("error");
      return;
    }

    setState("loading");
    const { error } = await resetPassword(trimmed);

    if (error) {
      setErrMsg(error);
      setState("error");
    } else {
      setState("sent");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          s.root,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Back */}
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#3b8995" />
          <Text style={s.backTx}>Zurück</Text>
        </Pressable>

        <View style={s.content}>
          <View style={s.iconWrap}>
            <Ionicons name="lock-open-outline" size={40} color="#3b8995" />
          </View>

          {state === "sent" ? (
            <>
              <Text style={s.title}>E-Mail verschickt!</Text>
              <Text style={s.desc}>
                Wir haben dir einen Link an{" "}
                <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                  {email.trim()}
                </Text>{" "}
                geschickt.{"\n\n"}
                Öffne die E-Mail und tippe auf den Link um ein neues Passwort zu
                setzen.
                {"\n\n"}
                Kein E-Mail erhalten? Prüfe deinen Spam-Ordner.
              </Text>

              <Pressable onPress={() => router.back()} style={s.btn}>
                <Text style={s.btnTx}>Zurück zum Login</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.title}>Passwort zurücksetzen</Text>
              <Text style={s.desc}>
                Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link zum
                Zurücksetzen deines Passworts.
              </Text>

              <View style={s.inputRow}>
                <Ionicons name="mail-outline" size={17} color="#94a3b8" />
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (state === "error") setState("idle");
                  }}
                  placeholder="deine@email.de"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
              </View>

              {state === "error" && (
                <View style={s.errBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={15}
                    color="#dc2626"
                  />
                  <Text style={s.errTx}>{errMsg}</Text>
                </View>
              )}

              <Pressable
                onPress={handleSend}
                disabled={state === "loading"}
                style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
              >
                {state === "loading" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.btnTx}>Link senden</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 32,
  },
  backTx: { fontSize: 15, fontWeight: "600", color: "#3b8995" },
  content: { flex: 1, gap: 20 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#f0fbfc",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  desc: { fontSize: 14, color: "#64748b", lineHeight: 22 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, color: "#0f172a", padding: 0 },
  errBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errTx: { flex: 1, fontSize: 13, color: "#dc2626" },
  btn: {
    backgroundColor: "#3b8995",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTx: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
