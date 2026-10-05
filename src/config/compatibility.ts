import { Platform } from 'react-native';

export interface DeviceCompatibility {
  isAndroid: boolean;
  isIOS: boolean;
  isTabletOrDesktopEligible: boolean;
  supportsTouch: boolean;
  supportsHardwareKeyboard: boolean;
}

export function getDeviceCompatibility(): DeviceCompatibility {
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  return {
    isAndroid,
    isIOS,
    isTabletOrDesktopEligible: true,
    supportsTouch: true,
    supportsHardwareKeyboard: isAndroid || isIOS,
  };
}
