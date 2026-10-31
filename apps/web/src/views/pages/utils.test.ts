import { describe, expect, it } from "vitest";

import type { PageListItem } from "./utils";
import { buildPageTree, getDescendantPublicIds } from "./utils";

const pages: PageListItem[] = [
  { publicId: "brief", title: "Brief", parentPublicId: null },
  { publicId: "logo", title: "Logo", parentPublicId: "brief" },
  { publicId: "variants", title: "Variants", parentPublicId: "logo" },
  { publicId: "notes", title: "Notes", parentPublicId: null },
];

describe("buildPageTree", () => {
  it("nests pages under their parents and keeps sibling order", () => {
    const tree = buildPageTree(pages);

    expect(tree.map((page) => page.publicId)).toEqual(["brief", "notes"]);
    expect(tree[0]?.children[0]?.publicId).toBe("logo");
    expect(tree[0]?.children[0]?.children[0]?.publicId).toBe("variants");
  });

  it("nests a child listed before its parent", () => {
    const tree = buildPageTree([...pages].reverse());

    expect(tree.map((page) => page.publicId)).toEqual(["notes", "brief"]);
    expect(tree[1]?.children[0]?.publicId).toBe("logo");
  });

  it("keeps a page visible when its parent is missing", () => {
    const tree = buildPageTree([
      { publicId: "orphan", title: "Orphan", parentPublicId: "gone" },
    ]);

    expect(tree.map((page) => page.publicId)).toEqual(["orphan"]);
  });
});

describe("getDescendantPublicIds", () => {
  it("returns every level below a page, excluding the page itself", () => {
    expect(getDescendantPublicIds(pages, "brief")).toEqual([
      "logo",
      "variants",
    ]);
  });

  it("returns nothing for a leaf page", () => {
    expect(getDescendantPublicIds(pages, "notes")).toEqual([]);
  });
});
