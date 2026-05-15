/**
 * <image-slot> — read-only, on-brand placeholder.
 *
 * Visuals: a navy frame with a soft gold gradient, a thin gold ring, and a
 * discreet Maison-Fwurtz monogram. If an image has been assigned to this slot
 * from the back office, it is fetched from /api/image-slots/:id and faded in.
 *
 * Visitors cannot drop, upload, or modify anything: image management lives in
 * the back office.
 */

class ImageSlotElement extends HTMLElement {
  private root!: ShadowRoot;
  private imgEl!: HTMLImageElement;
  private hostId = "";

  connectedCallback(): void {
    this.root = this.attachShadow({ mode: "open" });
    this.hostId = this.getAttribute("id") ?? "";
    const radius = Number(this.getAttribute("radius") ?? "12");
    const label = this.getAttribute("placeholder") ?? "";

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
          border-radius: ${radius}px;
          overflow: hidden;
          border: 1px solid rgba(212, 175, 122, 0.35);
          background:
            radial-gradient(ellipse at 30% 30%, rgba(212, 175, 122, 0.10) 0%, transparent 55%),
            linear-gradient(135deg, #0a1525 0%, #14223a 50%, #0a1525 100%);
          isolation: isolate;
        }
        .ring {
          position: absolute;
          inset: 12px;
          border: 1px solid rgba(212, 175, 122, 0.28);
          border-radius: ${Math.max(0, radius - 4)}px;
          pointer-events: none;
        }
        .corner {
          position: absolute;
          width: 18px;
          height: 18px;
          border: 1px solid rgba(212, 175, 122, 0.55);
          pointer-events: none;
        }
        .corner.tl { top: 18px; left: 18px; border-right: none; border-bottom: none; }
        .corner.tr { top: 18px; right: 18px; border-left: none; border-bottom: none; }
        .corner.bl { bottom: 18px; left: 18px; border-right: none; border-top: none; }
        .corner.br { bottom: 18px; right: 18px; border-left: none; border-top: none; }
        .center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          color: rgba(212, 175, 122, 0.75);
          font-family: 'Cormorant Garamond', Georgia, serif;
          pointer-events: none;
          padding: 24px;
          text-align: center;
        }
        .monogram {
          width: 42px;
          height: 42px;
          opacity: 0.55;
        }
        .label {
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(212, 175, 122, 0.55);
          font-family: 'Manrope', system-ui, sans-serif;
          font-weight: 500;
          max-width: 28ch;
          line-height: 1.4;
        }
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0;
          transition: opacity 360ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
        img.is-loaded { opacity: 1; }
        :host(.has-image) .center,
        :host(.has-image) .corner,
        :host(.has-image) .ring { display: none; }
      </style>
      <div class="frame" part="frame">
        <span class="corner tl"></span>
        <span class="corner tr"></span>
        <span class="corner bl"></span>
        <span class="corner br"></span>
        <div class="ring" part="ring"></div>
        <img alt="" part="image">
        <div class="center" part="empty">
          <svg class="monogram" viewBox="0 0 50 50" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 36 L6 8 L13 24 L20 8 L20 36"/>
            <path d="M28 36 L28 15 C28 11 30 8 34 8"/>
            <line x1="25" y1="17" x2="36" y2="17"/>
          </svg>
          ${label ? `<span class="label">${label}</span>` : ""}
        </div>
      </div>
    `;

    this.imgEl = this.root.querySelector("img") as HTMLImageElement;
    if (this.hostId) {
      void this.tryLoadFromBackend();
    }
  }

  private async tryLoadFromBackend(): Promise<void> {
    try {
      // Read PUBLIC_API_URL from a meta tag injected by BaseLayout. When the
      // site is split off from the backend (Coolify deployment with APP_ROLE),
      // it points to the api subdomain; in dev/all-in-one mode it's empty
      // and we fall back to a same-origin fetch.
      const meta = document.querySelector('meta[name="x-mf-api-url"]');
      const base = meta?.getAttribute("content")?.trim() ?? "";
      const url = `${base}/api/image-slots/${encodeURIComponent(this.hostId)}`;
      const r = await fetch(url, {
        headers: { Accept: "application/json" },
        credentials: "omit",
      });
      if (!r.ok) return;
      const data = (await r.json()) as { url?: string; alt?: string };
      if (!data.url) return;
      // The url returned by the backend is path-only (/api/media/X). Prefix
      // with the API base so cross-origin loads work too.
      this.imgEl.alt = data.alt ?? "";
      this.imgEl.src = data.url.startsWith("http") ? data.url : `${base}${data.url}`;
      this.imgEl.onload = () => {
        this.imgEl.classList.add("is-loaded");
        this.classList.add("has-image");
      };
    } catch {
      /* network error — keep the placeholder, no noise */
    }
  }
}

if (typeof window !== "undefined" && !customElements.get("image-slot")) {
  customElements.define("image-slot", ImageSlotElement);
}
