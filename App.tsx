import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as ExpoSplashScreen from "expo-splash-screen";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  fetchMobileChannels,
  fetchMobileConfig,
} from "./src/api/client";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { BlockedScreen } from "./src/screens/BlockedScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { PlayerScreen } from "./src/screens/PlayerScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { useSecurityGate } from "./src/security/useSecurityGate";
import type { AppScreen, MobileChannel, MobileChannelGroup } from "./src/types";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("splash");
  const [groups, setGroups] = useState<MobileChannelGroup[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<MobileChannel | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [securityPolicy, setSecurityPolicy] = useState({
    blockVpn: true,
    blockProxy: true,
    blockRootedDevices: true,
  });
  const [recheckIntervalMs, setRecheckIntervalMs] = useState(30_000);
  const initialBootDone = useRef(false);

  const security = useSecurityGate(securityPolicy);

  useEffect(() => {
    void ExpoSplashScreen.preventAutoHideAsync();
  }, []);

  useEffect(() => {
    if (security.checking && !initialBootDone.current) {
      return;
    }

    void ExpoSplashScreen.hideAsync();
  }, [security.checking, screen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void ExpoSplashScreen.hideAsync();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    setChannelError(null);

    try {
      const response = await fetchMobileChannels();
      setGroups(response.groups);
    } catch {
      setChannelError("Could not load channels. Check your connection.");
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const config = await fetchMobileConfig();
      setSecurityPolicy({
        blockVpn: config.blockVpn,
        blockProxy: config.blockProxy,
        blockRootedDevices: config.blockRootedDevices,
      });
      setRecheckIntervalMs(config.securityRecheckIntervalMs);
    } catch {
      // Keep defaults when config endpoint is unavailable.
    }

    await loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (security.checking && !initialBootDone.current) {
      setScreen("splash");
      return;
    }

    if (!security.checking) {
      initialBootDone.current = true;
    }

    if (security.blocked) {
      setSelectedChannel(null);
      setScreen("blocked");
      return;
    }

    if (selectedChannel) {
      setScreen("player");
      return;
    }

    setScreen("home");
  }, [security.blocked, security.checking, selectedChannel]);

  useEffect(() => {
    if (security.checking || security.blocked) {
      return;
    }

    void bootstrap();
  }, [bootstrap, security.blocked, security.checking]);

  useEffect(() => {
    if (security.blocked || screen === "blocked" || screen === "splash") {
      return;
    }

    const timer = setInterval(() => {
      void security.recheck();
    }, recheckIntervalMs);

    return () => clearInterval(timer);
  }, [recheckIntervalMs, screen, security]);

  const splashMessage = useMemo(() => {
    if (security.checking && !initialBootDone.current) {
      return "Checking device security...";
    }
    if (loadingChannels && groups.length === 0) {
      return "Loading channels...";
    }
    return "Preparing your guide...";
  }, [groups.length, loadingChannels, security.checking]);

  const handleSelectChannel = useCallback(
    (channel: MobileChannel) => {
      void security.recheck().then((result) => {
        if (!result.blocked) {
          setSelectedChannel(channel);
        }
      });
    },
    [security],
  );

  const handleLeavePlayer = useCallback(() => {
    setSelectedChannel(null);
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary onReset={handleLeavePlayer}>
        <StatusBar style="light" />
        {screen === "splash" ? <SplashScreen message={splashMessage} /> : null}
        {screen === "blocked" ? (
          <BlockedScreen reasons={security.reasons} onRetry={security.recheck} />
        ) : null}
        {screen === "home" || screen === "player" ? (
          <View style={styles.mainStage}>
            <HomeScreen
              groups={groups}
              loading={loadingChannels}
              error={channelError}
              onRefresh={() => {
                void loadChannels();
              }}
              onSelectChannel={handleSelectChannel}
            />
            {screen === "player" && selectedChannel ? (
              <View style={styles.playerOverlay}>
                <PlayerScreen
                  channel={selectedChannel}
                  groups={groups}
                  onSelectChannel={handleSelectChannel}
                  onBack={handleLeavePlayer}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainStage: {
    flex: 1,
  },
  playerOverlay: {
    ...StyleSheet.absoluteFill,
  },
});
