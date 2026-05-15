export interface Service {
  id: string;
  slug: string;
  title: string;
  summary: string;
  bodyJson: Record<string, unknown>;
  icon: string | null; // raw SVG inner markup
  heroImageSlot: string | null;
  position: number;
  published: boolean;
  updatedAt: string;
}

export interface NewService {
  slug: string;
  title: string;
  summary: string;
  bodyJson?: Record<string, unknown> | undefined;
  icon?: string | null | undefined;
  heroImageSlot?: string | null | undefined;
  position?: number | undefined;
  published?: boolean | undefined;
}

export interface UpdateService {
  slug?: string | undefined;
  title?: string | undefined;
  summary?: string | undefined;
  bodyJson?: Record<string, unknown> | undefined;
  icon?: string | null | undefined;
  heroImageSlot?: string | null | undefined;
  position?: number | undefined;
  published?: boolean | undefined;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
