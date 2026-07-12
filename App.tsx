import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";

import {
  fetchMobileChannels,
  fetchMobileConfig,
} from "./src/api/client";
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

  const security = useSecurityGate(securityPolicy);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    setChannelError(null);

    try {
      const response = await fetchMobileChannels();
      setGroups(response.groups);
    } catch {
      setChannelError("Could not load channels. Check API URL and server.");
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
    if (security.checking) {
      setScreen("splash");
      return;
    }

    if (security.blocked) {
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
    if (security.checking) {
      return "Checking device security...";
    }
    if (loadingChannels && groups.length === 0) {
      return "Loading channels...";
    }
    return "Starting Live TV...";
  }, [groups.length, loadingChannels, security.checking]);

  return (
    <>
      <StatusBar style="light" />
      {screen === "splash" ? <SplashScreen message={splashMessage} /> : null}
      {screen === "blocked" ? (
        <BlockedScreen reasons={security.reasons} onRetry={security.recheck} />
      ) : null}
      {screen === "home" ? (
        <HomeScreen
          groups={groups}
          loading={loadingChannels}
          error={channelError}
          onRefresh={() => {
            void loadChannels();
          }}
          onSelectChannel={(channel) => {
            void security.recheck().then((result) => {
              if (!result.blocked) {
                setSelectedChannel(channel);
              }
            });
          }}
        />
      ) : null}
      {screen === "player" && selectedChannel ? (
        <PlayerScreen
          channel={selectedChannel}
          onBack={() => setSelectedChannel(null)}
        />
      ) : null}
    </>
  );
}
