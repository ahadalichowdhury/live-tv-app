import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../theme";
import type { SecurityReason } from "device-security";

const REASON_COPY: Record<SecurityReason, { title: string; body: string }> = {
  vpn: {
    title: "VPN detected",
    body: "Turn off your VPN, then tap check again.",
  },
  proxy: {
    title: "Proxy detected",
    body: "Remove Wi-Fi or system proxy settings, then try again.",
  },
  root: {
    title: "Modified device",
    body: "This app cannot run on rooted Android devices.",
  },
  jailbreak: {
    title: "Modified device",
    body: "This app cannot run on jailbroken iOS devices.",
  },
  unavailable: {
    title: "Security check failed",
    body: "Rebuild the app with the native security module enabled.",
  },
};

type BlockedScreenProps = {
  reasons: SecurityReason[];
  onRetry: () => void;
};

export function BlockedScreen({ reasons, onRetry }: BlockedScreenProps) {
  const insets = useSafeAreaInsets();
  const primary = reasons[0] ?? "unavailable";
  const copy = REASON_COPY[primary];

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.iconShell}>
        <Text style={styles.icon}>!</Text>
      </View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      {reasons.length > 1 ? (
        <Text style={styles.extra}>
          Additional checks: {reasons.slice(1).join(", ")}
        </Text>
      ) : null}
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Check again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  iconShell: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 107, 107, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.28)",
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.danger,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: spacing.md,
  },
  extra: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.xxl,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
