/**
 * Concierge widget — browser runtime. Mirrors the original maquette UX:
 * floating gold FAB, toast invitation after 16s, slide-up panel with
 * context-aware greeting, quick replies, conversion CTAs, lead capture,
 * localStorage persistence across page navigations.
 *
 * The LLM call is delegated to the `/api/concierge` endpoint so the Groq
 * API key never reaches the browser.
 */

import { detectPage, greetingFor, CONCIERGE_NAME } from "../domain/prompt";
import { fallbackReply } from "../domain/fallback";
import type { Message, PageContext } from "../domain/types";

interface UIMessage extends Message {
  readonly time: string;
}

interface PersistedState {
  messages: UIMessage[];
  toastShown: boolean;
  rdvProposed: boolean;
  priceShown: boolean;
  opened: boolean;
  lead: { name: string; email: string; ts: number; page: PageContext } | null;
}

const STORAGE_KEY = "mf-concierge-v2";
const SESSION_KEY = "mf-concierge-session";
const TOAST_DELAY_MS = 16_000;
const PROPOSE_RDV_AFTER = 3;
const HISTORY_CAP = 16;
const POLL_INTERVAL_MS = 6_000;

function ensureSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

const INITIAL_QUICK_REPLIES = [
  "Découvrir vos services",
  "Combien ça coûte ?",
  "Réserver un échange",
  "Une question rapide",
];

const ICONS = {
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21 L12 17 L17 17 a4 4 0 004-4 V8 a4 4 0 00-4-4 H7 a4 4 0 00-4 4 v5 a4 4 0 004 4 H8 V21Z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="13" x2="13" y2="13"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="4"/><polygon points="4 20 10 13 15 18 20 4"/></svg>',
};

const defaultState = (): PersistedState => ({
  messages: [],
  toastShown: false,
  rdvProposed: false,
  priceShown: false,
  opened: false,
  lead: null,
});

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function timeLabel(): string {
  return new Date()
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");
}

