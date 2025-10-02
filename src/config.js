import Constants from 'expo-constants';

// Helper to resolve the correct API base URL depending on runtime (web vs native, LAN vs localhost)
function resolveApiUrl() {
  // Priority 1: explicit env var (works in web and native with EXPO_PUBLIC_API_URL)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const isWeb = typeof window !== 'undefined';

  // For web, use current window host to avoid cross-origin and localhost issues
  if (isWeb && window.location && window.location.host) {
    // Assume backend is on same host, port 4000
    const protocol = window.location.protocol || 'http:';
    const host = window.location.hostname;
    const port = 4000;
    return `${protocol}//${host}:${port}`;
  }

  // For native (Expo Go), try to detect the development server IP and use it with backend port 4000
  try {
    const manifest = Constants?.expoConfig || Constants?.manifest || {};
    const debuggerHost = manifest?.hostUri || Constants?.debuggerHost; // e.g., 192.168.1.10:8081
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      return `http://${host}:4000`;
    }
  } catch (e) {
    // ignore
  }

  // Last resort fallback
  return 'http://localhost:4000';
}

export const CONFIG = {
  API_URL: resolveApiUrl(),
};