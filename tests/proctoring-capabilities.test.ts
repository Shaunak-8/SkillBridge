import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildEnvironment, detectEnvironment, detectInAppBrowser } from '@/lib/proctoring/capabilities';

const UA = {
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 330.0.0.0.0 Android',
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Instagram 330.0.0.0.0',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.0;]',
  facebookIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 [FBAN/FBIOS;FBAV/450.0;FBBV/1;FBDV/iPhone15,2]',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 12; moto g; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36',
  iosWebView:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90',
  line: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Safari Line/14.8.0',
  wechat:
    'Mozilla/5.0 (Linux; Android 13; Pixel 8 Build/TQ3A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.40',
  snapchat:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.0.0.0',
  tiktok:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 musical_ly_33.0.0 BytedanceWebview/d8a21c6',
};

const caps = { canCamera: true, canFullscreen: true, canWakeLock: true };

describe('detectInAppBrowser', () => {
  it.each([
    ['instagramAndroid', 'Instagram'],
    ['instagramIos', 'Instagram'],
    ['facebookAndroid', 'Facebook'],
    ['facebookIos', 'Facebook'],
    ['line', 'Line'],
    ['wechat', 'WeChat'],
    ['snapchat', 'Snapchat'],
    ['tiktok', 'TikTok'],
  ] as const)('flags %s as %s', (key, name) => {
    expect(detectInAppBrowser(UA[key])).toBe(name);
  });

  it('flags a plain Android WebView (; wv) and an iOS WebView without Safari/', () => {
    expect(detectInAppBrowser(UA.androidWebView)).not.toBeNull();
    expect(detectInAppBrowser(UA.iosWebView)).not.toBeNull();
  });

  it.each(['chromeAndroid', 'iosSafari', 'iosChrome', 'desktopChrome'] as const)(
    'does not flag normal browser %s',
    (key) => {
      expect(detectInAppBrowser(UA[key])).toBeNull();
    },
  );
});

describe('buildEnvironment', () => {
  it('desktop: strict thresholds and fullscreen when supported', () => {
    const env = buildEnvironment({ ...caps, userAgent: UA.desktopChrome, coarsePointer: false, viewportWidth: 1440 });
    expect(env.isMobile).toBe(false);
    expect(env.profile).toEqual({
      isMobile: false,
      noFaceGraceMs: 3000,
      hiddenGraceMs: 2000,
      fps: 5,
      requireFullscreen: true,
    });
  });

  it('desktop without fullscreen support does not require it', () => {
    const env = buildEnvironment({
      ...caps,
      canFullscreen: false,
      userAgent: UA.desktopChrome,
      coarsePointer: false,
      viewportWidth: 1440,
    });
    expect(env.profile.requireFullscreen).toBe(false);
  });

  it('phone (coarse pointer): lenient thresholds, never requires fullscreen', () => {
    const env = buildEnvironment({ ...caps, userAgent: UA.chromeAndroid, coarsePointer: true, viewportWidth: 412 });
    expect(env.isMobile).toBe(true);
    expect(env.profile).toEqual({
      isMobile: true,
      noFaceGraceMs: 5000,
      hiddenGraceMs: 2000,
      fps: 2.5,
      requireFullscreen: false,
    });
  });

  it('small viewport alone counts as mobile; coarse-pointer tablet too', () => {
    expect(
      buildEnvironment({ ...caps, userAgent: UA.desktopChrome, coarsePointer: false, viewportWidth: 420 }).isMobile,
    ).toBe(true);
    expect(
      buildEnvironment({ ...caps, userAgent: UA.iosSafari, coarsePointer: true, viewportWidth: 1024 }).isMobile,
    ).toBe(true);
  });

  it('carries in-app detection and capability flags through', () => {
    const env = buildEnvironment({
      canCamera: false,
      canFullscreen: false,
      canWakeLock: false,
      userAgent: UA.instagramAndroid,
      coarsePointer: true,
      viewportWidth: 390,
    });
    expect(env).toMatchObject({ inAppBrowser: 'Instagram', canCamera: false, canWakeLock: false });
  });
});

describe('detectEnvironment (stubbed browser)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads capabilities from the browser globals', () => {
    vi.stubGlobal('navigator', { userAgent: UA.iosSafari, mediaDevices: { getUserMedia: vi.fn() } });
    vi.stubGlobal('window', { innerWidth: 390, isSecureContext: true, matchMedia: () => ({ matches: true }) });
    vi.stubGlobal('document', { fullscreenEnabled: false, documentElement: {} });
    expect(detectEnvironment()).toMatchObject({
      isMobile: true,
      canCamera: true,
      canFullscreen: false,
      canWakeLock: false,
      inAppBrowser: null,
    });
  });

  it('reports no camera on insecure contexts and without mediaDevices', () => {
    vi.stubGlobal('navigator', { userAgent: UA.desktopChrome, mediaDevices: { getUserMedia: vi.fn() } });
    vi.stubGlobal('window', { innerWidth: 1280, isSecureContext: false, matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('document', { fullscreenEnabled: true, documentElement: { requestFullscreen: vi.fn() } });
    expect(detectEnvironment().canCamera).toBe(false);
    vi.stubGlobal('navigator', { userAgent: UA.desktopChrome });
    expect(detectEnvironment().canCamera).toBe(false);
  });

  it('does not throw outside a browser', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    expect(detectEnvironment().canCamera).toBe(false);
  });
});
