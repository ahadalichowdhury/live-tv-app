import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../theme";

type SplashScreenProps = {
  message?: string;
};

export function SplashScreen({ message = "Preparing your guide..." }: SplashScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.glow} />
      <View style={styles.logoShell}>
        <Text style={styles.logoMark}>▶</Text>
      </View>
      <Text style={styles.brand}>Showfy</Text>
      <Text style={styles.subtitle}>{message}</Text>
      <ActivityIndicator color={colors.accent} style={styles.spinner} />
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
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentSoft,
    top: "28%",
  },
  logoShell: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  logoMark: {
    color: colors.accent,
    fontSize: 34,
    fontWeight: "900",
  },
  brand: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  spinner: {
    marginTop: spacing.xxl,
  },
});
