// Lightweight foreground-on-color picker. Returns "dark" or "light" based on
// the perceived lightness of a CSS color string. Supports the two formats we
// actually emit: OKLCH (e.g. "oklch(0.88 0.06 240)") and hex (e.g. "#7da3c2").
// Anything we can't parse falls back to "dark" since most palette swatches
// are pastel/light.

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const OKLCH_RE = /oklch\(\s*([0-9.]+)/i;

export function pickForeground(bg: string | null | undefined): "dark" | "light" {
  if (!bg) return "dark";
  const l = lightness(bg);
  if (l === null) return "dark";
  return l < 0.55 ? "light" : "dark";
}

function lightness(bg: string): number | null {
  // OKLCH: first number is L in [0, 1].
  const oklch = bg.match(OKLCH_RE);
  if (oklch) {
    const v = Number.parseFloat(oklch[1]!);
    return Number.isFinite(v) ? v : null;
  }
  // Hex: derive perceived luminance from sRGB.
  const hex = bg.match(HEX_RE);
  if (hex) {
    const h = hex[1]!;
    const expanded =
      h.length === 3
        ? h.split("").map((c) => c + c).join("")
        : h;
    const r = parseInt(expanded.slice(0, 2), 16) / 255;
    const g = parseInt(expanded.slice(2, 4), 16) / 255;
    const b = parseInt(expanded.slice(4, 6), 16) / 255;
    // Rec. 709 relative luminance.
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return null;
}

// CSS color value for the picked foreground.
export function foregroundColor(bg: string | null | undefined): string {
  return pickForeground(bg) === "light" ? "oklch(0.98 0 0)" : "oklch(0.2 0 0)";
}
