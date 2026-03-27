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

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Mindestens 8 Zeichen.";
  if (!/[A-Z]/.test(pw)) return "Mindestens ein Großbuchstabe.";
  if (!/[0-9]/.test(pw)) return "Mindestens eine Zahl.";
  return null;
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

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
  ].filter(Boolean).length;
  const colors = ["#ef4444", "#f59e0b", "#22c55e"];
  const labels = ["Schwach", "Mittel", "Stark"];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ flex: 1, flexDirection: "row", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor:
                i < score ? colors[score - 1] : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: colors[score - 1] ?? "#64748b",
          minWidth: 36,
        }}
      >
        {labels[score - 1] ?? ""}
      </Text>
    </View>
  );
}

function Req({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons
        name={met ? "checkmark-circle" : "ellipse-outline"}
        size={13}
        color={met ? "#22c55e" : "rgba(255,255,255,0.2)"}
      />
      <Text
        style={{
          fontSize: 12,
          color: met ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

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
    <View style={{ gap: 6 }}>
      <Text style={f.label}>{label}</Text>
      <View style={f.row}>
        <Ionicons name={icon} size={16} color="rgba(255,255,255,0.2)" />
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.15)"
          {...rest}
        />
        {rightElement}
      </View>
    </View>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "800",
          color: "#fff",
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.3)",
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithApple } = useAuthStore();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const tabAnim = useRef(new Animated.Value(0)).current;
  const isRegister = mode === "register";

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    setError("");
    Animated.spring(tabAnim, {
      toValue: m === "login" ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
    Haptics.selectionAsync();
  }

  async function handleSubmit() {
    setError("");
    if (isRegister) {
      const pwErr = validatePassword(password);
      if (pwErr) {
        setError(pwErr);
        return;
      }
      if (!email.trim()) {
        setError("E-Mail fehlt.");
        return;
      }
    }
    setLoading(true);
    try {
      const result = isRegister
        ? await signUp(
            email.trim().toLowerCase(),
            password,
            username.trim() || email.split("@")[0]
          )
        : await signIn(email.trim().toLowerCase(), password);
      if (result.error) {
        setError(translateError(result.error));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    try {
      setAppleLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
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
      } else
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e?.code !== "ERR_REQUEST_CANCELED")
        setError("Apple Sign-In fehlgeschlagen.");
    } finally {
      setAppleLoading(false);
    }
  }

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
        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.logoRow}>
            <View style={s.logoMark}>
              <Ionicons name="timer" size={20} color="#3b8995" />
            </View>
            <Text style={s.logoText}>VIGOR</Text>
          </View>
          <Text style={s.tagline}>Dein Study Companion</Text>
          <Text style={s.taglineSub}>Fokussiert. Jeden Tag.</Text>

          {/* Mini-Stat-Karte */}
          <View style={s.statsCard}>
            <StatPill value="25min" label="Pomodoro" />
            <View style={s.statDiv} />
            <StatPill value="Streak 🔥" label="täglich" />
            <View style={s.statDiv} />
            <StatPill value="−∞" label="YouTube" />
          </View>
        </View>

        {/* ── Tabs ── */}
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
                        outputRange: [0, 148],
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

        {/* ── Form ── */}
        <View style={s.form}>
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
              <View style={s.divRow}>
                <View style={s.divLine} />
                <Text style={s.divTx}>oder mit E-Mail</Text>
                <View style={s.divLine} />
              </View>
            </>
          )}

          {isRegister && (
            <Field
              label="NAME"
              value={username}
              onChangeText={setUsername}
              placeholder="Wie heißt du?"
              icon="person-outline"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
          )}

          <Field
            label="E-MAIL"
            value={email}
            onChangeText={setEmail}
            placeholder="du@beispiel.de"
            icon="mail-outline"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCapitalize="none"
          />

          <Field
            label="PASSWORT"
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
                  color="rgba(255,255,255,0.25)"
                />
              </Pressable>
            }
          />

          {isRegister && password.length > 0 && (
            <View style={{ gap: 8, marginTop: -4 }}>
              <PasswordStrength password={password} />
              <View style={{ gap: 4 }}>
                <Req met={password.length >= 8} text="Mindestens 8 Zeichen" />
                <Req met={/[A-Z]/.test(password)} text="Ein Großbuchstabe" />
                <Req met={/[0-9]/.test(password)} text="Eine Zahl" />
              </View>
            </View>
          )}

          {!isRegister && (
            <Pressable
              onPress={() => router.push("/(auth)/reset-password" as any)}
              style={{ alignSelf: "flex-end", marginTop: -4 }}
            >
              <Text
                style={{ fontSize: 13, color: "#3b8995", fontWeight: "500" }}
              >
                Passwort vergessen?
              </Text>
            </Pressable>
          )}

          {error ? (
            <View style={s.errBox}>
              <Ionicons name="alert-circle-outline" size={15} color="#f87171" />
              <Text style={s.errTx}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.btnTx}>
                {isRegister ? "Konto erstellen" : "Einloggen & fokussieren"}
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={s.legal}>
          Mit der Nutzung stimmst du unserer Datenschutzerklärung zu.{"\n"}
          Gesundheitsdaten verlassen niemals dein Gerät.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const f = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.28)",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, color: "#e2e8f0", padding: 0 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080d16" },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  hero: { alignItems: "center", marginBottom: 36, gap: 8 },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(59,137,149,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,137,149,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 5,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  taglineSub: { fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: -4 },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    width: "100%",
  },
  statDiv: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.08)" },

  tabWrap: { marginBottom: 24 },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
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
  tabBtn: { flex: 1, paddingVertical: 11, alignItems: "center", zIndex: 1 },
  tabTx: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.3)" },
  tabTxActive: { color: "#fff" },

  form: { gap: 16 },
  appleBtn: { height: 52, width: "100%", borderRadius: 14 },
  appleLoading: {
    height: 52,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  divRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.07)" },
  divTx: { fontSize: 12, color: "rgba(255,255,255,0.2)", fontWeight: "500" },
  errBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
    borderRadius: 10,
    padding: 12,
  },
  errTx: { flex: 1, fontSize: 13, color: "#f87171" },
  btn: {
    backgroundColor: "#3b8995",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 4,
  },
  btnTx: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.2 },
  legal: {
    fontSize: 11,
    color: "rgba(255,255,255,0.14)",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 28,
  },
});
