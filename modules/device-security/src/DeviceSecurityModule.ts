import { NativeModule, requireOptionalNativeModule } from "expo";

import type { SecurityStatus } from "./DeviceSecurity.types";

declare class DeviceSecurityModule extends NativeModule {
  getSecurityStatus(): Promise<SecurityStatus>;
}

const DeviceSecurity = requireOptionalNativeModule<DeviceSecurityModule>(
  "DeviceSecurity",
);

export function isDeviceSecurityAvailable(): boolean {
  return DeviceSecurity != null;
}

export async function getDeviceSecurityStatus(): Promise<SecurityStatus> {
  if (!DeviceSecurity) {
    return {
      vpnActive: false,
      proxyActive: false,
      rootedOrJailbroken: false,
      blocked: false,
      reasons: [],
    };
  }

  return DeviceSecurity.getSecurityStatus();
}

export default DeviceSecurity;
