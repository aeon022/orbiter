# LinkedIn — Dual Render (Deutsch)

---

**Die Hälfte deiner Website-Besucher werden bald AI Agents sein. Baust du für sie?**

Google SGE, ChatGPT, Perplexity — sie lesen deine Website schon jetzt. Sie brauchen kein CSS. Sie brauchen deine Daten.

Das alte Web hatte ein Publikum: Menschen. Das neue Web hat zwei. Und die meisten Websites bedienen nur eines.

Wir nennen das **Dual Render** — eine Content-Quelle, zwei Output-Ebenen:

🧑 **Human Layer**: CSS, Typografie, Bilder, narrativer Fluss — was Besucher sehen

🤖 **Agent Layer**: /llms.txt Content-Maps, strukturierte JSON-Feeds, Semantic Depth Metadata — was AI-Systeme konsumieren

Beides aus demselben DOM. Keine Duplikation. Keine separate "API-Version." Ein Build, zwei Zielgruppen.

Was das in der Praxis heißt:
→ Dein Content taucht in AI-Antworten auf, nicht nur in Suchergebnissen
→ Agents zitieren deine Daten statt die Zusammenfassung von jemand anderem
→ Du kontrollierst das Narrativ in beiden Ebenen

Wir bauen das in Orbiter ein, ein Open-Source CMS in dem alles in einer einzigen SQLite-Datei lebt. Der Stack: Content im POD → Astro baut → Dual Render Output.

Kommt bald: automatische /llms.txt Generierung, Semantic Depth Fields im Editor, Agent vs. Human Analytics.

Die Unternehmen, die zuerst für beide Zielgruppen bauen, bestimmen wie AI über ihre Branche spricht. Alle anderen werden zusammengefasst.

→ Dual Render: https://a83tech.com
→ Orbiter: https://github.com/aeon022/orbiter
→ Vision: https://orbiter.sh/vision

#ai #webdev #contentarchitecture #dualrender #opensource
