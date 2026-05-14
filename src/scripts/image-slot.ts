/**
 * <image-slot> — gold-bordered placeholder with drag-and-drop image upload.
 *
 * Persisted client-side in localStorage so a returning user keeps their pictures.
 * Visual frame (radial gold gradient + dashed ring + caption) preserved
 * pixel-perfect from the original maquette.
 */

const STORAGE_KEY = "mf-image-slots-v1";
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB safety net

type SlotState = Record<string, string>;

function loadAll(): SlotState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SlotState) : {};
  } catch {
    return {};
  }
}

function saveAll(state: SlotState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota — silently ignore */
  }
}

function setSlot(id: string, dataUrl: string): void {
  const all = loadAll();
  all[id] = dataUrl;
  saveAll(all);
}

function clearSlot(id: string): void {
  const all = loadAll();
  delete all[id];
  saveAll(all);
}

function getSlot(id: string): string | undefined {
  return loadAll()[id];
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

class ImageSlotElement extends HTMLElement {
  private root!: ShadowRoot;
  private inputEl!: HTMLInputElement;
  private imgEl!: HTMLImageElement;
  private emptyEl!: HTMLDivElement;
  private hostId = "";

  connectedCallback(): void {
    this.root = this.attachShadow({ mode: "open" });
    this.hostId = this.getAttribute("id") ?? "";
    const radius = this.getAttribute("radius") ?? "12";
    const placeholder = this.getAttribute("placeholder") ?? "Glissez une image";

    this.root.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
        }
        .frame {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: ${Number(radius)}px;
          overflow: hidden;
          border: 1px solid rgba(212, 175, 122, 0.35);
          background:
            radial-gradient(ellipse at 30% 30%, rgba(212, 175, 122, 0.10) 0%, transparent 55%),
            linear-gradient(135deg, #0a1525 0%, #14223a 50%, #0a1525 100%);
          cursor: pointer;
          isolation: isolate;
        }
        .ring {
          position: absolute;
          inset: 12px;
          border: 1px dashed rgba(212, 175, 122, 0.45);
          border-radius: ${Math.max(0, Number(radius) - 4)}px;
          pointer-events: none;
          transition: border-color 200ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        :host(.is-drop) .ring { border-color: #D4AF7A; border-style: solid; }
        .empty {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 24px;
          color: #D4AF7A;
          font-family: 'Manrope', system-ui, sans-serif;
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-align: center;
          pointer-events: none;
        }
        .empty svg { width: 28px; height: 28px; opacity: 0.75; }
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0;
          transition: opacity 320ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        img.is-loaded { opacity: 1; }
        .clear {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: rgba(8, 17, 30, 0.85);
          color: #fff;
          border: 1px solid rgba(212, 175, 122, 0.4);
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          backdrop-filter: blur(6px);
        }
        .clear:hover { color: #D4AF7A; border-color: #D4AF7A; }
        :host(.has-image) .empty { display: none; }
        :host(.has-image) .clear { display: flex; }
        input[type=file] { display: none; }
      </style>
      <div class="frame" part="frame">
        <div class="ring" part="ring"></div>
        <img alt="" part="image">
        <div class="empty" part="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="9" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <span>${placeholder}</span>
        </div>
        <button class="clear" type="button" aria-label="Retirer l'image">×</button>
        <input type="file" accept="${ACCEPTED.join(",")}">
      </div>
    `;

    this.imgEl = this.root.querySelector("img") as HTMLImageElement;
    this.emptyEl = this.root.querySelector(".empty") as HTMLDivElement;
    this.inputEl = this.root.querySelector("input") as HTMLInputElement;
    const frame = this.root.querySelector(".frame") as HTMLElement;
    const clear = this.root.querySelector(".clear") as HTMLButtonElement;

    frame.addEventListener("click", (e) => {
      if (e.target === clear) return;
      this.inputEl.click();
    });
    clear.addEventListener("click", (e) => {
      e.stopPropagation();
      this.clear();
    });
    this.inputEl.addEventListener("change", () => {
      const file = this.inputEl.files?.[0];
      if (file) void this.handleFile(file);
    });
    frame.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.classList.add("is-drop");
    });
    frame.addEventListener("dragleave", () => this.classList.remove("is-drop"));
    frame.addEventListener("drop", (e) => {
      e.preventDefault();
      this.classList.remove("is-drop");
      const file = e.dataTransfer?.files?.[0];
      if (file) void this.handleFile(file);
    });

    const existing = this.hostId ? getSlot(this.hostId) : undefined;
    if (existing) this.applyImage(existing);
  }

  private async handleFile(file: File): Promise<void> {
    if (!ACCEPTED.includes(file.type)) {
      this.flashError("Format non supporté");
      return;
    }
    if (file.size > MAX_BYTES) {
      this.flashError("Image trop lourde (>5 Mo)");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      if (this.hostId) setSlot(this.hostId, dataUrl);
      this.applyImage(dataUrl);
    } catch {
      this.flashError("Lecture impossible");
    }
  }

  private applyImage(dataUrl: string): void {
    this.imgEl.src = dataUrl;
    this.imgEl.onload = () => {
      this.imgEl.classList.add("is-loaded");
      this.classList.add("has-image");
    };
  }

  private clear(): void {
    if (this.hostId) clearSlot(this.hostId);
    this.imgEl.removeAttribute("src");
    this.imgEl.classList.remove("is-loaded");
    this.classList.remove("has-image");
  }

  private flashError(message: string): void {
    const previous = this.emptyEl.textContent;
    const span = this.emptyEl.querySelector("span");
    if (span) span.textContent = message;
    setTimeout(() => {
      if (span && previous) span.textContent = previous.trim();
    }, 1800);
  }
}

if (typeof window !== "undefined" && !customElements.get("image-slot")) {
  customElements.define("image-slot", ImageSlotElement);
}
