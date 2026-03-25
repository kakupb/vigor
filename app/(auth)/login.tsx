// app/(auth)/login.tsx
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

// ─── Passwort-Validierung ────────────────────────────────────────────────────
function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Mindestens 8 Zeichen.";
  if (!/[A-Z]/.test(pw)) return "Mindestens ein Großbuchstabe erforderlich.";
  if (!/[0-9]/.test(pw)) return "Mindestens eine Zahl erforderlich.";
  return null;
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const score = [hasLength, hasUpper, hasNumber].filter(Boolean).length;

  const bars = [
    score >= 1
      ? score === 1
        ? "#ef4444"
        : score === 2
        ? "#f59e0b"
        : "#22c55e"
      : "#2a2a3a",
    score >= 2 ? (score === 2 ? "#f59e0b" : "#22c55e") : "#2a2a3a",
    score >= 3 ? "#22c55e" : "#2a2a3a",
  ];

  const label = score === 1 ? "Schwach" : score === 2 ? "Mittel" : "Stark";
  const labelColor =
    score === 1 ? "#ef4444" : score === 2 ? "#f59e0b" : "#22c55e";

  return (
    <View style={pw.wrap}>
      <View style={pw.bars}>
        {bars.map((c, i) => (
          <View key={i} style={[pw.bar, { backgroundColor: c }]} />
        ))}
      </View>
      <Text style={[pw.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

// ─── Anforderungs-Chip ────────────────────────────────────────────────────────
function Req({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={req.row}>
      <Ionicons
        name={met ? "checkmark-circle" : "ellipse-outline"}
        size={13}
        color={met ? "#22c55e" : "#4a4a5a"}
      />
      <Text style={[req.txt, met && req.met]}>{text}</Text>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, signInWithApple } = useAuthStore();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabAnim = useRef(new Animated.Value(0)).current;

  const isRegister = mode === "register";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    Animated.spring(tabAnim, {
      toValue: next === "login" ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }

  // ── Email/Passwort Submit ──────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null);
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    if (isRegister && !username.trim()) {
      setError("Bitte einen Benutzernamen eingeben.");
      return;
    }
    if (isRegister) {
      const pwError = validatePassword(password);
      if (pwError) {
        setError(pwError);
        return;
      }
    } else if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = isRegister
      ? await signUp(emailTrimmed, password, username.trim())
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
      if (e?.code !== "ERR_REQUEST_CANCELED")
        setError("Apple Sign-In fehlgeschlagen.");
    } finally {
      setAppleLoading(false);
    }
  }

  // Tab-Indikator Breite (~halbe Breite minus Padding)
  const tabTranslate = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1], // wird in % via calc gehandled
  });

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.logoMark}>
            <Ionicons name="flash" size={22} color="#3b8995" />
          </View>
          <Text style={s.heroTitle}>VIGOR</Text>
          <Text style={s.heroSub}>Dein persönlicher Alltags-Coach</Text>
        </View>

        {/* ── Tab-Switcher ──────────────────────────────────────── */}
        <View style={s.tabWrap}>
          <View style={s.tabTrack}>
            <Animated.View
              style={[
                s.tabIndicator,
                {
                  transform: [
                    {
                      translateX: tabAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 148], // halbe Breite der Leiste
                      }),
                    },
                  ],
                },
              ]}
            />
            <Pressable style={s.tabBtn} onPress={() => switchMode("login")}>
              <Text style={[s.tabTx, mode === "login" && s.tabTxActive]}>
                Anmelden
              </Text>
            </Pressable>
            <Pressable style={s.tabBtn} onPress={() => switchMode("register")}>
              <Text style={[s.tabTx, mode === "register" && s.tabTxActive]}>
                Registrieren
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Form ─────────────────────────────────────────────── */}
        <View style={s.form}>
          {/* Apple Sign-In */}
          {Platform.OS === "ios" && (
            <>
              {appleLoading ? (
                <View style={s.appleLoading}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  }
                  cornerRadius={14}
                  style={s.appleBtn}
                  onPress={handleAppleSignIn}
                />
              )}
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerTx}>oder mit E-Mail</Text>
                <View style={s.dividerLine} />
              </View>
            </>
          )}

          {/* Benutzername — nur bei Register */}
          {isRegister && (
            <DarkField
              label="Benutzername"
              value={username}
              onChangeText={setUsername}
              placeholder="z. B. fitmax99"
              icon="at-outline"
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
            />
          )}

          <DarkField
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            placeholder="du@beispiel.de"
            icon="mail-outline"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCapitalize="none"
          />

          <DarkField
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            placeholder={
              isRegister
                ? "Mind. 8 Zeichen, 1 Großbuchstabe, 1 Zahl"
                : "Dein Passwort"
            }
            icon="lock-closed-outline"
            secureTextEntry={!showPw}
            textContentType={isRegister ? "newPassword" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            rightElement={
              <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10}>
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#6a6a7a"
                />
              </Pressable>
            }
          />

          {/* Passwort-Stärke + Anforderungen */}
          {isRegister && password.length > 0 && (
            <View style={s.reqWrap}>
              <PasswordStrength password={password} />
              <View style={s.reqList}>
                <Req met={password.length >= 8} text="Mindestens 8 Zeichen" />
                <Req met={/[A-Z]/.test(password)} text="Ein Großbuchstabe" />
                <Req met={/[0-9]/.test(password)} text="Eine Zahl" />
              </View>
            </View>
          )}

          {/* Passwort vergessen */}
          {!isRegister && (
            <Pressable
              onPress={() => router.push("/(auth)/reset-password" as any)}
              style={s.forgotBtn}
            >
              <Text style={s.forgotTx}>Passwort vergessen?</Text>
            </Pressable>
          )}

          {/* Fehlermeldung */}
          {error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color="#f87171" />
              <Text style={s.errorTx}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.82 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0a0a14" />
            ) : (
              <Text style={s.btnTx}>
                {isRegister ? "Konto erstellen" : "Anmelden"}
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={s.legalTx}>
          Mit der Nutzung stimmst du unserer Datenschutzerklärung zu.{"\n"}
          Gesundheitsdaten verlassen niemals dein Gerät.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Dark Field ───────────────────────────────────────────────────────────────
function DarkField({
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
        <Ionicons name={icon} size={16} color="#4a4a5a" style={f.icon} />
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#3a3a4a"
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
  if (msg.includes("not enabled") || msg.includes("provider"))
    return "Apple-Anmeldung ist gerade nicht verfügbar.";
  return msg;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a14" },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  // Hero
  hero: { alignItems: "center", marginBottom: 36, gap: 8 },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#111120",
    borderWidth: 1,
    borderColor: "#1e2a2e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#f0f4f8",
    letterSpacing: 6,
  },
  heroSub: {
    fontSize: 13,
    color: "#4a5568",
    letterSpacing: 0.5,
  },

  // Tab switcher
  tabWrap: { marginBottom: 28 },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: "#111120",
    borderRadius: 14,
    padding: 4,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    width: "50%",
    bottom: 4,
    backgroundColor: "#3b8995",
    borderRadius: 11,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    zIndex: 1,
  },
  tabTx: { fontSize: 14, fontWeight: "600", color: "#4a5568" },
  tabTxActive: { color: "#fff" },

  // Form area
  form: { gap: 16 },

  // Apple
  appleBtn: { height: 52, width: "100%", borderRadius: 14 },
  appleLoading: {
    height: 52,
    backgroundColor: "#fff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  // Divider
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1a1a2a" },
  dividerTx: { fontSize: 12, color: "#3a3a4a", fontWeight: "500" },

  // Requirements
  reqWrap: { gap: 8, marginTop: -4 },
  reqList: { gap: 4 },

  // Forgot
  forgotBtn: { alignSelf: "flex-end", marginTop: -4 },
  forgotTx: { fontSize: 13, color: "#3b8995", fontWeight: "500" },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1f0a0a",
    borderWidth: 1,
    borderColor: "#3f1a1a",
    borderRadius: 10,
    padding: 12,
  },
  errorTx: { flex: 1, fontSize: 13, color: "#f87171" },

  // Button
  btn: {
    backgroundColor: "#3b8995",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  btnTx: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.3 },

  // Legal
  legalTx: {
    fontSize: 11,
    color: "#2a2a3a",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 28,
  },
});

const f = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4a5568",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111120",
    borderWidth: 1,
    borderColor: "#1a1a2a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  icon: {},
  input: {
    flex: 1,
    fontSize: 15,
    color: "#e2e8f0",
    padding: 0,
  },
});

const pw = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  bars: { flexDirection: "row", gap: 4, flex: 1 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: 12, fontWeight: "600", minWidth: 40, textAlign: "right" },
});

const req = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  txt: { fontSize: 12, color: "#3a3a4a" },
  met: { color: "#4a5568" },
});
