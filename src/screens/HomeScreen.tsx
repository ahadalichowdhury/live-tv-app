import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { MobileChannel, MobileChannelGroup } from "../types";

type HomeScreenProps = {
  groups: MobileChannelGroup[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelectChannel: (channel: MobileChannel) => void;
};

function ChannelCard({
  channel,
  onPress,
}: {
  channel: MobileChannel;
  onPress: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(channel.logo && !logoFailed);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardLogoWrap}>
        {showLogo ? (
          <Image
            source={{ uri: channel.logo! }}
            style={styles.cardLogo}
            resizeMode="contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Text style={styles.cardFallback}>
            {channel.title.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {channel.title}
      </Text>
      <Text style={styles.cardMeta}>
        {channel.sources.length > 1
          ? `${channel.sources.length} sources`
          : channel.status === "live"
            ? "Live"
            : "Offline"}
      </Text>
    </Pressable>
  );
}

export function HomeScreen({
  groups,
  loading,
  error,
  onRefresh,
  onSelectChannel,
}: HomeScreenProps) {
  const sections = useMemo(
    () =>
      groups.map((group) => ({
        title: group.groupTitle,
        data: group.channels,
      })),
    [groups],
  );

  if (loading && sections.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#34d399" size="large" />
        <Text style={styles.loadingText}>Loading channels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live TV</Text>
          <Text style={styles.headerSubtitle}>Direct play from your phone</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#34d399" />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.data.map((channel) => (
                <View key={channel.id} style={styles.gridItem}>
                  <ChannelCard
                    channel={channel}
                    onPress={() => onSelectChannel(channel)}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No channels yet</Text>
            <Text style={styles.emptyBody}>
              Add channels in the admin panel, then pull to refresh.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070d",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1f2937",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#d1d5db",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  gridItem: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 12,
    minHeight: 148,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#1f2937",
  },
  cardLogoWrap: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardLogo: {
    width: "100%",
    height: 56,
  },
  cardFallback: {
    color: "#9ca3af",
    fontSize: 24,
    fontWeight: "800",
  },
  cardTitle: {
    color: "#f9fafb",
    fontSize: 13,
    fontWeight: "700",
    minHeight: 36,
  },
  cardMeta: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: "#9ca3af",
    marginTop: 12,
  },
  error: {
    color: "#f87171",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  emptyBody: {
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
