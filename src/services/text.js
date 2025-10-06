// Simple text normalization to fix common UTF-8/Latin-1 mojibake (e.g., "SofÃ" -> "Sof")
export function normalizeText(input) {
  if (!input || typeof input !== 'string') return input;
  const s = input.trim();
  if (!s) return s;
  // Heuristic: if contains typical mojibake markers, try Latin-1 -> UTF-8 fix
  const looksMojibake = /Ã|Â|¢|¤|¦|§|¨|©|ª|«|¬|®/u.test(s);
  if (!looksMojibake) return s;

  try {
    const bytes = new Uint8Array(Array.from(s, ch => ch.charCodeAt(0) & 0xFF));
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return decoded;
  } catch (e) {
    // Fallback: return original string
    return s;
  }
}

// Convenience: normalize nullable strings safely (alias used across screens)
export function normalizeTextSafe(input) {
  return typeof input === 'string' ? normalizeText(input) : input;
}

// Back-compat alias if some files still import safeNormalize
export const safeNormalize = normalizeTextSafe;

// Label urgency helper used by Express job screens
export function labelUrgency(urgency) {
  const map = {
    inmediato: 'Inmediato',
    pronto: 'Pronto',
    flexible: 'Flexible'
  };
  const key = (urgency || '').toString().toLowerCase();
  return map[key] || normalizeTextSafe(urgency);
}