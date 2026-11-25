/**
 * Device detection utilities for cross-platform support
 */

export const isMobileDevice = (): boolean => {
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check for mobile user agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  // Check viewport size (less than 768px width is typically mobile)
  const isSmallScreen = window.innerWidth < 768;
  
  return hasTouch && (isMobileUA || isSmallScreen);
};

export const isTabletDevice = (): boolean => {
  const tabletRegex = /iPad|Android/i;
  const isTabletUA = tabletRegex.test(navigator.userAgent);
  const isMediumScreen = window.innerWidth >= 768 && window.innerWidth < 1024;
  
  return isTabletUA && isMediumScreen;
};

export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getDevicePixelRatio = (): number => {
  return Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
};

export const isLowEndDevice = (): boolean => {
  // Check for device memory API (Chrome only)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory < 4) {
    return true;
  }
  
  // Fallback: check for hardware concurrency
  const cores = navigator.hardwareConcurrency || 2;
  return cores < 4;
};

export const getPerformanceTier = (): 'low' | 'medium' | 'high' => {
  if (isLowEndDevice()) return 'low';
  if (isMobileDevice()) return 'medium';
  return 'high';
};

export const supportsGamepad = (): boolean => {
  return 'getGamepads' in navigator;
};

export const getOrientation = (): 'portrait' | 'landscape' => {
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
};
