# Maison Fwurtz — Site vitrine

Site vitrine premium pour Maison Fwurtz, avec conciergerie « Marie » propulsée par Groq.

- **Framework** : [Astro 5](https://astro.build) en mode SSR (adapter Node), runtime Node 22.
- **Package manager** : [Bun](https://bun.sh) (lockfile committé, build reproductible).
- **Architecture** : clean architecture par feature (`domain` → `application` → `infra` → `presentation`).
- **Tests** : Vitest (unit, couverture 99 %), Playwright (E2E sur la home + le widget concierge).
- **Conciergerie** : appelle `openai/gpt-oss-120b` via Groq derrière un endpoint SSR (`/api/concierge`) — la clé API ne quitte jamais le serveur.

## Démarrer

```bash
bun install
cp .env.example .env
# Renseigner GROQ_API_KEY dans .env
bun run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000).

## Tests

```bash
bun run test           # Vitest + couverture (seuil 80 %)
bun run typecheck      # astro check (strictest)
bun run test:e2e       # Playwright (build préalable: bun run build)
```

## Build et exécution en local

```bash
bun run build
bun run start
```

## Variables d'environnement

| Variable | Obligatoire | Défaut | Description |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | ✓ | — | Clé API Groq pour la conciergerie |
| `GROQ_MODEL` |  | `openai/gpt-oss-120b` | Modèle utilisé |
| `CONCIERGE_RATE_LIMIT` |  | `20` | Requêtes max par fenêtre par IP |
| `CONCIERGE_RATE_WINDOW_SECONDS` |  | `60` | Taille de la fenêtre (s) |
| `PUBLIC_SITE_URL` |  | `https://maison-fwurtz.fr` | URL publique (canonical, OG) |

## Structure

```
src/
├── components/        # Présentation Astro (layout, home, concierge, ui)
├── features/
│   └── concierge/     # Feature concierge, organisée en couches
│       ├── domain/        # Types, prompt, fallback, validation — pur
│       ├── application/   # Use case replyToVisitor
│       ├── infra/         # Groq client, config, rate limiter, composition
│       └── presentation/  # Script navigateur
├── layouts/           # BaseLayout
├── pages/
│   ├── index.astro    # Home page (livrable principal)
│   └── api/
│       └── concierge.ts   # Endpoint POST proxifiant Groq
├── scripts/           # Interactions DOM, image-slot
└── styles/            # CSS du design system + concierge
```

## Déploiement Coolify

L'image est buildée via le `Dockerfile` (multi-stage Bun→Node).

- **Branche `main`** → environnement `production`
- **Branche `stg`** → environnement `staging`
- Coolify résout les noms via sslip.io : `app.fwurtz.157.180.43.90.sslip.io` et `stg-app.fwurtz.157.180.43.90.sslip.io`.

Le secret `GROQ_API_KEY` est défini dans les variables Coolify de chaque environnement (jamais committé).
