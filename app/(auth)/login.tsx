// app/(auth)/login.tsx
// Login, Registrierung + Apple Sign-In
// Apple Sign-In ist App-Store-Pflicht für Apps mit Login-System.
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "login" | "register";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, signInWithApple } = useAuthStore();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  // ── Email/Passwort Submit ──────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null);
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    if (isRegister && !name.trim()) {
      setError("Bitte deinen Namen eingeben.");
      return;
    }
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = isRegister
      ? await signUp(emailTrimmed, password, name.trim())
      : await signIn(emailTrimmed, password);

    setLoading(false);

    if (result.error) {
      setError(translateError(result.error));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  // ── Apple Sign-In ─────────────────────────────────────────────────────────
  async function handleAppleSignIn() {
    try {
      setAppleLoading(true);
      setError(null);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setError("Apple Sign-In fehlgeschlagen — kein Token erhalten.");
        setAppleLoading(false);
        return;
      }

      // fullName-Typ explizit auf das vereinfachte Interface casten
      const fullName = credential.fullName
        ? {
            firstName: credential.fullName.givenName,
            lastName: credential.fullName.familyName,
          }
        : null;
      const result = await signInWithApple(credential.identityToken, fullName);
      if (result.error) {
        setError(translateError(result.error));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      // ERR_CANCELED = Nutzer hat abgebrochen → kein Fehler zeigen
      if (e?.code !== "ERR_REQUEST_CANCELED") {
        setError("Apple Sign-In fehlgeschlagen.");
      }
    } finally {
      setAppleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Ionicons name="flash" size={32} color="#3b8995" />
          </View>
          <Text style={s.appName}>Vigor</Text>
          <Text style={s.tagline}>Dein persönlicher Alltags-Coach</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {isRegister ? "Konto erstellen" : "Willkommen zurück"}
          </Text>
          <Text style={s.cardSub}>
            {isRegister
              ? "Erstelle ein Konto um deine Daten sicher zu speichern."
              : "Melde dich an um auf deine Daten zuzugreifen."}
          </Text>

          {/* Apple Sign-In — nur auf iOS */}
          {Platform.OS === "ios" && (
            <>
              {appleLoading ? (
                <View style={s.appleLoading}>
                  <ActivityIndicator color="#000" />
                </View>
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={14}
                  style={s.appleBtn}
                  onPress={handleAppleSignIn}
                />
              )}

              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerTx}>oder</Text>
                <View style={s.dividerLine} />
              </View>
            </>
          )}

          {/* Name — nur bei Register */}
          {isRegister && (
            <Field
              label="Dein Name"
              value={name}
              onChangeText={setName}
              placeholder="Max Mustermann"
              icon="person-outline"
              autoComplete="name"
              textContentType="name"
            />
          )}

          <Field
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            placeholder="max@beispiel.de"
            icon="mail-outline"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCapitalize="none"
          />

          <Field
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            placeholder={isRegister ? "Mindestens 8 Zeichen" : "Dein Passwort"}
            icon="lock-closed-outline"
            secureTextEntry={!showPw}
            textContentType={isRegister ? "newPassword" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            rightElement={
              <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#94a3b8"
                />
              </Pressable>
            }
          />

          {/* Passwort vergessen — nur bei Login */}
          {!isRegister && (
            <Pressable
              onPress={() => router.push("/(auth)/reset-password" as any)}
              style={s.forgotBtn}
            >
              <Text style={s.forgotTx}>Passwort vergessen?</Text>
            </Pressable>
          )}

          {/* Error */}
          {error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={s.errorTx}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.btnTx}>
                {isRegister ? "Konto erstellen" : "Anmelden"}
              </Text>
            )}
          </Pressable>

          {/* Toggle */}
          <Pressable
            onPress={() => {
              setMode((m) => (m === "login" ? "register" : "login"));
              setError(null);
            }}
            style={s.toggleBtn}
          >
            <Text style={s.toggleTx}>
              {isRegister ? "Bereits ein Konto? " : "Noch kein Konto? "}
              <Text style={s.toggleLink}>
                {isRegister ? "Anmelden" : "Registrieren"}
              </Text>
            </Text>
          </Pressable>
        </View>

        <Text style={s.legalTx}>
          Mit der Nutzung stimmst du unserer Datenschutzerklärung zu.{"\n"}
          Gesundheitsdaten (Apple Health) verlassen niemals dein Gerät.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  rightElement,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  rightElement?: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={f.row}>
        <Ionicons name={icon} size={17} color="#94a3b8" />
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#cbd5e1"
          {...rest}
        />
        {rightElement}
      </View>
    </View>
  );
}

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "E-Mail oder Passwort falsch.";
  if (msg.includes("Email not confirmed"))
    return "Bitte bestätige zuerst deine E-Mail.";
  if (msg.includes("User already registered"))
    return "Diese E-Mail ist bereits registriert.";
  if (msg.includes("Password should be"))
    return "Passwort muss mindestens 8 Zeichen lang sein.";
  if (msg.includes("Unable to validate")) return "Ungültige E-Mail-Adresse.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Keine Internetverbindung.";
  return msg;
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, gap: 24 },
  logoWrap: { alignItems: "center", gap: 8, paddingBottom: 8 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#f0fbfc",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 14, color: "#64748b" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  cardSub: { fontSize: 13, color: "#64748b", lineHeight: 20, marginTop: -4 },
  appleBtn: { width: "100%", height: 50 },
  appleLoading: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerTx: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  forgotBtn: { alignSelf: "flex-end", marginTop: -8 },
  forgotTx: { fontSize: 13, color: "#3b8995", fontWeight: "600" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorTx: { flex: 1, fontSize: 13, color: "#dc2626" },
  btn: {
    backgroundColor: "#3b8995",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTx: { fontSize: 15, fontWeight: "700", color: "#fff" },
  toggleBtn: { alignItems: "center", paddingVertical: 4 },
  toggleTx: { fontSize: 13, color: "#64748b" },
  toggleLink: { color: "#3b8995", fontWeight: "700" },
  legalTx: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 17,
  },
});

const f = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, color: "#0f172a", padding: 0 },
});
