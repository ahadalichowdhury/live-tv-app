import { Pressable, StyleSheet, Text, View } from "react-native";

import type { SecurityReason } from "device-security";

const REASON_COPY: Record<SecurityReason, { title: string; body: string }> = {
  vpn: {
    title: "VPN detected",
    body: "Turn off your VPN, then reopen the app.",
  },
  proxy: {
    title: "Proxy detected",
    body: "Remove Wi-Fi or system proxy settings, then reopen the app.",
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
  const primary = reasons[0] ?? "unavailable";
  const copy = REASON_COPY[primary];

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
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
    backgroundColor: "#05070d",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 72,
    fontSize: 36,
    fontWeight: "800",
    color: "#f87171",
    backgroundColor: "#1f1315",
    marginBottom: 20,
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    color: "#9ca3af",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 12,
  },
  extra: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
  button: {
    marginTop: 28,
    backgroundColor: "#10b981",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#04120d",
    fontSize: 15,
    fontWeight: "700",
  },
});
