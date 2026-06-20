---
title: "Dein nächster Besucher ist kein Mensch — warum deine Website zwei Ebenen braucht"
tags: webdev, ai, architecture, cms
canonical_url: https://a83tech.com
cover_image: # TODO: Dual Render Diagramm Screenshot von orbiter.sh/vision
---

# Dein nächster Besucher ist kein Mensch — warum deine Website zwei Ebenen braucht

Die Hälfte deiner Website-"Besucher" werden bald AI Agents sein. Keine dummen Scraper — intelligente Systeme, die suchen, vergleichen, zusammenfassen und Fragen beantworten. Mit deinen Daten.

Google SGE. ChatGPT Browse. Perplexity. Claude. Die lesen deine Seiten schon jetzt. Und dein CSS interessiert sie nicht.

## Das Problem

Heute werden Websites für ein Publikum gebaut: Menschen. Typografie, Farbe, Layout, Animation — alles dient dem menschlichen Auge. Aber AI Agents, die dieselbe Seite lesen, bekommen eine Suppe aus Divs, Klassen und Präsentations-Markup. Sie müssen die Struktur aus dem Styling *reverse-engineeren*.

Das funktionierte, als Crawler simpel waren. Es bricht zusammen, wenn der Crawler intelligenter ist als die meisten deiner Leser.

## Der Wandel: vom Blockieren zum Bauen

Der alte Ansatz war `robots.txt` — entscheide, wer rein darf. Der neue Ansatz ist **Dual Render**: Content aktiv für beide Zielgruppen bauen.

Ein DOM. Zwei Renderings. CSS-kontrollierte semantische Tiefe.

## Wie Dual Render funktioniert

Statt zwei Versionen deines Contents zu pflegen (eine für Menschen, eine für Maschinen), baust du eine einzige strukturierte Quelle und renderst sie unterschiedlich — je nachdem, wer liest.

**Human Layer** — was deine Besucher sehen:
- CSS-Layout und Typografie
- Bilder, Video, Animation
- Narrativer Fluss und visuelle Hierarchie
- Progressive Disclosure via Scroll und Interaktion

**Agent Layer** — was AI-Systeme konsumieren:
- `/llms.txt` — eine strukturierte Content-Map, wie `sitemap.xml` aber für LLMs
- `/feed.json` — Content als strukturierte Daten, schema-aware
- Semantic Depth Metadata — Absätze als "surface" oder "deep" getaggt, damit Agents ihren Detailgrad wählen können
- RAG-ready Format — optimiert für Retrieval-Augmented Generation

Beide Layer kommen aus derselben Quelle. Keine Duplikation. Keine Sync-Probleme. Ein Build erzeugt beides.

## Der Stack

```
Content (CMS)  →  Build (SSG)  →  Dual Render
                                    ├── Human Layer
                                    └── Agent Layer
```

Wir bauen das in [Orbiter](https://github.com/aeon022/orbiter) ein, ein Single-File CMS für Astro. Der Content lebt in einer SQLite-Datei (einem POD). Astro baut die Seite. Der Output bedient beide Zielgruppen.

Kommt bald:
- **`/llms.txt` Auto-Generierung** bei jedem Build — kein manuelles Pflegen
- **Semantic Depth Fields** im CMS — Content als surface oder deep markieren
- **Agent Analytics** — sehen, welcher Anteil deiner Leser AI-Systeme sind

## Warum das jetzt wichtig ist

Wenn dein Content nicht für Agents strukturiert ist, bist du unsichtbar für das am schnellsten wachsende Publikum im Web. Nicht in 5 Jahren — jetzt.

Die Unternehmen, die zuerst für beide Zielgruppen bauen, werden das Narrativ bestimmen. Alle anderen werden zusammengefasst — von einem fremden Agent, der fremde strukturierte Daten liest.

## Ausprobieren

- **Dual Render Konzept**: [a83tech.com](https://a83tech.com)
- **Orbiter CMS**: [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
- **Vision & Roadmap**: [orbiter.sh/vision](https://orbiter.sh/vision)

Das Web spaltet sich in zwei Ebenen. Bau für beide.
