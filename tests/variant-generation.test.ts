import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  generateCartesianCombinations,
  generateSKU,
  generateVariantsFromAttributes,
  partitionRemovableVariants,
  parseCommaSeparatedAttributeValues,
} from "../lib/variants.ts";

describe("Variant Generation & Cartesian Product Matrix", () => {
  it("computes Cartesian product of 4 sizes and 3 colors to produce exactly 12 combinations", () => {
    const attributes = [
      { name: "Size", values: ["S", "M", "L", "XL"] },
      { name: "Color", values: ["Navy Blue", "Olive Green", "Burgundy"] },
    ];

    const combinations = generateCartesianCombinations(attributes);

    assert.equal(
      combinations.length,
      12,
      "4 sizes * 3 colors must generate exactly 12 combinations",
    );

    // Verify first and last combination structures
    assert.deepEqual(combinations[0], { Size: "S", Color: "Navy Blue" });
    assert.deepEqual(combinations[11], { Size: "XL", Color: "Burgundy" });

    // Verify every combination contains both Size and Color
    for (const combo of combinations) {
      assert.ok(combo["Size"], "Combination must include Size");
      assert.ok(combo["Color"], "Combination must include Color");
    }
  });

  it("handles single-attribute variant generation", () => {
    const singleAttr = [
      { name: "Waist Size", values: ["30", "32", "34", "36"] },
    ];

    const combinations = generateCartesianCombinations(singleAttr);
    assert.equal(combinations.length, 4);
    assert.equal(combinations[0]["Waist Size"], "30");
  });

  it("returns empty array for empty or whitespace-only attributes", () => {
    const emptyAttrs = [
      { name: "   ", values: ["A", "B"] },
      { name: "Color", values: ["  ", ""] },
    ];

    const combinations = generateCartesianCombinations(emptyAttrs);
    assert.equal(combinations.length, 0);
  });

  it("generates deterministic, uppercase, unique SKUs for each variant", () => {
    const attributes = [
      { name: "Size", values: ["S", "M", "L", "XL"] },
      { name: "Color", values: ["Navy", "Olive", "Burgundy"] },
    ];

    const variants = generateVariantsFromAttributes({
      productSlug: "pima-cotton-crewneck",
      attributes,
      defaultPricePaise: 129900,
      defaultStock: 25,
    });

    assert.equal(variants.length, 12);

    const generatedSkus = variants.map((v) => v.sku);
    const uniqueSkus = new Set(generatedSkus);

    // All 12 SKUs must be unique
    assert.equal(uniqueSkus.size, 12, "All 12 generated SKUs must be unique");

    for (const v of variants) {
      assert.equal(
        v.sku,
        v.sku.toUpperCase(),
        "SKU must be strictly uppercase",
      );
      assert.ok(
        v.sku.startsWith("MC-"),
        "SKU must start with brand prefix MC-",
      );
      assert.equal(v.pricePaise, 129900);
      assert.equal(v.stock, 25);
    }
  });

  it("associates color-specific gallery images with corresponding color variants", () => {
    const attributes = [
      { name: "Size", values: ["M", "L"] },
      { name: "Color", values: ["Navy Blue", "Olive Green"] },
    ];

    const colorImages = {
      "Navy Blue": ["/images/navy-front.jpg", "/images/navy-back.jpg"],
      "Olive Green": ["/images/olive-front.jpg"],
    };

    const variants = generateVariantsFromAttributes({
      productSlug: "linen-shirt",
      attributes,
      defaultPricePaise: 249900,
      colorImages,
    });

    const navyVariants = variants.filter(
      (v) => v.options["Color"] === "Navy Blue",
    );
    const oliveVariants = variants.filter(
      (v) => v.options["Color"] === "Olive Green",
    );

    assert.equal(navyVariants.length, 2);
    assert.equal(oliveVariants.length, 2);

    // Assert correct gallery assignment
    assert.deepEqual(navyVariants[0].images, [
      "/images/navy-front.jpg",
      "/images/navy-back.jpg",
    ]);
    assert.deepEqual(oliveVariants[0].images, ["/images/olive-front.jpg"]);
  });
});

