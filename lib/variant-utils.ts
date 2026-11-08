/**
 * Pure variant generation and SKU utility functions.
 * Pure business logic with zero database/server dependencies (safe for client and server).
 */

export interface AttributeOptionInput {
  name: string; // e.g. "Size", "Color"
  values: string[]; // e.g. ["S", "M", "L"] or ["Navy Blue", "Olive Green"]
}

export interface AttributeValuesParseResult {
  values: string[];
  hasDuplicates: boolean;
  duplicateValues: string[];
  errorMessage?: string;
}

/**
 * Parses comma-separated attribute values.
 * - Trims leading and trailing whitespace from each value
 * - Removes empty entries
 * - Rejects duplicates (case-insensitive) while preserving the original casing of the first occurrence
 * - Returns clean unique values, duplicate flags, and duplicate warning message
 */
export function parseCommaSeparatedAttributeValues(
  rawInput: string,
): AttributeValuesParseResult {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      values: [],
      hasDuplicates: false,
      duplicateValues: [],
    };
  }

  const rawSegments = rawInput.split(",");
  const trimmed = rawSegments
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const seen = new Set<string>();
  const uniqueValues: string[] = [];
  const duplicates: string[] = [];

  for (const item of trimmed) {
    const lower = item.toLowerCase();
    if (seen.has(lower)) {
      if (!duplicates.some((d) => d.toLowerCase() === lower)) {
        duplicates.push(item);
      }
    } else {
      seen.add(lower);
      uniqueValues.push(item);
    }
  }

  const hasDuplicates = duplicates.length > 0;
  const errorMessage = hasDuplicates
    ? `Duplicate value${duplicates.length > 1 ? "s" : ""} found: "${duplicates.join('", "')}". Duplicates were removed.`
    : undefined;

  return {
    values: uniqueValues,
    hasDuplicates,
    duplicateValues: duplicates,
    errorMessage,
  };
}

export interface GeneratedVariantBlueprint {
  options: Record<string, string>;
  sku: string;
  pricePaise: number;
  compareAtPricePaise?: number;
  stock: number;
  images: string[];
}

/**
 * Computes the Cartesian product of an array of attributes and their values.
 * Returns an array of option maps representing every combination.
 */
export function generateCartesianCombinations(
  attributes: AttributeOptionInput[],
): Array<Record<string, string>> {
  // Filter out any attributes without values
  const validAttributes = attributes.filter(
    (attr) => attr.name.trim() && attr.values && attr.values.length > 0,
  );

  if (validAttributes.length === 0) {
    return [];
  }

  return validAttributes.reduce<Array<Record<string, string>>>(
    (acc, attribute) => {
      const nextAcc: Array<Record<string, string>> = [];
      const attrName = attribute.name.trim();

      for (const existingCombination of acc) {
        for (const val of attribute.values) {
          const trimmedVal = val.trim();
          if (trimmedVal) {
            nextAcc.push({
              ...existingCombination,
              [attrName]: trimmedVal,
            });
          }
        }
      }

      return nextAcc;
    },
    [{}],
  );
}

/**
 * Generates an uppercase SKU from product slug, brand, and variant option values.
 * Example: generateSKU({ productSlug: "oxford-shirt", options: { Size: "M", Color: "Navy Blue" } }) -> "MC-OXF-NAV-M"
 */
export function generateSKU(params: {
  productSlug: string;
  options: Record<string, string>;
  prefix?: string;
}): string {
  const { productSlug, options, prefix = "MC" } = params;

  // Take first 3-4 chars of slug words
  const slugParts = productSlug
    .replace(/[^a-zA-Z0-9-]/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.slice(0, 3).toUpperCase())
    .join("");

  const optionParts = Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, val]) => {
      const cleanVal = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      return cleanVal.slice(0, 3);
    })
    .join("-");

  const components = [prefix, slugParts, optionParts].filter(Boolean);
  return components.join("-");
}

/**
 * Builds complete variant blueprints from attribute combinations.
 */
export function generateVariantsFromAttributes(params: {
  productSlug: string;
  attributes: AttributeOptionInput[];
  defaultPricePaise: number;
  defaultCompareAtPricePaise?: number;
  defaultStock?: number;
  colorImages?: Record<string, string[]>;
}): GeneratedVariantBlueprint[] {
  const {
    productSlug,
    attributes,
    defaultPricePaise,
    defaultCompareAtPricePaise,
    defaultStock = 0,
    colorImages = {},
  } = params;

  const combinations = generateCartesianCombinations(attributes);

  return combinations.map((combination) => {
    const sku = generateSKU({ productSlug, options: combination });

    // Associate color-specific image if Color attribute exists
    const colorVal = combination["Color"] || combination["color"];
    const matchedImages =
      colorVal && colorImages[colorVal] ? colorImages[colorVal] : [];

    return {
      options: combination,
      sku,
      pricePaise: defaultPricePaise,
      compareAtPricePaise: defaultCompareAtPricePaise,
      stock: defaultStock,
      images: matchedImages,
    };
  });
}

