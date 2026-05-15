export interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorOrg: string | null;
  quote: string;
  rating: number; // 1-5
  position: number;
  featured: boolean;
  published: boolean;
  clientId: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewTestimonial {
  authorName: string;
  authorRole?: string | undefined;
  authorOrg?: string | undefined;
  quote: string;
  rating?: number | undefined;
  position?: number | undefined;
  featured?: boolean | undefined;
  published?: boolean | undefined;
  clientId?: string | undefined;
  source?: string | undefined;
}

export interface UpdateTestimonial {
  authorName?: string | undefined;
  authorRole?: string | null | undefined;
  authorOrg?: string | null | undefined;
  quote?: string | undefined;
  rating?: number | undefined;
  position?: number | undefined;
  featured?: boolean | undefined;
  published?: boolean | undefined;
}

export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
