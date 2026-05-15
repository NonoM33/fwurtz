export type ResourceType = "ebook" | "article" | "outil" | "formation" | "autre";

export const RESOURCE_TYPES: ReadonlyArray<ResourceType> = [
  "ebook",
  "article",
  "outil",
  "formation",
  "autre",
];

export interface Resource {
  id: string;
  slug: string;
  type: ResourceType;
  title: string;
  summary: string;
  bodyJson: ResourceMeta;
  filePath: string | null;
  linkUrl: string | null;
  coverImageSlot: string | null;
  captureEmail: boolean;
  downloadsCount: number;
  position: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceMeta {
  priceCents?: number;
  badgeLabel?: string;
  ctaLabel?: string;
}

export interface NewResource {
  slug: string;
  type: ResourceType;
  title: string;
  summary: string;
  bodyJson?: ResourceMeta | undefined;
  filePath?: string | null | undefined;
  linkUrl?: string | null | undefined;
  coverImageSlot?: string | null | undefined;
  captureEmail?: boolean | undefined;
  position?: number | undefined;
  published?: boolean | undefined;
}

export interface UpdateResource {
  slug?: string | undefined;
  type?: ResourceType | undefined;
  title?: string | undefined;
  summary?: string | undefined;
  bodyJson?: ResourceMeta | undefined;
  filePath?: string | null | undefined;
  linkUrl?: string | null | undefined;
  coverImageSlot?: string | null | undefined;
  captureEmail?: boolean | undefined;
  position?: number | undefined;
  published?: boolean | undefined;
}

export function formatPrice(cents: number | undefined): string {
  if (!cents || cents <= 0) return "Gratuit";
  const euros = cents / 100;
  return Number.isInteger(euros) ? `${euros} €` : `${euros.toFixed(2).replace(".", ",")} €`;
}
