export type SecurityReason = "vpn" | "proxy" | "root" | "jailbreak" | "unavailable";

export type SecurityStatus = {
  vpnActive: boolean;
  proxyActive: boolean;
  rootedOrJailbroken: boolean;
  blocked: boolean;
  reasons: SecurityReason[];
};

export type SecurityPolicy = {
  blockVpn: boolean;
  blockProxy: boolean;
  blockRootedDevices: boolean;
};

export function evaluateSecurityStatus(
  status: SecurityStatus,
  policy: SecurityPolicy,
): { blocked: boolean; reasons: SecurityReason[] } {
  const reasons: SecurityReason[] = [];

  if (policy.blockVpn && status.vpnActive) {
    reasons.push("vpn");
  }
  if (policy.blockProxy && status.proxyActive) {
    reasons.push("proxy");
  }
  if (policy.blockRootedDevices && status.rootedOrJailbroken) {
    reasons.push(
      status.reasons.includes("jailbreak") ? "jailbreak" : "root",
    );
  }

  return {
    blocked: reasons.length > 0,
    reasons,
  };
}
