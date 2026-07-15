import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../theme";
import type { MobileChannel, MobileChannelGroup } from "../types";

type HomeScreenProps = {
  groups: MobileChannelGroup[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelectChannel: (channel: MobileChannel) => void;
};

function ChannelTile({
  channel,
  onPress,
}: {
  channel: MobileChannel;
  onPress: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(channel.logo && !logoFailed);

  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={styles.tileLogoRing}>
        {showLogo ? (
          <Image
            source={{ uri: channel.logo! }}
            style={styles.tileLogo}
            resizeMode="contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Text style={styles.tileFallback}>
            {channel.title.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={styles.tileTitle} numberOfLines={2}>
        {channel.title}
      </Text>
      {channel.status === "live" ? (
        <View style={styles.tileLiveRow}>
          <View style={styles.tileLiveDot} />
          <Text style={styles.tileLiveText}>Live</Text>
        </View>
      ) : (
        <Text style={styles.tileMeta}>Offline</Text>
      )}
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
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const allChannels = useMemo(
    () => groups.flatMap((group) => group.channels),
    [groups],
  );

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return groups
      .filter((group) => !activeGroup || group.groupTitle === activeGroup)
      .map((group) => ({
        ...group,
        channels: group.channels.filter((channel) => {
          if (!normalizedQuery) {
            return true;
          }

          return (
            channel.title.toLowerCase().includes(normalizedQuery) ||
            group.groupTitle.toLowerCase().includes(normalizedQuery)
          );
        }),
      }))
      .filter((group) => group.channels.length > 0);
  }, [activeGroup, groups, query]);

  const groupNames = useMemo(
    () => groups.map((group) => group.groupTitle),
    [groups],
  );

  if (loading && groups.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Loading your guide...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <Text style={styles.brand}>Showfy</Text>
        <Text style={styles.heroSubtitle}>
          {allChannels.length} channels ready to watch
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search channels or categories"
          placeholderTextColor={colors.textDim}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          style={[styles.filterChip, !activeGroup && styles.filterChipActive]}
          onPress={() => setActiveGroup(null)}
        >
          <Text
            style={[
              styles.filterChipText,
              !activeGroup && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>
        {groupNames.map((name) => (
          <Pressable
            key={name}
            style={[
              styles.filterChip,
              activeGroup === name && styles.filterChipActive,
            ]}
            onPress={() => setActiveGroup(name)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeGroup === name && styles.filterChipTextActive,
              ]}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.groupTitle}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, spacing.xxl) },
        ]}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.groupTitle}</Text>
              <Text style={styles.sectionCount}>{section.channels.length}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowContent}
            >
              {section.channels.map((channel) => (
                <ChannelTile
                  key={channel.id}
                  channel={channel}
                  onPress={() => onSelectChannel(channel)}
                />
              ))}
            </ScrollView>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No channels found</Text>
            <Text style={styles.emptyBody}>
              Try another search or pull down to refresh.
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
    backgroundColor: colors.bg,
  },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  brand: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  searchWrap: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 36,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  filterChipText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  filterChipTextActive: {
    color: colors.text,
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionCount: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "700",
  },
  rowContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  tile: {
    width: 118,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileLogoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileLogo: {
    width: 52,
    height: 52,
  },
  tileFallback: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: "800",
  },
  tileTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 34,
    textAlign: "center",
  },
  tileLiveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  tileLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.live,
    marginRight: 6,
  },
  tileLiveText: {
    color: colors.live,
    fontSize: 11,
    fontWeight: "700",
  },
  tileMeta: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    minHeight: 280,
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  emptyBody: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
