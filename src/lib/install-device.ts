export function installDevice() {
  if (/iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "apple";
  return /Android/i.test(navigator.userAgent) ? "android" : "desktop";
}
