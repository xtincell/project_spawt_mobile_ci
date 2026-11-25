import { useEffect, useSyncExternalStore } from 'react';
import pinnedRelease from '../../scripts/android-release.json';

const repository = 'xtincell/spawt-ci-mobile-v1-mvp';
export const ANDROID_CHANNEL_URL = `https://raw.githubusercontent.com/${repository}/android-releases/latest.json`;
export type AndroidRelease = typeof pinnedRelease;
export const FALLBACK_ANDROID_RELEASE: AndroidRelease = {
  ...pinnedRelease,
  url: `/downloads/${pinnedRelease.fileName}`,
};

export function parseAndroidRelease(value: unknown, channel: 'public' | 'pilot' = 'public'): AndroidRelease | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (item.schemaVersion !== 1 || item.packageName !== 'com.upgraders.spawt'
    || typeof item.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(item.version)
    || typeof item.build !== 'number' || !Number.isSafeInteger(item.build) || item.build < pinnedRelease.build
    || typeof item.buildDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.buildDate)
    || typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256)
    || typeof item.sourceCommit !== 'string' || !/^[a-f0-9]{40}$/.test(item.sourceCommit)
    || typeof item.bytes !== 'number' || !Number.isSafeInteger(item.bytes) || item.bytes <= 0) return null;
  const fileName = `spawt-${item.version}-build${item.build}.apk`;
  const url = channel === 'pilot' ? `/pilot-delivery/${fileName}`
    : `https://github.com/${repository}/releases/download/local-build-android-${item.buildDate}-${item.build}/${fileName}`;
  if (item.fileName !== fileName || item.url !== url) return null;
  return { version: item.version, build: item.build, sha256: item.sha256, sourceCommit: item.sourceCommit, bytes: item.bytes, fileName, url };
}

const localPilot = import.meta.env.DEV && import.meta.env.MODE === 'development' && import.meta.env.VITE_PILOT_LOCAL_APK === '1';
// A private test entry must never start the public build while its own manifest is in flight.
const initialRelease = localPilot ? undefined : FALLBACK_ANDROID_RELEASE;
let current: AndroidRelease | undefined | null = initialRelease;
let pending: Promise<void> | null = null;
let lastAttempt = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => current;

function publish(next: typeof current) {
  if (next === current) return;
  current = next;
  listeners.forEach(listener => listener());
}

export async function refreshAndroidRelease(retry = false): Promise<void> {
  if (pending) return pending;
  if (!retry && Date.now() - lastAttempt < 30_000) return;
  if (current === null) publish(undefined);
  lastAttempt = Date.now();
  pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(localPilot ? '/pilot-delivery/release.json' : ANDROID_CHANNEL_URL,
        { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
      if (!response.ok) throw new Error('Android manifest unavailable');
      const next = parseAndroidRelease(await response.json(), localPilot ? 'pilot' : 'public');
      if (!next) throw new Error('Invalid Android manifest');
      // A delayed response or a reverted channel must never downgrade a page.
      if (current && next.build <= current.build) return;
      publish(next);
    } catch {
      if (!current) publish(null);
    } finally {
      clearTimeout(timer);
      pending = null;
    }
  })();
  return pending;
}

export function useAndroidRelease() {
  const release = useSyncExternalStore(subscribe, snapshot, () => initialRelease);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) void refreshAndroidRelease(); };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, 300_000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, []);
  return release;
}
