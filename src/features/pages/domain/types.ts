export interface PageBlocks {
  hero?: { title?: string; subtitle?: string; cta?: string };
  intro?: { body?: string };
  [key: string]: unknown;
}

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  blocks: PageBlocks;
  draftBlocks: PageBlocks | null;
  metaDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface NewSitePage {
  slug: string;
  title: string;
  blocks?: PageBlocks | undefined;
  metaDescription?: string | null | undefined;
}

export interface UpdateSitePage {
  title?: string | undefined;
  blocks?: PageBlocks | undefined;
  draftBlocks?: PageBlocks | null | undefined;
  metaDescription?: string | null | undefined;
  publish?: boolean | undefined;
}
