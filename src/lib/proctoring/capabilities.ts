import { DESKTOP_PROFILE, MOBILE_MAX_VIEWPORT_WIDTH, MOBILE_PROFILE } from './constants';
import type { Environment } from './types';

/** Raw browser facts. Separated from detection so it can be tested without a browser. */
export interface EnvironmentSource {
  userAgent: string;
  coarsePointer: boolean;
  viewportWidth: number;
  canCamera: boolean;
  canFullscreen: boolean;
  canWakeLock: boolean;
}

const IN_APP_PATTERNS: Array<[string, RegExp]> = [
  ['Instagram', /Instagram/i],
  ['Facebook', /FBAN|FBAV|FB_IAB|FBIOS/i],
  ['Line', /\bLine\//i],
  ['WeChat', /MicroMessenger/i],
  ['Snapchat', /Snapchat/i],
  ['TikTok', /TikTok|musical_ly|BytedanceWebview/i],
  ['LinkedIn', /LinkedInApp/i],
  ['WhatsApp', /WhatsApp/i],
  // Android System WebView: "...; wv) ..." in the UA.
  ['an in-app browser', /;\s*wv\)/i],
];

/**
 * Returns the in-app browser name or null. iOS WKWebView apps omit "Safari/" from the UA,
 * whereas Safari, Chrome (CriOS) and Firefox (FxiOS) on iOS all include it.
 */
export function detectInAppBrowser(userAgent: string): string | null {
  for (const [name, pattern] of IN_APP_PATTERNS) {
    if (pattern.test(userAgent)) return name;
  }
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);
  if (isIos && !/Safari\//i.test(userAgent)) return 'an in-app browser';
  return null;
}

/** Capability based, not UA sniffing: coarse primary pointer or a small viewport means phone. */
export function buildEnvironment(source: EnvironmentSource): Environment {
  const isMobile = source.coarsePointer || source.viewportWidth < MOBILE_MAX_VIEWPORT_WIDTH;
  const base = isMobile ? MOBILE_PROFILE : DESKTOP_PROFILE;
  return {
    isMobile,
    inAppBrowser: detectInAppBrowser(source.userAgent),
    canCamera: source.canCamera,
    canFullscreen: source.canFullscreen,
    canWakeLock: source.canWakeLock,
    profile: { ...base, requireFullscreen: !isMobile && source.canFullscreen },
  };
}

export function readBrowserSource(): EnvironmentSource {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const win = typeof window === 'undefined' ? undefined : window;
  const doc = typeof document === 'undefined' ? undefined : document;
  return {
    userAgent: nav?.userAgent ?? '',
    coarsePointer: Boolean(win?.matchMedia?.('(pointer: coarse)').matches),
    viewportWidth: win?.innerWidth ?? Number.POSITIVE_INFINITY,
    canCamera: Boolean(nav?.mediaDevices?.getUserMedia) && win?.isSecureContext !== false,
    canFullscreen: Boolean(doc?.fullscreenEnabled && doc.documentElement?.requestFullscreen),
    canWakeLock: Boolean(nav && 'wakeLock' in nav),
  };
}

export function detectEnvironment(): Environment {
  return buildEnvironment(readBrowserSource());
}
