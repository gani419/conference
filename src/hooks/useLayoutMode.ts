import { useWindowDimensions } from 'react-native';

export type LayoutMode = 'mobile' | 'tablet' | 'chromebook' | 'compact' | 'medium' | 'expanded';

export interface LayoutInfo {
  mode: LayoutMode;
  width: number;
  height: number;
  isCompact: boolean;
  isTablet: boolean;
  isChromebook: boolean;
  isLandscape: boolean;
}

export function useLayoutMode(): LayoutInfo {
  const { width, height } = useWindowDimensions();

  let mode: LayoutMode = 'mobile';
  if (width >= 1024) {
    mode = 'chromebook';
  } else if (width >= 600) {
    mode = 'tablet';
  }

  return {
    mode,
    width,
    height,
    isCompact: mode === 'mobile',
    isTablet: mode === 'tablet',
    isChromebook: mode === 'chromebook',
    isLandscape: width > height,
  };
}
