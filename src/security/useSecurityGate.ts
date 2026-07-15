import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import {
  evaluateSecurityStatus,
  getDeviceSecurityStatus,
  type SecurityReason,
  type SecurityPolicy,
} from "device-security";

export type SecurityBlockState = {
  blocked: boolean;
  reasons: SecurityReason[];
};

const defaultPolicy: SecurityPolicy = {
  blockVpn: true,
  blockProxy: true,
  blockRootedDevices: true,
};

export function useSecurityGate(policy: SecurityPolicy = defaultPolicy) {
  const [state, setState] = useState<SecurityBlockState>({
    blocked: false,
    reasons: [],
  });
  const [checking, setChecking] = useState(true);
  const policyRef = useRef(policy);

  useEffect(() => {
    policyRef.current = policy;
  }, [policy]);

  const runCheck = useCallback(
    async (options?: { silent?: boolean }): Promise<SecurityBlockState> => {
    if (Platform.OS === "web") {
      const cleared = { blocked: false, reasons: [] as SecurityReason[] };
      setState(cleared);
      setChecking(false);
      return cleared;
    }

    if (!options?.silent) {
      setChecking(true);
    }

    try {
      const status = await getDeviceSecurityStatus();
      const result = evaluateSecurityStatus(status, policyRef.current);
      setState(result);
      return result;
    } catch {
      const failed = {
        blocked: true,
        reasons: ["unavailable"] as SecurityReason[],
      };
      setState(failed);
      return failed;
    } finally {
      if (!options?.silent) {
        setChecking(false);
      }
    }
  },
    [],
  );

  useEffect(() => {
    void runCheck();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void runCheck({ silent: true });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [runCheck]);

  return {
    checking,
    blocked: state.blocked,
    reasons: state.reasons,
    recheck: () => runCheck({ silent: true }),
  };
}
