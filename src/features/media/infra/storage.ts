import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  ImageSlotAssignment,
  MediaAsset,
  MediaCollection,
  MediaUploadInput,
} from "../domain/types.ts";
import {
  ACCEPTED_CONTENT_TYPES,
  COLLECTIONS,
  MAX_UPLOAD_BYTES,
} from "../domain/types.ts";
import { MediaError } from "../domain/errors.ts";

interface Manifest {
  medias: MediaAsset[];
  slots: ImageSlotAssignment[];
}

export class MediaStorage {
  constructor(private readonly baseDir: string) {}

  private get manifestPath(): string {
    return join(this.baseDir, "manifest.json");
  }

  private get filesDir(): string {
    return join(this.baseDir, "files");
  }

  async init(): Promise<void> {
    if (!existsSync(this.baseDir)) {
      await mkdir(this.baseDir, { recursive: true });
    }
    if (!existsSync(this.filesDir)) {
      await mkdir(this.filesDir, { recursive: true });
    }
    if (!existsSync(this.manifestPath)) {
      await this.writeManifest({ medias: [], slots: [] });
    }
  }

  private async readManifest(): Promise<Manifest> {
    await this.init();
    const raw = await readFile(this.manifestPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Manifest>;
    return {
      medias: parsed.medias ?? [],
      slots: parsed.slots ?? [],
    };
  }

  private async writeManifest(m: Manifest): Promise<void> {
    await writeFile(this.manifestPath, JSON.stringify(m, null, 2), "utf8");
  }

  async list(): Promise<MediaAsset[]> {
    const m = await this.readManifest();
    return [...m.medias].sort((a, b) =>
      b.uploadedAt.localeCompare(a.uploadedAt),
    );
  }

  async upload(input: MediaUploadInput): Promise<MediaAsset> {
    if (!ACCEPTED_CONTENT_TYPES.includes(input.contentType)) {
      throw new MediaError("Format non supporté", "unsupported_type");
    }
    if (input.bytes.byteLength > MAX_UPLOAD_BYTES) {
      throw new MediaError("Image trop lourde (>10 Mo)", "too_large");
    }
    const id = randomUUID();
    const ext = extensionFor(input.contentType, input.filename);
    const storedName = `${id}${ext}`;
    await writeFile(join(this.filesDir, storedName), input.bytes);

    const asset: MediaAsset = {
      id,
      filename: input.filename,
      contentType: input.contentType,
      size: input.bytes.byteLength,
      alt: (input.alt ?? "").trim(),
      collection: normalizeCollection(input.collection),
      uploadedAt: new Date().toISOString(),
    };
    const m = await this.readManifest();
    m.medias.push(asset);
    await this.writeManifest(m);
    return asset;
  }

  async remove(id: string): Promise<void> {
    const m = await this.readManifest();
    const asset = m.medias.find((a) => a.id === id);
    if (!asset) throw new MediaError("Média introuvable", "not_found");
    const storedName = `${asset.id}${extensionFor(asset.contentType, asset.filename)}`;
    const path = join(this.filesDir, storedName);
    if (existsSync(path)) await unlink(path);
    m.medias = m.medias.filter((a) => a.id !== id);
    m.slots = m.slots.filter((s) => s.mediaId !== id);
    await this.writeManifest(m);
  }

  async readBinary(
    id: string,
  ): Promise<{ bytes: Buffer; contentType: string } | null> {
    const m = await this.readManifest();
    const asset = m.medias.find((a) => a.id === id);
    if (!asset) return null;
    const storedName = `${asset.id}${extensionFor(asset.contentType, asset.filename)}`;
    const path = join(this.filesDir, storedName);
    if (!existsSync(path)) return null;
    return { bytes: await readFile(path), contentType: asset.contentType };
  }

  async listSlots(): Promise<ImageSlotAssignment[]> {
    const m = await this.readManifest();
    return [...m.slots];
  }

  async getSlot(slotId: string): Promise<ImageSlotAssignment | null> {
    const m = await this.readManifest();
    return m.slots.find((s) => s.slotId === slotId) ?? null;
  }

  async assignSlot(
    slotId: string,
    mediaId: string,
    alt?: string,
  ): Promise<ImageSlotAssignment> {
    const m = await this.readManifest();
    const asset = m.medias.find((a) => a.id === mediaId);
    if (!asset) throw new MediaError("Média introuvable", "not_found");
    const updated: ImageSlotAssignment = {
      slotId,
      mediaId,
      alt: (alt ?? asset.alt ?? "").trim(),
      updatedAt: new Date().toISOString(),
    };
    m.slots = [...m.slots.filter((s) => s.slotId !== slotId), updated];
    await this.writeManifest(m);
    return updated;
  }

  async clearSlot(slotId: string): Promise<void> {
    const m = await this.readManifest();
    m.slots = m.slots.filter((s) => s.slotId !== slotId);
    await this.writeManifest(m);
  }
}

function extensionFor(contentType: string, filename: string): string {
  const fromName = extname(filename).toLowerCase();
  if (fromName) return fromName;
  switch (contentType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
}

function normalizeCollection(c: MediaCollection | undefined): MediaCollection {
  if (!c) return "autres";
  return COLLECTIONS.includes(c) ? c : "autres";
}

let singleton: MediaStorage | undefined;

export function mediaStorage(): MediaStorage {
  if (!singleton) {
    const dir =
      import.meta.env.MEDIA_DIR?.toString() ??
      process.env.MEDIA_DIR ??
      join(process.cwd(), "data", "media");
    singleton = new MediaStorage(dir);
  }
  return singleton;
}
