import { useEffect, useSyncExternalStore } from 'react';
import pinnedRelease from '../../scripts/android-release.json';

const repository = 'xtincell/spawt-ci-mobile-v1-mvp';
export const ANDROID_CHANNEL_URL = `https://raw.githubusercontent.com/${repository}/android-releases/latest.json`;
export type AndroidRelease = typeof pinnedRelease;
export const FALLBACK_ANDROID_RELEASE: AndroidRelease = {
  ...pinnedRelease,
  url: `/downloads/${pinnedRelease.fileName}`,
};

export function parseAndroidRelease(value: unknown): AndroidRelease | null {
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
  const url = `https://github.com/${repository}/releases/download/local-build-android-${item.buildDate}-${item.build}/${fileName}`;
  if (item.fileName !== fileName || item.url !== url) return null;
  return { version: item.version, build: item.build, sha256: item.sha256, sourceCommit: item.sourceCommit, bytes: item.bytes, fileName, url };
}

let current = FALLBACK_ANDROID_RELEASE;
let pending: Promise<void> | null = null;
let lastAttempt = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => current;

export async function refreshAndroidRelease(): Promise<void> {
  if (pending) return pending;
  if (Date.now() - lastAttempt < 30_000) return;
  lastAttempt = Date.now();
  pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(ANDROID_CHANNEL_URL, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
      if (!response.ok) return;
      const next = parseAndroidRelease(await response.json());
      // A delayed response or a reverted channel must never downgrade a page.
      if (!next || next.build <= current.build) return;
      current = next;
      listeners.forEach(listener => listener());
    } catch {
      // Preserve the last verified link, including the bundled APK on first load.
    } finally {
      clearTimeout(timer);
      pending = null;
    }
  })();
  return pending;
}

export function useAndroidRelease(): AndroidRelease {
  const release = useSyncExternalStore(subscribe, snapshot, () => FALLBACK_ANDROID_RELEASE);
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
