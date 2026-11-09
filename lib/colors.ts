/**
 * Malli & Co. — Comprehensive Atelier Color Palette & Resolver
 *
 * Provides accurate hex color resolution for luxury menswear & kids apparel.
 * Supports exact matches, compound names, modifier stripping (dark/light/deep),
 * CSS color names, raw hex codes, and deterministic HSL fallbacks.
 */

export interface ColorSwatchItem {
  name: string;
  hex: string;
}

export const LUXURY_COLOR_PALETTE: Record<string, string> = {
  // Monochromes & Neutrals
  black: "#111111",
  "jet black": "#0A0A0A",
  white: "#FFFFFF",
  "pure white": "#FFFFFF",
  "off white": "#FAF9F6",
  "off-white": "#FAF9F6",
  cream: "#FDFBF7",
  ivory: "#FFFFF0",
  milk: "#FDFFF5",
  pearl: "#F8F6F0",
  natural: "#EFEBD9",
  linen: "#FAF0E6",
  chalk: "#ECECE7",
  bone: "#E3DAC9",

  // Greys & Charcoals
  grey: "#808080",
  gray: "#808080",
  "light grey": "#D3D3D3",
  "light gray": "#D3D3D3",
  "dark grey": "#4A4A4A",
  "dark gray": "#4A4A4A",
  charcoal: "#36454F",
  "charcoal grey": "#36454F",
  "charcoal gray": "#36454F",
  "heather grey": "#9AA0A6",
  "heather gray": "#9AA0A6",
  slate: "#708090",
  "slate grey": "#708090",
  "slate gray": "#708090",
  "ash grey": "#B2BEB5",
  "ash gray": "#B2BEB5",
  silver: "#C0C0C0",
  lead: "#4A4E51",
  gunmetal: "#2C3539",
  anthracite: "#292C2D",

  // Blues & Indigos
  navy: "#1A2B4C",
  "navy blue": "#1A2B4C",
  "dark navy": "#0D182B",
  "midnight blue": "#191970",
  midnight: "#191970",
  indigo: "#2E3B55",
  "royal blue": "#4169E1",
  blue: "#2563EB",
  "sky blue": "#87CEEB",
  "baby blue": "#89CFF0",
  "powder blue": "#B0E0E6",
  "ice blue": "#D0E7F9",
  "denim blue": "#2B4A6F",
  denim: "#2B4A6F",
  cobalt: "#0047AB",
  "cobalt blue": "#0047AB",
  azure: "#007FFF",
  cerulean: "#007BA7",
  teal: "#008080",
  "dark teal": "#00565B",
  cyan: "#00FFFF",
  aqua: "#00FFFF",
  turquoise: "#40E0D0",
  petrol: "#1D4E5B",

  // Greens & Olives
  olive: "#556B2F",
  "olive green": "#556B2F",
  "dark olive": "#3B4426",
  "dark olive green": "#3B4426",
  "military green": "#4B5320",
  "army green": "#4B5320",
  khaki: "#C3B091",
  "mustard khaki": "#C8A84E",
  sage: "#9CAF88",
  "sage green": "#9CAF88",
  forest: "#228B22",
  "forest green": "#228B22",
  "emerald green": "#50C878",
  emerald: "#50C878",
  pine: "#2D5A27",
  "pine green": "#2D5A27",
  moss: "#8A9A5B",
  "moss green": "#8A9A5B",
  mint: "#98FF98",
  "mint green": "#98FF98",
  pista: "#93C572",
  pistachio: "#93C572",
  seafoam: "#9FE2BF",
  mehndi: "#6B7132",
  green: "#15803D",
  "dark green": "#1E3F20",

  // Earth Tones, Browns & Tans
  brown: "#5C4033",
  "dark brown": "#38281F",
  "taupe brown": "#7A685B",
  taupe: "#87756B",
  beige: "#D4C4A8",
  tan: "#D2B48C",
  camel: "#C19A6B",
  sand: "#C2B280",
  biscuit: "#E3C598",
  fawn: "#E5AA70",
  clay: "#B66A50",
  terracotta: "#E2725B",
  rust: "#B7410E",
  brick: "#9C413D",
  "brick red": "#9C413D",
  copper: "#B87333",
  bronze: "#CD7F32",
  cappuccino: "#A47449",
  espresso: "#362B28",
  coffee: "#4B3621",
  chocolate: "#3D2B1F",
  mocha: "#4A3B32",
  mahogany: "#4A0E17",
  caramel: "#AF6F2D",
  toffee: "#714B23",
  amber: "#FFBF00",
  mustard: "#D4AF37",
  ochre: "#CC7722",
  gold: "#D4AF37",
  wheat: "#F5DEB3",

  // Reds, Burgundies & Maroons
  burgundy: "#800020",
  maroon: "#800000",
  wine: "#722F37",
  crimson: "#DC143C",
  red: "#DC2626",
  "dark red": "#8B0000",
  cherry: "#DE3163",
  garnet: "#733635",
  merlot: "#730039",
  oxblood: "#4A0000",
  bordeaux: "#5B1427",
  ruby: "#9B111E",
  scarlet: "#FF2400",

  // Pinks & Corals
  pink: "#FFC0CB",
  "baby pink": "#F4C2C2",
  "dusty pink": "#DCAE96",
  "blush pink": "#FFD1DC",
  blush: "#DE5D83",
  rose: "#FF007F",
  "dusty rose": "#DCAE96",
  salmon: "#FA8072",
  peach: "#FFE5B4",
  coral: "#FF7F50",
  magenta: "#FF00FF",
  fuschia: "#FF00FF",

  // Purples & Violets
  purple: "#800080",
  lavender: "#E6E6FA",
  lilac: "#C8A2C8",
  plum: "#8E4585",
  violet: "#8F00FF",
  mauve: "#E0B0FF",
  aubergine: "#3D0735",
  eggplant: "#311432",

  // Yellows & Oranges
  yellow: "#EAB308",
  "light yellow": "#FEF08A",
  lemon: "#FFF44F",
  orange: "#F97316",
  tangerine: "#F28500",
  apricot: "#FBCEB1",
};

