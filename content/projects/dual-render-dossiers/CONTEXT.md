# Dual Render Dossiers — Context für nächste Session

## Was existiert

### Techblog (a83-blog/techblog)
- **`scripts/dossier-schema.js`** — Dossier Schema V2 mit 39 Feldern, 3 Pilot-Dossiers (pilot, depth, llms), Template-Generator, Normalizer
- **`scripts/migrate-dossier-v2.js`** — Migration-Script mit Dry-Run + Backup
- **`scripts/create-dossier-template.js`** — CLI Template-Generator
- **`documents/a83-dual-render-astro-orbiter-guide.md`** — Vollständige Implementierungs-Spec für Astro 6 + Orbiter

### Orbiter Admin (packages/admin)
- Block-Editor mit Slash-Commands (`/table`, `/image`, `/video`, `/ai`)
- Table-Feld (`string[][]`) — wird von Dossiers für Claims, Sources, Relationships genutzt
- AI Assistant — `/ai` Slash-Command mit Ollama/Anthropic/OpenAI/Gemini

### Orbiter Landing (apps/landing)
- Vision-Seite mit Dual Render Konzept + Roadmap
- Docs: Calendar, Analytics, Schema-tools mit Pod Export

## Was zu bauen ist

### 1. Dossier als POD-Template
Neues Template `dossier` neben Blog, Portfolio, Business, Events:
- Collection `dossiers` mit dem V2-Schema
- 1-2 Demo-Dossiers als Beispiel-Content
- `admin/admin` User
- Template auswählbar beim Desktop App "New POD" Dialog

Dateien: `packages/admin/templates/dossier.js` (oder wo Templates definiert sind)

### 2. Editor-Sidebar für Dossier-Felder
Die Sidebar im Editor zeigt aktuell alle Felder generisch. Für Dossiers brauchen wir:
- **Gruppierung**: "Content" (title, excerpt, body) | "Research" (hypothesis, testSetup, observations, findings, limitations, openQuestions) | "Evidence" (claims, sources, relationships) | "Meta" (series, keywords, contentType, language) | "Provenance" (author, authorship, aiContribution, reviewedBy, reviewStatus, modelDisclosure) | "Agent" (summaryMachine, suggestedPrompts, dossierId, tokensApprox)
- **Feld-Gruppen collapsible** — nicht alle auf einmal sichtbar
- Schema-Feld `_group` oder `group` Property für Gruppierung
- Oder: automatische Gruppierung basierend auf Feld-Prefixen

### 3. Schema-Verbesserungen (eingebaut in dieser Session)
- `contentType` erweitern: + 'analysis', 'comparison', 'guide'
- `relatedDossiers` als Relation-Feld statt Table
- `depthConfig` — Depth-Sichtbarkeit pro Dossier
- Migration-Script: async backup fix
- Template: auto-generierte suggestedPrompts

### 4. Dual Render Felder im Orbiter-Core
Neue Feldtypen oder Feld-Properties die Dual Render unterstützen:
- `depth` Property auf Feldern — auf welcher Depth-Stufe sichtbar
- `audience` Property — 'human', 'agent', 'both'
- `summaryFor` Property — markiert Felder als Machine-Summary

### 5. llms.txt Generator
- Astro-Integration generiert `/llms.txt` beim Build
- Liest alle published Entries mit `summaryMachine` Feld
- Gibt kanonische URLs + Summaries aus
- Konfigurierbar welche Collections included werden

## Dossier Schema V2 — Felder

```
Content:     title, excerpt, humanSummary, body
Research:    hypothesis, testSetup, observations, findings, limitations, openQuestions
Evidence:    claims (table), sources (table), relationships (table)
Meta:        series, keywords, suggestedPrompts, contentType, language
Provenance:  author, authorship, aiContribution, reviewedBy, reviewStatus, modelDisclosure, version
Agent:       summaryMachine, dossierId, tokensApprox
Media:       hero, heroAlt, heroWidth, heroHeight, heroFormat, heroSize, heroHash
Dates:       updatedAt, publishedAt
```

## Depth-Modell

```
Depth 0: Erzählung (title, excerpt, body, hero) — Human Layer
Depth 1: + Hypothese, Beobachtungen, Findings — Research Layer
Depth 2: + Claims/Evidence, Sources, Structure Map — Evidence Layer
Depth 3: Machine Mode — summaryMachine, LLMS Block, alle Metadaten
```

## Dateien die geändert werden müssen

- `a83-blog/techblog/scripts/dossier-schema.js` — Schema-Verbesserungen
- `a83-blog/techblog/scripts/migrate-dossier-v2.js` — Async fix
- `packages/admin/templates/` — neues Dossier-Template (noch zu erstellen)
- `packages/admin/public/editor.html` — Feld-Gruppierung in Sidebar
- `packages/core/src/db.js` — ggf. Template-System erweitern
- `packages/integration/src/index.js` — llms.txt Generator

## Referenzen

- Dual Render Konzept: https://a83tech.com
- Vision-Seite: https://orbiter.sh/vision
- Dossier Guide: `a83-blog/documents/a83-dual-render-astro-orbiter-guide.md`
- Orbiter Roadmap: `memory/project_roadmap.md` → Dual Render Phase