function formatBody(text: string): string {
  return text
    .replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"))
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function init(): void {
  if (document.getElementById("mf-fab")) return;

  const state = loadState();
  const saveState = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota — fine to drop */
    }
  };

  const fab = Object.assign(document.createElement("button"), {
    id: "mf-fab",
    className: "mf-fab",
  });
  fab.setAttribute("aria-label", "Ouvrir la conciergerie");
  fab.innerHTML = `
    <span class="mf-fab__icon-open">${ICONS.open}</span>
    <span class="mf-fab__icon-close">${ICONS.close}</span>
    <span class="mf-fab__badge" id="mf-badge"></span>
  `;

  const toast = document.createElement("div");
  toast.id = "mf-toast";
  toast.className = "mf-toast";
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <div class="mf-toast__avatar">M</div>
    <div class="mf-toast__text"><strong>${CONCIERGE_NAME}</strong>Une question ? Je suis là pour vous orienter.</div>
    <button class="mf-toast__close" aria-label="Fermer">${ICONS.close}</button>
  `;

  const panel = document.createElement("aside");
  panel.id = "mf-panel";
  panel.className = "mf-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Conciergerie Maison Fwurtz");
  panel.innerHTML = `
    <div class="mf-header">
      <div class="mf-header__row">
        <div class="mf-header__avatar">M</div>
        <div class="mf-header__meta">
          <div class="mf-header__name">${CONCIERGE_NAME}</div>
          <div class="mf-header__sub"><strong>● En ligne</strong> — répond en quelques minutes</div>
        </div>
        <button class="mf-header__close" id="mf-close" aria-label="Fermer">${ICONS.close}</button>
      </div>
      <div class="mf-header__intro">Conciergerie Maison Fwurtz</div>
    </div>
    <div class="mf-messages" id="mf-messages" role="log"></div>
    <div class="mf-footer">
      <div class="mf-input-row">
        <textarea class="mf-input" id="mf-input" rows="1" placeholder="Écrivez votre message…"></textarea>
        <button class="mf-send" id="mf-send" disabled aria-label="Envoyer">${ICONS.send}</button>
      </div>
      <div class="mf-disclaimer">Réponse sous 24h ouvrées · <a href="mailto:contact@maison-fwurtz.fr">contact@maison-fwurtz.fr</a></div>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(toast);
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector<HTMLDivElement>("#mf-messages")!;
  const inputEl = panel.querySelector<HTMLTextAreaElement>("#mf-input")!;
  const sendBtn = panel.querySelector<HTMLButtonElement>("#mf-send")!;
  const closeBtn = panel.querySelector<HTMLButtonElement>("#mf-close")!;
  const badge = fab.querySelector<HTMLSpanElement>("#mf-badge")!;
  const toastClose = toast.querySelector<HTMLButtonElement>(".mf-toast__close")!;

  const scrollToBottom = (): void => {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  };

  function renderMessage(msg: UIMessage, animate = true): HTMLDivElement {
    const el = document.createElement("div");
    el.className = `mf-msg mf-msg--${msg.role}`;
    if (!animate) el.style.animation = "none";
    const author =
      msg.role === "concierge" ? `<div class="mf-msg__author">${CONCIERGE_NAME}</div>` : "";
    el.innerHTML = `${author}<div class="mf-msg__bubble">${formatBody(msg.text)}</div><div class="mf-msg__time">${msg.time}</div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function renderQuickReplies(items: readonly string[]): void {
    messagesEl.querySelector(".mf-quick")?.remove();
    if (!items.length) return;
    const wrap = document.createElement("div");
    wrap.className = "mf-quick";
    for (const label of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mf-quick__btn";
      b.textContent = label;
      b.addEventListener("click", () => {
        wrap.remove();
        void sendUserMessage(label);
      });
      wrap.appendChild(b);
    }
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  function renderTyping(): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "mf-msg mf-msg--concierge";
    el.id = "mf-typing-bubble";
    el.innerHTML = `<div class="mf-msg__author">${CONCIERGE_NAME}</div><div class="mf-typing"><span class="mf-typing__dot"></span><span class="mf-typing__dot"></span><span class="mf-typing__dot"></span></div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function removeTyping(): void {
    document.getElementById("mf-typing-bubble")?.remove();
  }

  function renderCTA(input: {
    eyebrow: string;
    title: string;
    sub?: string;
    primary: string;
    secondary?: string;
    onPrimary?: () => void;
    onSecondary?: () => void;
  }): void {
    const el = document.createElement("div");
    el.className = "mf-cta";
    const sub = input.sub ? `<div class="mf-cta__sub">${input.sub}</div>` : "";
    const secondary = input.secondary
      ? `<button class="mf-cta__btn mf-cta__btn--ghost" data-secondary>${input.secondary}</button>`
      : "";
    el.innerHTML = `
      <div class="mf-cta__eyebrow">${input.eyebrow}</div>
      <div class="mf-cta__title">${input.title}</div>
      ${sub}
      <div class="mf-cta__actions">
        <button class="mf-cta__btn" data-primary>${input.primary}</button>
        ${secondary}
      </div>
    `;
    el.querySelector("[data-primary]")?.addEventListener("click", () => {
      input.onPrimary?.();
      el.remove();
    });
    el.querySelector("[data-secondary]")?.addEventListener("click", () => {
      input.onSecondary?.();
      el.remove();
    });
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function renderLeadCapture(reason: string): void {
    if (state.lead) return;
    const el = document.createElement("div");
    el.className = "mf-lead";
    el.innerHTML = `
      <div class="mf-lead__label">${reason}</div>
      <input class="mf-lead__input" id="mf-lead-name" placeholder="Votre prénom" autocomplete="given-name">
      <input class="mf-lead__input" id="mf-lead-email" type="email" placeholder="Adresse e-mail" autocomplete="email">
      <button class="mf-lead__btn" data-submit>Transmettre à Marie</button>
    `;
    messagesEl.appendChild(el);
    scrollToBottom();
    const btn = el.querySelector<HTMLButtonElement>("[data-submit]")!;
    btn.addEventListener("click", () => {
      const name = el.querySelector<HTMLInputElement>("#mf-lead-name")!.value.trim();
      const email = el.querySelector<HTMLInputElement>("#mf-lead-email")!.value.trim();
      if (!name || !email.includes("@")) {
        btn.textContent = "Vérifiez vos informations";
        setTimeout(() => (btn.textContent = "Transmettre à Marie"), 1800);
        return;
      }
      state.lead = { name, email, ts: Date.now(), page: detectPage(location.pathname) };
      saveState();
      btn.disabled = true;
      btn.textContent = "✓ Bien reçu, merci.";
      setTimeout(() => {
        el.remove();
        addConcierge(
          `Merci ${name}. Je reviens vers vous très rapidement — sous 24h ouvrées au plus tard. *À très vite.*`,
        );
      }, 800);
    });
  }

  function addUser(text: string): void {
    const msg: UIMessage = { role: "user", text, time: timeLabel() };
    state.messages.push(msg);
    saveState();
    renderMessage(msg);
  }

  function addConcierge(text: string): void {
    const msg: UIMessage = { role: "concierge", text, time: timeLabel() };
    state.messages.push(msg);
    saveState();
    renderMessage(msg);
  }

  const sessionId = ensureSessionId();
  let lastPollTs = new Date(0).toISOString();
  const seenAdminIds = new Set<string>();

  async function callBackend(): Promise<string> {
    const history = state.messages.slice(-HISTORY_CAP).map(({ role, text }) => ({ role, text }));
    const page = detectPage(location.pathname);
    const res = await fetch("/api/concierge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ history, page, sessionId }),
    });
    if (!res.ok) {
      throw new Error(`status_${res.status}`);
    }
    const body = (await res.json()) as { text?: string };
    return typeof body.text === "string" ? body.text : "";
  }

  async function pollAdminReplies(): Promise<void> {
    try {
      const since = encodeURIComponent(lastPollTs);
      const r = await fetch(`/api/concierge/poll?sessionId=${encodeURIComponent(sessionId)}&since=${since}`, {
        headers: { Accept: "application/json" },
      });
      if (!r.ok) return;
      const body = (await r.json()) as {
        messages: { id: string; text: string; author: string; createdAt: string }[];
        status: string | null;
      };
      for (const m of body.messages ?? []) {
        if (seenAdminIds.has(m.id)) continue;
        seenAdminIds.add(m.id);
        addConcierge(m.text);
        lastPollTs = m.createdAt;
        if (!panel.classList.contains("is-open")) showBadge("•");
      }
      // Track polling tip even when no new message, to avoid resending the
      // entire conversation every poll.
      if (body.messages && body.messages.length === 0) {
        lastPollTs = new Date().toISOString();
      }
    } catch {
      /* network blip — try again next tick */
    }
  }
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  function startPolling(): void {
    if (pollTimer) return;
    void pollAdminReplies();
    pollTimer = setInterval(() => void pollAdminReplies(), POLL_INTERVAL_MS);
  }
  function stopPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function sendUserMessage(rawText: string): Promise<void> {
    const text = rawText.trim();
    if (!text) return;
    addUser(text);
    inputEl.value = "";
    autoResize();
    updateSend();

    const userCount = state.messages.filter((m) => m.role === "user").length;
    renderTyping();
    try {
      const reply = await callBackend();
      removeTyping();
      addConcierge(reply || fallbackReply(text));
    } catch {
      removeTyping();
      addConcierge(fallbackReply(text));
    }
    maybeShowConversionMoment(text.toLowerCase(), userCount);
  }

  function maybeShowConversionMoment(lc: string, userCount: number): void {
    const mentionsPrice = /prix|tarif|combien|co[uû]te|devis/.test(lc);
    const mentionsRdv = /rdv|rendez-?vous|appel|cr[eé]neau|disponible|libre|quand/.test(lc);

    if (mentionsRdv || (userCount >= PROPOSE_RDV_AFTER && !state.rdvProposed)) {
      state.rdvProposed = true;
      saveState();
      setTimeout(
        () =>
          renderCTA({
            eyebrow: "Premier échange",
            title: "Réservons <em>30 minutes</em> ensemble",
            sub: "Sans engagement, en visio ou téléphone. Je vous propose 3 créneaux cette semaine.",
            primary: "Voir les créneaux",
            secondary: "Plus tard",
            onPrimary: () =>
              renderLeadCapture(
                "Indiquez-moi vos coordonnées, je vous envoie 3 propositions de créneaux :",
              ),
            onSecondary: () =>
              addConcierge(
                "Bien sûr, prenez votre temps. Je reste disponible quand vous voulez. *À très vite.*",
              ),
          }),
        600,
      );
    } else if (mentionsPrice && !state.priceShown) {
      state.priceShown = true;
      saveState();
      setTimeout(
        () =>
          renderCTA({
            eyebrow: "Quelques repères",
            title: "Nos <em>fourchettes</em> indicatives",
            sub: "Audit de site : 500€ — Référencement naturel : 25€/mois — Accompagnements globaux sur devis personnalisé.",
            primary: "Demander un devis",
            secondary: "Continuer la discussion",
            onPrimary: () =>
              renderLeadCapture("Pour préparer un devis sur mesure, vos coordonnées :"),
          }),
        600,
      );
    }
  }

  function initializeConversation(): void {
    if (state.messages.length === 0) {
      const page = detectPage(location.pathname);
      const greeting = greetingFor(page);
      const msg: UIMessage = { role: "concierge", text: greeting, time: timeLabel() };
      state.messages.push(msg);
      saveState();
      renderMessage(msg, false);
      renderQuickReplies(INITIAL_QUICK_REPLIES);
    }
  }

  function openPanel(): void {
    panel.classList.add("is-open");
    fab.classList.add("is-open");
    hideToast();
    hideBadge();
    state.opened = true;
    saveState();
    initializeConversation();
    startPolling();
    setTimeout(() => inputEl.focus(), 320);
  }
  function closePanel(): void {
    panel.classList.remove("is-open");
    fab.classList.remove("is-open");
    stopPolling();
  }

  fab.addEventListener("click", () =>
    panel.classList.contains("is-open") ? closePanel() : openPanel(),
  );
  closeBtn.addEventListener("click", closePanel);
  toastClose.addEventListener("click", (e) => {
    e.stopPropagation();
    hideToast();
    state.toastShown = true;
    saveState();
  });
  toast.addEventListener("click", (e) => {
    if ((e.target as Element).closest(".mf-toast__close")) return;
    openPanel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) closePanel();
  });

  function showToast(): void {
    if (state.toastShown || state.opened) return;
    if (window.innerWidth <= 640) return;
    toast.classList.add("is-visible");
    showBadge("1");
  }
  function hideToast(): void {
    toast.classList.remove("is-visible");
  }
  function showBadge(text: string): void {
    badge.textContent = text;
    badge.classList.add("is-active");
  }
  function hideBadge(): void {
    badge.classList.remove("is-active");
  }
  if (!state.toastShown && !state.opened) setTimeout(showToast, TOAST_DELAY_MS);

  function autoResize(): void {
    inputEl.style.height = "auto";
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
  }
  function updateSend(): void {
    sendBtn.disabled = !inputEl.value.trim();
  }
  inputEl.addEventListener("input", () => {
    autoResize();
    updateSend();
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendUserMessage(inputEl.value);
    }
  });
  sendBtn.addEventListener("click", () => void sendUserMessage(inputEl.value));

  // Replay history (no animation) so reopening keeps the context.
  if (state.messages.length > 0) {
    state.messages.forEach((m) => renderMessage(m, false));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
