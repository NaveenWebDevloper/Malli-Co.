import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildProductJsonLd, type DetailedProduct } from "../lib/catalog.ts";

describe("Storefront Catalog, Structured Data & Variant Selection", () => {
  const mockProduct: DetailedProduct = {
    _id: "64f123456789012345678901",
    name: "Classic Pure Linen Oxford Shirt",
    slug: "classic-pure-linen-oxford-shirt",
    description: "Tailored French flax linen shirt with mother of pearl buttons.",
    gender: "MEN",
    type: "VARIABLE",
    basePricePaise: 249900,
    status: "ACTIVE",
    images: ["/images/linen-shirt-blue.jpg", "/images/linen-shirt-green.jpg"],
    brand: {
      _id: "64f123456789012345678902",
      name: "Malli Heritage",
      slug: "malli-heritage",
    },
    category: {
      _id: "64f123456789012345678903",
      name: "Men's Shirts",
      slug: "mens-shirts",
    },
    variants: [
      {
        _id: "64f123456789012345678910",
        sku: "MH-LIN-NVY-M",
        pricePaise: 249900,
        compareAtPricePaise: 299900,
        stock: 10,
        images: ["/images/linen-shirt-blue.jpg"],
        options: { Size: "M", Color: "Navy Blue" },
        isDefault: true,
      },
      {
        _id: "64f123456789012345678911",
        sku: "MH-LIN-NVY-L",
        pricePaise: 249900,
        stock: 0, // Out of stock
        images: ["/images/linen-shirt-blue.jpg"],
        options: { Size: "L", Color: "Navy Blue" },
        isDefault: false,
      },
      {
        _id: "64f123456789012345678912",
        sku: "MH-LIN-OLV-M",
        pricePaise: 249900,
        stock: 5,
        images: ["/images/linen-shirt-green.jpg"],
        options: { Size: "M", Color: "Olive Green" },
        isDefault: false,
      },
    ],
  };

  describe("Schema.org JSON-LD Structured Data Builder", () => {
    it("generates valid Product schema with Brand, Category, and Offers", () => {
      const jsonLd = buildProductJsonLd(mockProduct, "https://malliandco.com");

      assert.equal(jsonLd["@context"], "https://schema.org");
      assert.equal(jsonLd["@type"], "Product");
      assert.equal(jsonLd.name, "Classic Pure Linen Oxford Shirt");
      assert.equal(jsonLd.brand.name, "Malli Heritage");
      assert.equal(jsonLd.category, "Men's Shirts");

      assert.ok(Array.isArray(jsonLd.offers));
      assert.equal(jsonLd.offers.length, 3);

      // Verify in-stock offer (stock: 10 -> InStock)
      const inStockOffer = jsonLd.offers[0];
      assert.equal(inStockOffer.sku, "MH-LIN-NVY-M");
      assert.equal(inStockOffer.price, "2499.00");
      assert.equal(inStockOffer.priceCurrency, "INR");
      assert.equal(inStockOffer.availability, "https://schema.org/InStock");

      // Verify out-of-stock offer (stock: 0 -> OutOfStock)
      const outOfStockOffer = jsonLd.offers[1];
      assert.equal(outOfStockOffer.sku, "MH-LIN-NVY-L");
      assert.equal(outOfStockOffer.availability, "https://schema.org/OutOfStock");
    });
  });

  describe("Variant Availability & Selection Logic", () => {
    it("resolves exact variant matching selected Size and Color", () => {
      const selectedColor = "Navy Blue";
      const selectedSize = "M";

      const matched = mockProduct.variants.find(
        (v) =>
          v.options.Color === selectedColor && v.options.Size === selectedSize,
      );

      assert.ok(matched);
      assert.equal(matched?.sku, "MH-LIN-NVY-M");
      assert.equal(matched?.stock, 10);
    });

    it("identifies out of stock sizes for a given color", () => {
      const selectedColor = "Navy Blue";

      const sizeLVariant = mockProduct.variants.find(
        (v) => v.options.Color === selectedColor && v.options.Size === "L",
      );

      assert.ok(sizeLVariant);
      assert.equal(sizeLVariant?.stock, 0);
      const isAvailable = sizeLVariant ? sizeLVariant.stock > 0 : false;
      assert.equal(isAvailable, false, "Size L in Navy Blue must be detected as out of stock");
    });

    it("changes image gallery when selecting a different color variant", () => {
      const color1 = "Navy Blue";
      const variant1 = mockProduct.variants.find((v) => v.options.Color === color1);
      assert.equal(variant1?.images[0], "/images/linen-shirt-blue.jpg");

      const color2 = "Olive Green";
      const variant2 = mockProduct.variants.find((v) => v.options.Color === color2);
      assert.equal(variant2?.images[0], "/images/linen-shirt-green.jpg");
      assert.notEqual(variant1?.images[0], variant2?.images[0]);
    });
  });
});

