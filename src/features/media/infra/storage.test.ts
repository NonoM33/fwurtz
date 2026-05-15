import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MediaStorage } from "./storage.ts";
import { MediaError } from "../domain/errors.ts";

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

describe("MediaStorage", () => {
  let dir: string;
  let storage: MediaStorage;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "mf-media-"));
    storage = new MediaStorage(dir);
    await storage.init();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("uploads, lists, and reads back a binary asset", async () => {
    const asset = await storage.upload({
      filename: "photo.png",
      contentType: "image/png",
      bytes: PNG_BYTES,
      alt: "Une photo",
      collection: "portraits",
    });
    expect(asset.id).toBeTruthy();
    expect(asset.collection).toBe("portraits");
    expect(asset.alt).toBe("Une photo");

    const list = await storage.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(asset.id);

    const binary = await storage.readBinary(asset.id);
    expect(binary?.contentType).toBe("image/png");
    expect(binary?.bytes.equals(Buffer.from(PNG_BYTES))).toBe(true);
  });

  it("rejects unsupported content types (regression: visitors mustn't smuggle binaries)", async () => {
    await expect(
      storage.upload({
        filename: "evil.exe",
        contentType: "application/x-msdownload",
        bytes: PNG_BYTES,
      }),
    ).rejects.toBeInstanceOf(MediaError);
  });

  it("rejects oversize uploads", async () => {
    const huge = new Uint8Array(11 * 1024 * 1024);
    await expect(
      storage.upload({
        filename: "huge.png",
        contentType: "image/png",
        bytes: huge,
      }),
    ).rejects.toMatchObject({ code: "too_large" });
  });

  it("normalizes unknown collections to 'autres'", async () => {
    const asset = await storage.upload({
      filename: "x.png",
      contentType: "image/png",
      bytes: PNG_BYTES,
      collection: "unknown-thing" as never,
    });
    expect(asset.collection).toBe("autres");
  });

  it("removes a media and cascades by clearing slots that referenced it", async () => {
    const asset = await storage.upload({
      filename: "x.png",
      contentType: "image/png",
      bytes: PNG_BYTES,
    });
    await storage.assignSlot("hero-portrait", asset.id, "alt");
    expect(await storage.getSlot("hero-portrait")).not.toBeNull();
    await storage.remove(asset.id);
    expect(await storage.getSlot("hero-portrait")).toBeNull();
    expect(await storage.list()).toHaveLength(0);
  });

  it("assigns and clears a slot", async () => {
    const asset = await storage.upload({
      filename: "x.png",
      contentType: "image/png",
      bytes: PNG_BYTES,
    });
    const a = await storage.assignSlot("hero-portrait", asset.id, "Hi");
    expect(a.alt).toBe("Hi");
    expect(a.mediaId).toBe(asset.id);

    const overwrite = await storage.assignSlot("hero-portrait", asset.id, "Bye");
    expect(overwrite.alt).toBe("Bye");
    expect((await storage.listSlots()).length).toBe(1);

    await storage.clearSlot("hero-portrait");
    expect(await storage.getSlot("hero-portrait")).toBeNull();
  });

  it("refuses to assign a slot to a non-existent media", async () => {
    await expect(
      storage.assignSlot("hero-portrait", "no-such-id"),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("returns null when reading binary for an unknown media id", async () => {
    expect(await storage.readBinary("nope")).toBeNull();
  });
});