describe("Safe Variant Preservation & Order Archive Rule (Rule 5)", () => {
  it("partitions removed variants: variants with orders are preserved as ARCHIVED, not deleted", async () => {
    const variantWithOrder = new mongoose.Types.ObjectId();
    const variantWithoutOrder = new mongoose.Types.ObjectId();

    // Mock Order collection finding variantWithOrder
    const originalFind = mongoose.model("Order").find;
    try {
      (mongoose.model("Order") as any).find = () => ({
        select: () =>
          Promise.resolve([
            {
              items: [{ variantId: variantWithOrder }],
            },
          ]),
      });

      const { safeToDelete, mustArchive } = await partitionRemovableVariants([
        variantWithOrder,
        variantWithoutOrder,
      ]);

      // Variant with order MUST be archived
      assert.equal(mustArchive.length, 1);
      assert.equal(mustArchive[0].toString(), variantWithOrder.toString());

      // Variant without order is safe to delete
      assert.equal(safeToDelete.length, 1);
      assert.equal(safeToDelete[0].toString(), variantWithoutOrder.toString());
    } finally {
      (mongoose.model("Order") as any).find = originalFind;
    }
  });
});

describe("Attribute Comma-Separated Values Parser", () => {
  it("parses numeric comma-separated values like '28, 30, 32, 34, 36'", () => {
    const result = parseCommaSeparatedAttributeValues("28, 30, 32, 34, 36");

    assert.deepEqual(result.values, ["28", "30", "32", "34", "36"]);
    assert.equal(result.hasDuplicates, false);
    assert.equal(result.duplicateValues.length, 0);
    assert.equal(result.errorMessage, undefined);
  });

  it("supports values with spaces, 'x', and dashes (e.g. 28, 32x34, 2-3Y)", () => {
    const result = parseCommaSeparatedAttributeValues(
      " 28, 32x34 , 34x34, 2-3Y, 4-5 Y ",
    );

    assert.deepEqual(result.values, ["28", "32x34", "34x34", "2-3Y", "4-5 Y"]);
    assert.equal(result.hasDuplicates, false);
    assert.equal(result.duplicateValues.length, 0);
  });

  it("trims whitespace and removes empty entries", () => {
    const result = parseCommaSeparatedAttributeValues(
      "  28  ,  ,  30  ,,   , 32 ",
    );

    assert.deepEqual(result.values, ["28", "30", "32"]);
    assert.equal(result.hasDuplicates, false);
    assert.equal(result.duplicateValues.length, 0);
  });

  it("rejects case-insensitive duplicates with an informative message", () => {
    const result = parseCommaSeparatedAttributeValues(
      "Red, Blue, red, BLUE, Green, green",
    );

    // Retains first occurrence's casing
    assert.deepEqual(result.values, ["Red", "Blue", "Green"]);
    assert.equal(result.hasDuplicates, true);
    assert.equal(result.duplicateValues.length, 3);
    assert.ok(
      result.errorMessage?.includes("Duplicate values found"),
      "Must generate informative error message",
    );
  });

  it("rejects duplicate numeric values and handles empty string gracefully", () => {
    const duplicateNums = parseCommaSeparatedAttributeValues(
      "30, 32, 30, 34, 32",
    );
    assert.deepEqual(duplicateNums.values, ["30", "32", "34"]);
    assert.equal(duplicateNums.hasDuplicates, true);
    assert.deepEqual(duplicateNums.duplicateValues, ["30", "32"]);

    const empty = parseCommaSeparatedAttributeValues("");
    assert.deepEqual(empty.values, []);
    assert.equal(empty.hasDuplicates, false);
  });
});