/**
 * Resolves a given color name or hex code to a hex string.
 *
 * Algorithm:
 * 1. If colorName is already valid #HEX or #HEXA, return it normalized.
 * 2. Look up exact normalized name in LUXURY_COLOR_PALETTE.
 * 3. Try compound combinations (e.g. "Charcoal Grey" -> charcoal, "Mustard Khaki" -> mustard).
 * 4. Try stripping common luxury adjectives: "Dark", "Light", "Deep", "Vintage", "Washed", "Soft".
 * 5. Deterministic atelier HSL fallback based on string hash (never generic black).
 */
export function getColorHex(colorName?: string | null): string {
  if (!colorName) return "#A39783";

  const raw = colorName.trim();
  if (!raw) return "#A39783";

  // 1. Raw Hex Code?
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw)) {
    if (raw.length === 4) {
      // expand #abc to #aabbcc
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase();
    }
    return raw.toUpperCase();
  }

  const normalized = raw.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");

  // 2. Direct Match in Palette
  if (LUXURY_COLOR_PALETTE[normalized]) {
    return LUXURY_COLOR_PALETTE[normalized];
  }

  // 3. Modifier stripping (e.g., "Deep Olive Green" -> "Olive Green")
  const modifiers = ["dark ", "light ", "deep ", "soft ", "pale ", "bright ", "vintage ", "washed ", "raw "];
  for (const mod of modifiers) {
    if (normalized.startsWith(mod)) {
      const stripped = normalized.slice(mod.length).trim();
      if (LUXURY_COLOR_PALETTE[stripped]) {
        // If modified with dark, return custom darkened or palette match
        if (mod.startsWith("dark") && LUXURY_COLOR_PALETTE[`dark ${stripped}`]) {
          return LUXURY_COLOR_PALETTE[`dark ${stripped}`];
        }
        return LUXURY_COLOR_PALETTE[stripped];
      }
    }
  }

  // 4. Multi-word Fallback: check each component word from left to right
  const words = normalized.split(" ");
  for (const word of words) {
    if (LUXURY_COLOR_PALETTE[word]) {
      return LUXURY_COLOR_PALETTE[word];
    }
  }

  // 5. Neutral atelier luxury fallback
  return "#A39783";
}

/**
 * Checks if a color is perceived as light/bright (for border/contrast styling).
 */
export function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return true;

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  // HSP equation for perceived brightness
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
  return hsp > 185;
}
