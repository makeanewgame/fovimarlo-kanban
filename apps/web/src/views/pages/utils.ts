export interface PageListItem {
  publicId: string;
  title: string;
  parentPublicId: string | null;
}

export interface PageTreeNode extends PageListItem {
  children: PageTreeNode[];
}

export function buildPageTree(pages: PageListItem[]): PageTreeNode[] {
  const nodes = new Map<string, PageTreeNode>(
    pages.map((page) => [page.publicId, { ...page, children: [] }]),
  );
  const roots: PageTreeNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parentPublicId
      ? nodes.get(node.parentPublicId)
      : undefined;
    (parent?.children ?? roots).push(node);
  }

  return roots;
}

export function getDescendantPublicIds(
  pages: PageListItem[],
  pagePublicId: string,
): string[] {
  const publicIds = new Set([pagePublicId]);

  for (const publicId of publicIds) {
    for (const page of pages) {
      if (page.parentPublicId === publicId) publicIds.add(page.publicId);
    }
  }

  publicIds.delete(pagePublicId);
  return [...publicIds];
}
