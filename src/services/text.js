// Text utilities for fixing mojibake and improving display
export function fixMojibake(input) {
  if (input == null) return input;
  const s = String(input);
  // Heuristic: only attempt decode if common mojibake markers exist
  const hasMarkers = /Ã|Â|�/.test(s);
  let out = s;
  if (hasMarkers) {
    try {
      // Convert from mistaken Latin-1 to proper UTF-8
      // escape -> percent-encode Latin-1 bytes; decodeURIComponent -> interpret as UTF-8
      out = decodeURIComponent(escape(out));
    } catch (_) {
      // Fallback: keep original
    }
  }
  // Cleanup common leftovers
  out = out
    .replace(/Â¿/g, '¿')
    .replace(/Â¡/g, '¡')
    .replace(/Â/g, '')
    .replace(/Ã€/g, '€')
    .replace(/Ã‚/g, '')
    .replace(/Ã„/g, 'Ä')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Ñ')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã/g, 'Ç')
    .replace(/�/g, '');
  return out;
}

export function normalizeTextSafe(input) {
  const fixed = fixMojibake(input);
  // Additional normalization (trim excessive whitespace)
  return typeof fixed === 'string' ? fixed.replace(/[\s\u00A0]+/g, ' ').trim() : fixed;
}