/**
 * Maison Fwurtz — page interactions (sticky header, mobile nav, reveal,
 * RDV modal, fake-submit, FAQ accordion, gold custom cursor).
 * Pure DOM + IntersectionObserver. Single subscription per element.
 */

function initStickyHeader(): void {
  const header = document.querySelector<HTMLElement>(".site-header");
  if (!header) return;
  const onScroll = (): void => {
    if (window.scrollY > 12) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initMobileMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>(".nav__toggle");
  const mobile = document.querySelector<HTMLElement>(".nav__mobile");
  if (!toggle || !mobile) return;
  const open = (): void => {
    mobile.classList.add("is-open");
    mobile.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };
  const close = (): void => {
    mobile.classList.remove("is-open");
    mobile.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };
  toggle.addEventListener("click", () => {
    if (mobile.classList.contains("is-open")) close();
    else open();
  });
  mobile.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", close),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobile.classList.contains("is-open")) close();
  });
}

function initScrollReveal(): void {
  const els = document.querySelectorAll<HTMLElement>(".reveal");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
  );
  els.forEach((el) => io.observe(el));
}

function initRdvModal(): void {
  const modal = document.getElementById("rdv-modal");
  if (!modal) return;
  const open = (): void => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const close = (): void => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  document.querySelectorAll<HTMLElement>("[data-open-rdv]").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    }),
  );
  document.querySelectorAll<HTMLElement>("[data-close-rdv]").forEach((btn) =>
    btn.addEventListener("click", close),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
}

function initFakeSubmit(): void {
  const modal = document.getElementById("rdv-modal");
  document.querySelectorAll<HTMLFormElement>("form[data-fake-submit]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (!btn) return;
      const original = btn.textContent ?? "";
      btn.textContent = "Envoi en cours…";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = "✓  Message envoyé";
        setTimeout(() => {
          form.reset();
          btn.textContent = original;
          btn.disabled = false;
          if (modal) {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
          }
        }, 1800);
      }, 800);
    });
  });
}

function initFaq(): void {
  document.querySelectorAll<HTMLButtonElement>(".faq__btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const item = btn.closest<HTMLElement>(".faq__item");
      if (!item?.parentElement) return;
      const wasOpen = item.classList.contains("is-open");
      item.parentElement
        .querySelectorAll<HTMLElement>(".faq__item")
        .forEach((i) => i.classList.remove("is-open"));
      if (!wasOpen) item.classList.add("is-open");
    }),
  );
}

function initCustomCursor(): void {
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
  document.body.classList.add("has-custom-cursor");
  const dot = Object.assign(document.createElement("div"), { className: "cursor-dot" });
  const ring = Object.assign(document.createElement("div"), { className: "cursor-ring" });
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = -100;
  let my = -100;
  let rx = -100;
  let ry = -100;
  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = `${mx}px`;
    dot.style.top = `${my}px`;
  });
  const raf = (): void => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.left = `${rx}px`;
    ring.style.top = `${ry}px`;
    requestAnimationFrame(raf);
  };
  raf();

  document.addEventListener("mouseleave", () => {
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  });
  document.addEventListener("mouseenter", () => {
    dot.style.opacity = "1";
    ring.style.opacity = "1";
  });

  const selectors =
    "a, button, input, textarea, [data-open-rdv], .faq__btn, .service-card, .bigcard, .ebook-card";
  document.querySelectorAll<HTMLElement>(selectors).forEach((el) => {
    el.addEventListener("mouseenter", () => {
      dot.classList.add("is-hover");
      ring.classList.add("is-hover");
    });
    el.addEventListener("mouseleave", () => {
      dot.classList.remove("is-hover");
      ring.classList.remove("is-hover");
    });
  });
}

function boot(): void {
  initStickyHeader();
  initMobileMenu();
  initScrollReveal();
  initRdvModal();
  initFakeSubmit();
  initFaq();
  initCustomCursor();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
