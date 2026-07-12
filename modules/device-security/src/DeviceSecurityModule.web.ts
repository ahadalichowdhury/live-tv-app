import { registerWebModule, NativeModule } from "expo";

import type { SecurityStatus } from "./DeviceSecurity.types";

class DeviceSecurityModule extends NativeModule {
  async getSecurityStatus(): Promise<SecurityStatus> {
    return {
      vpnActive: false,
      proxyActive: false,
      rootedOrJailbroken: false,
      blocked: false,
      reasons: [],
    };
  }
}

export default registerWebModule(DeviceSecurityModule, "DeviceSecurity");
