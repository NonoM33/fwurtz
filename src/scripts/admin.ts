/**
 * Back-office shared interactions: mobile menu, tab switching, logout, save feedback.
 */

const aside = document.querySelector(".admin-aside");
const backdrop = document.getElementById("admin-aside-backdrop");
const menuToggle = document.getElementById("admin-menu-toggle");

function openMenu(): void {
  aside?.classList.add("is-open");
  backdrop?.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeMenu(): void {
  aside?.classList.remove("is-open");
  backdrop?.classList.remove("is-open");
  document.body.style.overflow = "";
}

menuToggle?.addEventListener("click", openMenu);
backdrop?.addEventListener("click", closeMenu);
aside?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    if (window.innerWidth <= 1024) closeMenu();
  }),
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

document.querySelectorAll<HTMLElement>(".tabs").forEach((group) => {
  group.querySelectorAll<HTMLButtonElement>(".tabs__tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      group
        .querySelectorAll(".tabs__tab")
        .forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
    });
  });
});

document
  .getElementById("admin-logout")
  ?.addEventListener("click", async () => {
    await fetch("/api/admin/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    window.location.href = "/admin";
  });

document.querySelectorAll<HTMLButtonElement>("[data-save]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const original = btn.textContent ?? "";
    btn.textContent = "Enregistrement…";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "✓  Enregistré";
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1800);
    }, 500);
  });
});
