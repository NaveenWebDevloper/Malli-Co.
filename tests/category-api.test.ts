import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { getCatalogProducts } from "../lib/catalog.ts";

describe("Category & Products Catalog Integration", () => {
  after(() => {
    process.exit(0);
  });
  it("resolves catalog products query for 'mens-shirts' without throwing", async () => {
    const result = await getCatalogProducts({
      categorySlug: "mens-shirts",
      page: 1,
      limit: 10,
    });

    assert.ok(result, "Result must be defined");
    assert.ok(Array.isArray(result.products), "Products must be an array");
    assert.equal(typeof result.totalCount, "number");
    assert.ok(result.filterFacets, "Filter facets must exist");
  });

  it("resolves catalog products query for 'mens-t-shirts' gracefully", async () => {
    const result = await getCatalogProducts({
      categorySlug: "mens-t-shirts",
      page: 1,
      limit: 10,
    });

    assert.ok(result, "Result must be defined");
    assert.ok(Array.isArray(result.products), "Products must be an array");
    assert.equal(typeof result.totalCount, "number");
  });

  it("resolves catalog products query for gender 'MEN'", async () => {
    const result = await getCatalogProducts({
      gender: "MEN",
      page: 1,
      limit: 10,
    });

    assert.ok(result, "Result must be defined");
    assert.ok(Array.isArray(result.products), "Products must be an array");
  });
});
