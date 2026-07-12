export type MobileStreamSource = {
  index: number;
  label: string;
  url: string;
  headers: Record<string, string>;
  useDash: boolean;
  drm?: {
    scheme?: string;
    licenseUrl?: string;
    clearKeys?: Record<string, string>;
    pssh?: string;
    licenseHeaders?: Record<string, string>;
  };
};

export type MobileChannel = {
  id: number;
  title: string;
  groupTitle: string | null;
  logo: string | null;
  channelKey: string | null;
  status: "live" | "offline";
  sources: MobileStreamSource[];
};

export type MobileChannelGroup = {
  groupTitle: string;
  channels: MobileChannel[];
};

export type MobileChannelsResponse = {
  channels: MobileChannel[];
  groups: MobileChannelGroup[];
  updatedAt: string;
};

export type MobileConfigResponse = {
  minVersion: string;
  forceUpdate: boolean;
  blockVpn: boolean;
  blockProxy: boolean;
  blockRootedDevices: boolean;
  securityRecheckIntervalMs: number;
};

export type AppScreen = "splash" | "blocked" | "home" | "player";
