import { NativeModule, requireNativeModule } from "expo";

import type { SecurityStatus } from "./DeviceSecurity.types";

declare class DeviceSecurityModule extends NativeModule {
  getSecurityStatus(): Promise<SecurityStatus>;
}

export default requireNativeModule<DeviceSecurityModule>("DeviceSecurity");
