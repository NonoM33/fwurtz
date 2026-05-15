export interface MediaAsset {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
  alt: string;
  collection: MediaCollection;
  uploadedAt: string;
}

export type MediaCollection =
  | "portraits"
  | "mariages"
  | "bureau"
  | "realisations"
  | "autres";

export const COLLECTIONS: ReadonlyArray<MediaCollection> = [
  "portraits",
  "mariages",
  "bureau",
  "realisations",
  "autres",
];

export interface ImageSlotAssignment {
  slotId: string;
  mediaId: string;
  alt: string;
  updatedAt: string;
}

export interface MediaUploadInput {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
  alt?: string;
  collection?: MediaCollection;
}

export const ACCEPTED_CONTENT_TYPES: ReadonlyArray<string> = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/svg+xml",
];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
