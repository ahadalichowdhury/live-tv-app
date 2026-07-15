import { Animated } from "react-native";

export const MOTION = {
  screenEnter: 300,
  screenExit: 260,
  channelDim: 180,
  channelReveal: 320,
} as const;

export function animateOpacity(
  value: Animated.Value,
  toValue: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    Animated.timing(value, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        resolve();
      }
    });
  });
}
