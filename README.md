# Orbiter

> Kreist um die Daten. Hält alles im Blick.

Portable single-file CMS for Astro — everything stored in one `.pod` file.

## Packages

| Package | Description |
|---|---|
| `@orbiter/core` | SQLite engine — reads and writes `.pod` files |
| `@orbiter/integration` | Astro integration — bridges pod to `getCollection()` |
| `@orbiter/admin` | Admin UI — Phase 2 |

## Quick Start

```bash
# Install dependencies
npm install

# Seed the demo pod
npm run seed --workspace=apps/demo

# Start dev server
npm run dev
```

## Architecture

All content lives in a single `.pod` file (SQLite).
No cloud. No API keys. Copy the file — done.

```
orbiter/
├── packages/
│   ├── core/          @orbiter/core
│   ├── integration/   @orbiter/integration
│   └── admin/         @orbiter/admin (Phase 2)
└── apps/
    └── demo/          Demo Astro site
```

---

*ABTEILUNG83 — Less Noise. Nice Data. No Bloat.*
