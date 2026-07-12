import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getConfiguredApiBaseUrl } from "../api/client";

type SplashScreenProps = {
  message?: string;
};

export function SplashScreen({ message = "Starting Live TV..." }: SplashScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>TV</Text>
      </View>
      <Text style={styles.title}>Live TV</Text>
      <Text style={styles.subtitle}>{message}</Text>
      <ActivityIndicator color="#34d399" style={styles.spinner} />
      <Text style={styles.apiHint}>API: {getConfiguredApiBaseUrl()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070d",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2937",
    marginBottom: 20,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },
  spinner: {
    marginTop: 28,
  },
  apiHint: {
    position: "absolute",
    bottom: 24,
    color: "#4b5563",
    fontSize: 11,
  },
});
