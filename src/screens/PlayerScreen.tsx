import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useEventListener } from "expo";
import * as NavigationBar from "expo-navigation-bar";
import { setStatusBarHidden } from "expo-status-bar";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import * as ScreenOrientation from "expo-screen-orientation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../theme";
import { MOTION, animateOpacity } from "../utils/motion";
import type { MobileChannel, MobileChannelGroup, MobileStreamSource } from "../types";

type PlayerScreenProps = {
  channel: MobileChannel;
  groups: MobileChannelGroup[];
  onSelectChannel: (channel: MobileChannel) => void;
  onBack: () => void;
};

const CONTROLS_HIDE_MS = 4000;
const SEEK_SECONDS = 10;

function normalizeStreamHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const lower = key.toLowerCase();
    if (lower === "referer" || lower === "referrer" || lower === "http-referrer") {
      normalized.Referer = trimmed;
      continue;
    }
    if (lower === "user-agent" || lower === "useragent" || lower === "http-user-agent") {
      normalized["User-Agent"] = trimmed;
      continue;
    }

    normalized[key] = trimmed;
  }

  return normalized;
}

function isHlsUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes(".m3u8") || lower.includes("/hls/");
}

function buildVideoSource(source: MobileStreamSource): VideoSource {
  const headers = normalizeStreamHeaders(source.headers);
  const videoSource: VideoSource = {
    uri: source.url,
  };

  if (Object.keys(headers).length > 0) {
    videoSource.headers = headers;
  }

  if (isHlsUrl(source.url)) {
    videoSource.contentType = "hls";
  }

  return videoSource;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function PlayGlyph() {
  return (
    <View style={styles.playGlyph}>
      <View style={styles.playTriangle} />
    </View>
  );
}

function PauseGlyph() {
  return (
    <View style={styles.pauseGlyph}>
      <View style={styles.pauseBar} />
      <View style={styles.pauseBar} />
    </View>
  );
}

function SeekBackGlyph() {
  return (
    <View style={styles.seekGlyph}>
      <Text style={styles.seekArrow}>↺</Text>
      <Text style={styles.seekLabel}>{SEEK_SECONDS}</Text>
    </View>
  );
}

function SeekForwardGlyph() {
  return (
    <View style={styles.seekGlyph}>
      <Text style={styles.seekArrow}>↻</Text>
      <Text style={styles.seekLabel}>{SEEK_SECONDS}</Text>
    </View>
  );
}

function FullscreenGlyph({ expanded }: { expanded: boolean }) {
  return (
    <Text style={styles.toolbarIcon}>{expanded ? "⤢" : "⤡"}</Text>
  );
}

function CategoryChannelRow({
  channel,
  active,
  onPress,
}: {
  channel: MobileChannel;
  active: boolean;
  onPress: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(channel.logo && !logoFailed);

  return (
    <Pressable
      style={[styles.channelRow, active && styles.channelRowActive]}
      onPress={onPress}
    >
      <View style={[styles.channelLogoWrap, active && styles.channelLogoWrapActive]}>
        {showLogo ? (
          <Image
            source={{ uri: channel.logo! }}
            style={styles.channelLogo}
            resizeMode="contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Text style={styles.channelLogoFallback}>
            {channel.title.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      <View style={styles.channelCopy}>
        <Text
          style={[styles.channelRowTitle, active && styles.channelRowTitleActive]}
          numberOfLines={1}
        >
          {channel.title}
        </Text>
        {channel.status === "live" ? (
          <View style={styles.channelLiveRow}>
            <View style={styles.channelLiveDot} />
            <Text style={styles.channelLiveText}>Live</Text>
          </View>
        ) : (
          <Text style={styles.channelOfflineText}>Offline</Text>
        )}
      </View>

      {active ? <Text style={styles.nowPlayingBadge}>Now</Text> : null}
    </Pressable>
  );
}

export function PlayerScreen({
  channel,
  groups,
  onSelectChannel,
  onBack,
}: PlayerScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const videoOpacity = useRef(new Animated.Value(1)).current;
  const loadingPulse = useRef(new Animated.Value(0)).current;

  const activeSource = channel.sources[sourceIndex] ?? channel.sources[0];

  const resolvedCategory = useMemo(() => {
    if (activeCategory && groups.some((group) => group.groupTitle === activeCategory)) {
      return activeCategory;
    }

    if (
      channel.groupTitle &&
      groups.some((group) => group.groupTitle === channel.groupTitle)
    ) {
      return channel.groupTitle;
    }

    return groups[0]?.groupTitle ?? null;
  }, [activeCategory, channel.groupTitle, groups]);

  const categoryChannels = useMemo(() => {
    if (!resolvedCategory) {
      return [];
    }

    return groups.find((group) => group.groupTitle === resolvedCategory)?.channels ?? [];
  }, [groups, resolvedCategory]);

  const videoSource = useMemo(() => {
    if (!activeSource) {
      return null;
    }

    return buildVideoSource(activeSource);
  }, [activeSource]);

  const player = useVideoPlayer(null);

  const portraitVideoHeight = Math.round(screenWidth * (9 / 16));
  const shouldImmerse = isFullscreen && !controlsVisible;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setControlsVisible(false);
      }
    }, CONTROLS_HIDE_MS);
  }, [clearHideTimer]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  const hideControls = useCallback(() => {
    clearHideTimer();
    setControlsVisible(false);
  }, [clearHideTimer]);

  const onScreenTap = useCallback(() => {
    if (controlsVisible) {
      hideControls();
      return;
    }

    showControls();
  }, [controlsVisible, hideControls, showControls]);

  const togglePlayback = useCallback(() => {
    showControls();

    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, showControls]);

  const seekBy = useCallback(
    (seconds: number) => {
      showControls();
      player.seekBy(seconds);
    },
    [player, showControls],
  );

  const toggleFullscreen = useCallback(async () => {
    showControls();

    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
        () => undefined,
      );
      setIsFullscreen(false);
      return;
    }

    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
      () => undefined,
    );
    setIsFullscreen(true);
  }, [isFullscreen, showControls]);

  const handleBack = useCallback(() => {
    if (isExiting) {
      return;
    }

    setIsExiting(true);

    try {
      player.pause();
    } catch {
      // Player may already be released.
    }

    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
      () => undefined,
    );

    void animateOpacity(screenOpacity, 0, MOTION.screenExit).then(() => {
      onBack();
    });
  }, [isExiting, onBack, player, screenOpacity]);

  useEffect(() => {
    isMountedRef.current = true;
    void animateOpacity(screenOpacity, 1, MOTION.screenEnter);

    return () => {
      isMountedRef.current = false;
      clearHideTimer();

      try {
        player.pause();
      } catch {
        // Ignore cleanup errors.
      }
    };
  }, [clearHideTimer, player, screenOpacity]);

  useEffect(() => {
    setSourceIndex(0);
  }, [channel.id]);

  useEffect(() => {
    if (channel.groupTitle) {
      setActiveCategory(channel.groupTitle);
    }
  }, [channel.groupTitle]);

  useEffect(() => {
    if (!videoSource) {
      return;
    }

    void animateOpacity(videoOpacity, 0.42, MOTION.channelDim);
    setLoading(true);
    setError(null);
    setControlsVisible(false);

    void player
      .replaceAsync(videoSource)
      .then(() => {
        if (isMountedRef.current) {
          player.play();
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setLoading(false);
          void animateOpacity(videoOpacity, 1, MOTION.channelReveal);
          setError("Playback failed. Try another source.");
          showControls();
        }
      });
  }, [player, showControls, videoOpacity, videoSource]);

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status === "readyToPlay") {
      setLoading(false);
      setError(null);
      void animateOpacity(videoOpacity, 1, MOTION.channelReveal);
      showControls();
      return;
    }

    if (status === "error") {
      setLoading(false);
      void animateOpacity(videoOpacity, 1, MOTION.channelReveal);
      setError("Playback failed. Try another source.");
      showControls();
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying: playing }) => {
    setIsPlaying(playing);
  });

  useEventListener(player, "timeUpdate", ({ currentTime: time }) => {
    setCurrentTime(time);
    setDuration(player.duration);
  });

  useEffect(() => {
    if (!loading) {
      loadingPulse.stopAnimation();
      loadingPulse.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(loadingPulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [loading, loadingPulse]);

  useEffect(() => {
    void setStatusBarHidden(shouldImmerse, "fade");

    if (Platform.OS === "android") {
      void NavigationBar.setVisibilityAsync(shouldImmerse ? "hidden" : "visible");
    }
  }, [shouldImmerse]);

  useEffect(() => {
    void ScreenOrientation.unlockAsync().catch(() => undefined);

    return () => {
      void setStatusBarHidden(false, "fade");
      if (Platform.OS === "android") {
        void NavigationBar.setVisibilityAsync("visible");
      }
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
        () => undefined,
      );
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (controlsVisible) {
        hideControls();
        return true;
      }

      handleBack();
      return true;
    });

    return () => subscription.remove();
  }, [controlsVisible, handleBack, hideControls]);

  if (!activeSource || !videoSource) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No playable source found.</Text>
        <Pressable style={styles.fallbackBack} onPress={handleBack}>
          <Text style={styles.fallbackBackText}>Back to channels</Text>
        </Pressable>
      </View>
    );
  }

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 1;
  const showSeekBar = duration > 0 && Number.isFinite(duration);

  const bottomPanel = controlsVisible ? (
    <View
      style={[
        styles.bottomPanel,
        styles.bottomPanelOverlay,
        {
          paddingBottom: isFullscreen
            ? Math.max(insets.bottom, spacing.md)
            : spacing.sm,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.progressRow}>
        {showSeekBar ? (
          <>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: progress }]} />
              <View style={{ flex: 1 - progress }} />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </>
        ) : (
          <>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: 1 }]} />
            </View>
          </>
        )}
      </View>

      <View style={styles.toolbar}>
        <Pressable style={styles.toolbarButton} onPress={togglePlayback}>
          {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
        </Pressable>

        {channel.sources.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sourceList}
          >
            {channel.sources.map((source: MobileStreamSource) => {
              const active = source.index === sourceIndex;
              return (
                <Pressable
                  key={`${channel.id}-${source.index}`}
                  style={[styles.sourceChip, active && styles.sourceChipActive]}
                  onPress={() => {
                    setSourceIndex(source.index);
                    setError(null);
                    setLoading(true);
                    showControls();
                  }}
                >
                  <Text
                    style={[
                      styles.sourceChipText,
                      active && styles.sourceChipTextActive,
                    ]}
                  >
                    {source.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.sourceHint} numberOfLines={1}>
            {activeSource.label}
          </Text>
        )}

        <Pressable style={styles.toolbarButton} onPress={toggleFullscreen}>
          <FullscreenGlyph expanded={isFullscreen} />
        </Pressable>
      </View>
    </View>
  ) : null;

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <View
        style={[
          styles.playerFrame,
          isFullscreen
            ? styles.playerFrameFullscreen
            : {
                height: portraitVideoHeight + insets.top,
                marginTop: insets.top,
              },
        ]}
      >
        <Animated.View style={[styles.videoLayer, { opacity: videoOpacity }]}>
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={false}
            contentFit="contain"
          />
        </Animated.View>

        <Pressable style={styles.tapLayer} onPress={onScreenTap} />

        {controlsVisible ? (
          <>
            <View
              style={[
                styles.topOverlay,
                { paddingTop: isFullscreen ? Math.max(insets.top, spacing.sm) : spacing.sm },
              ]}
              pointerEvents="box-none"
            >
              <Pressable
                style={styles.iconButton}
                onPress={handleBack}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close player"
              >
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>

              <Text style={styles.title} numberOfLines={1}>
                {channel.title}
              </Text>

              <View style={styles.iconButtonPlaceholder} />
            </View>

            <View style={styles.centerOverlay} pointerEvents="box-none">
              <Pressable
                style={styles.seekButton}
                onPress={() => seekBy(-SEEK_SECONDS)}
                hitSlop={12}
              >
                <SeekBackGlyph />
              </Pressable>

              <Pressable
                style={styles.centerPlayButton}
                onPress={togglePlayback}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
              </Pressable>

              <Pressable
                style={styles.seekButton}
                onPress={() => seekBy(SEEK_SECONDS)}
                hitSlop={12}
              >
                <SeekForwardGlyph />
              </Pressable>
            </View>
          </>
        ) : null}

        {loading ? (
          <Animated.View
            style={[styles.bufferingOverlay, { opacity: loadingPulse }]}
            pointerEvents="none"
          >
            <ActivityIndicator color="#ffffff" size="large" />
          </Animated.View>
        ) : null}

        {bottomPanel}
      </View>

      {!isFullscreen && groups.length > 0 ? (
        <View
          style={[
            styles.channelPanel,
            { paddingBottom: Math.max(insets.bottom, spacing.sm) },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabsScroll}
            contentContainerStyle={styles.categoryTabs}
          >
            {groups.map((group) => {
              const active = group.groupTitle === resolvedCategory;
              return (
                <Pressable
                  key={group.groupTitle}
                  style={[styles.categoryTab, active && styles.categoryTabActive]}
                  onPress={() => setActiveCategory(group.groupTitle)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      active && styles.categoryTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {group.groupTitle}
                  </Text>
                  <Text
                    style={[
                      styles.categoryTabCount,
                      active && styles.categoryTabCountActive,
                    ]}
                  >
                    {group.channels.length}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.channelPanelHeader}>
            <Text style={styles.channelPanelTitle}>{resolvedCategory}</Text>
            <Text style={styles.channelPanelCount}>
              {categoryChannels.length} channels
            </Text>
          </View>

          <FlatList
            data={categoryChannels}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            style={styles.channelList}
            contentContainerStyle={styles.channelListContent}
            ListEmptyComponent={
              <Text style={styles.channelEmptyText}>No channels in this category.</Text>
            }
            renderItem={({ item }) => (
              <CategoryChannelRow
                channel={item}
                active={item.id === channel.id}
                onPress={() => {
                  if (item.id === channel.id) {
                    return;
                  }

                  hideControls();
                  onSelectChannel(item);
                }}
              />
            )}
          />
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorBanner, { bottom: Math.max(insets.bottom, spacing.lg) + 72 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  playerFrame: {
    width: "100%",
    backgroundColor: "#000000",
    overflow: "hidden",
    position: "relative",
  },
  playerFrameFullscreen: {
    flex: 1,
  },
  video: {
    ...StyleSheet.absoluteFill,
  },
  videoLayer: {
    ...StyleSheet.absoluteFill,
  },
  tapLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  closeIcon: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "300",
  },
  title: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
    pointerEvents: "box-none",
  },
  seekButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  seekGlyph: {
    alignItems: "center",
    justifyContent: "center",
  },
  seekArrow: {
    color: "#ffffff",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "700",
  },
  seekLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: -2,
  },
  centerPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  playGlyph: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#ffffff",
  },
  pauseGlyph: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pauseBar: {
    width: 5,
    height: 20,
    borderRadius: 1,
    backgroundColor: "#ffffff",
  },
  bottomPanel: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bottomPanelOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  channelPanel: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  categoryTabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryTabs: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    maxWidth: 200,
  },
  categoryTabActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  categoryTabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  categoryTabTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  categoryTabCount: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: spacing.xs,
    minWidth: 22,
    height: 22,
    lineHeight: 22,
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 11,
    overflow: "hidden",
  },
  categoryTabCountActive: {
    color: colors.accent,
    backgroundColor: "rgba(91, 140, 255, 0.18)",
  },
  channelPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  channelPanelTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  channelPanelCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  channelList: {
    flex: 1,
  },
  channelListContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  channelEmptyText: {
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xl,
    fontSize: 13,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: "transparent",
  },
  channelRowActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  channelLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  channelLogoWrapActive: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  channelLogo: {
    width: 36,
    height: 36,
  },
  channelLogoFallback: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  channelCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  channelRowTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  channelRowTitleActive: {
    color: colors.text,
    fontWeight: "700",
  },
  channelLiveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  channelLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.live,
    marginRight: 5,
  },
  channelLiveText: {
    color: colors.live,
    fontSize: 11,
    fontWeight: "700",
  },
  channelOfflineText: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  nowPlayingBadge: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  timeText: {
    color: "#d7dbe8",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    minWidth: 40,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 52,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.live,
    marginRight: 6,
  },
  liveText: {
    color: colors.live,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    flexDirection: "row",
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarIcon: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  sourceList: {
    flexGrow: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  sourceHint: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  sourceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  sourceChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  sourceChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  sourceChipTextActive: {
    color: colors.text,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    zIndex: 10,
  },
  errorBanner: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(88, 20, 28, 0.94)",
    borderRadius: radius.md,
    padding: spacing.md,
    zIndex: 30,
  },
  errorText: {
    color: "#ffd5db",
    textAlign: "center",
  },
  fallbackBack: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignSelf: "center",
  },
  fallbackBackText: {
    color: colors.text,
    fontWeight: "700",
  },
});
