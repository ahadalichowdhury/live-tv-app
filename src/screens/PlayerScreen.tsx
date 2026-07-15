import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import * as ScreenOrientation from "expo-screen-orientation";

import type { MobileChannel, MobileStreamSource } from "../types";

type PlayerScreenProps = {
  channel: MobileChannel;
  onBack: () => void;
};

function buildVideoSource(source: MobileStreamSource): VideoSource {
  const headers = Object.keys(source.headers).length ? source.headers : undefined;
  const videoSource: VideoSource = {
    uri: source.url,
    headers,
  };

  if (source.url.includes(".m3u8")) {
    videoSource.contentType = "hls";
  }

  return videoSource;
}

export function PlayerScreen({ channel, onBack }: PlayerScreenProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeSource = channel.sources[sourceIndex] ?? channel.sources[0];

  const videoSource = useMemo(() => {
    if (!activeSource) {
      return null;
    }

    return buildVideoSource(activeSource);
  }, [activeSource]);

  const player = useVideoPlayer(null, (instance) => {
    instance.play();
  });

  useEffect(() => {
    if (!videoSource) {
      return;
    }

    setLoading(true);
    setError(null);

    void player.replaceAsync(videoSource).then(() => {
      player.play();
    });
  }, [player, videoSource]);

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status === "readyToPlay") {
      setLoading(false);
      setError(null);
      return;
    }

    if (status === "error") {
      setLoading(false);
      setError("Playback failed. Try another source.");
    }
  });

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  if (!activeSource || !videoSource) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No playable source found.</Text>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        nativeControls
        contentFit="contain"
      />

      <View style={styles.overlayTop}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{channel.title}</Text>
          <Text style={styles.subtitle}>{activeSource.label}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centeredOverlay}>
          <ActivityIndicator color="#34d399" size="large" />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {channel.sources.length > 1 ? (
        <View style={styles.sourceBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  video: {
    flex: 1,
  },
  overlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: "#d1d5db",
    fontSize: 12,
    marginTop: 2,
  },
  centeredOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  errorBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 88,
    backgroundColor: "rgba(127,29,29,0.92)",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: "#fecaca",
    textAlign: "center",
  },
  sourceBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  sourceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    marginRight: 8,
  },
  sourceChipActive: {
    backgroundColor: "#10b981",
  },
  sourceChipText: {
    color: "#d1d5db",
    fontWeight: "600",
  },
  sourceChipTextActive: {
    color: "#04120d",
  },
});
