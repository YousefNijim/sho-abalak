// Minimal type stub so ui-components tsc passes without reanimated installed at root.
// The real package is resolved from each app's node_modules at runtime.
declare module 'react-native-reanimated' {
  import { ComponentType, RefAttributes } from 'react';
  import { ViewStyle } from 'react-native';

  export function useSharedValue<T>(init: T): { value: T };
  export function useAnimatedStyle(fn: () => ViewStyle): any;
  export function withSpring(value: number, config?: object): number;

  export const createAnimatedComponent: <T extends ComponentType<any>>(
    component: T
  ) => T;

  namespace Animated {
    export const createAnimatedComponent: typeof createAnimatedComponent;
  }
  export default Animated;
}
