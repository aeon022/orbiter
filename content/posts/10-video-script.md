# Orbiter v0.3.64 — Demo Video Script

## Meta

- **Length**: ~3 minutes
- **Format**: Screen recording with voiceover (or text overlays)
- **Resolution**: 1920×1080
- **Tool**: OBS / ScreenFlow / QuickTime
- **Music**: Lo-fi or ambient (optional, low volume)
- **Server**: `http://localhost:4399` (Station mode, Space theme, dark)

---

## Pre-Recording Checklist

- [ ] Dev server running on 4399 with demo pod
- [ ] Station mode (xfce) active, Space theme, dark scheme
- [ ] Create 2-3 scheduled entries (different dates this month)
- [ ] Create 1 expiring entry (unpublish_at set)
- [ ] Have mix of published/draft entries across collections
- [ ] Browser: clean tab, no extensions visible, no bookmarks bar
- [ ] Font size comfortable at 1080p

---

## Scene 1 — Hook (0:00–0:15)

**Show**: Empty desktop → double-click Orbiter.app → login screen appears

**Text overlay**:
> Your entire CMS. One file. No cloud.

**Voiceover**:
> "What if your CMS was a single file? No database server, no cloud account, no Docker. Just one SQLite file called a POD — and a desktop app to manage it."

---

## Scene 2 — Dashboard (0:15–0:35)

**Show**: Login → Dashboard loads in Station mode

**Walk through** (pause on each):
1. Hero bar — site name, date, "Open site" link
2. Calendar widget — mini month grid with colored dots, upcoming entries
3. Recently edited — list with status pills
4. Stats column — total, published, drafts, media
5. Dock at bottom — hover over collection items, show preview cards

**Voiceover**:
> "The dashboard gives you the full picture. This calendar widget shows what's scheduled, what's published, and what's expiring — all at a glance. The dock at the bottom gives quick access to everything."

---

## Scene 3 — Calendar Page (0:35–1:05)

**Show**: Click "Full calendar →" link (or Calendar in dock)

**Actions**:
1. Month grid loads — point out color-coded entries
2. Click on a day with entries → sidebar shows detail list
3. Click filter button "Scheduled" → only blue entries
4. Click "All" again
5. Navigate to next month with → arrow key
6. Press T to jump back to today

**Voiceover**:
> "The calendar page is the full view. Blue for scheduled, gold for expiring, green for published. Click a day to see what's there. Filter by status. Arrow keys to navigate months, T for today. Click any entry to jump straight to the editor."

---

## Scene 4 — Editor (1:05–1:30)

**Show**: Click a scheduled entry from the calendar sidebar → editor opens

**Actions**:
1. Show the block editor with content
2. Scroll sidebar — fields panel (title, category, etc.)
3. Show a table field with data in it
4. Add a row to the table, type something
5. Show the publish_at date in the meta panel

**Voiceover**:
> "The editor has a block-based content area on the left and schema fields on the right. This table field is a mini-spreadsheet — add rows, add columns, tab between cells. It's stored as a simple JSON array. And down here you can see the scheduled publish date."

---

## Scene 5 — Cross-Pod Import/Export (1:30–2:00)

**Show**: Navigate to Import page (click Import in dock)

**Actions**:
1. Show the three tabs: WordPress, Markdown, Pod / JSON
2. Click "Pod / JSON" tab
3. Click "↓ Export as JSON" → file downloads
4. Open the downloaded JSON briefly in a text editor (2 seconds)
5. Back to import page — drag the JSON file onto the drop zone
6. Select "Skip" for duplicates
7. Click "Import Pod"
8. Show results: "6 collections already existed, 22 entries skipped"

**Voiceover**:
> "Cross-pod copy. Export your entire pod as JSON — every collection, every entry. Then import it into another pod. Collections are created automatically if they don't exist. Choose skip or overwrite for duplicate entries. That's it — staging to production in two clicks."

---

## Scene 6 — The POD (2:00–2:20)

**Show**: Finder window with the .pod file

**Actions**:
1. Show file size (~few MB)
2. Open in DB Browser for SQLite or TablePlus (optional, 3 seconds)
3. Show _entries table briefly
4. Close DB tool
5. Right-click → Copy the file
6. Paste it somewhere else

**Voiceover**:
> "This is it. One file. Your entire CMS. It's a standard SQLite database — you can open it with any database tool. Copy it, email it, put it in Dropbox. No migrations, no export wizards. Just a file."

---

## Scene 7 — Closing (2:20–2:40)

**Show**: Back to dashboard → zoom out slightly → show the dock

**Text overlay**:
> Orbiter — CMS in one file
> MIT Licensed · github.com/aeon022/orbiter
> orbiter.sh/docs

**Voiceover**:
> "Orbiter is MIT-licensed, self-hosted, and works on any shared hosting via FTP. 16 field types, a block editor, scheduled publishing, i18n, media library, and a desktop app with auto-update. Link in the description."

---

## Scene 8 — End Card (2:40–3:00)

**Show**: Static card with:

```
⊙ ORBITER

github.com/aeon022/orbiter
orbiter.sh/docs

Star on GitHub ⭐
```

**Music**: Fade out

---

## B-Roll Suggestions (optional inserts)

These can be cut in between scenes as 2-3 second clips:

| Clip | What to show |
|------|-------------|
| Theme switching | Settings → click Zen theme → click Space theme |
| Media library | Browse images, click one, see preview |
| Schema editor | Add a field, pick type from dropdown |
| Dock magnification | Slowly hover across dock items |
| Mobile view | Resize browser to mobile width, show responsive layout |
| Command palette | Press ⌘K, type a search, select result |

---

## Demo Data Script

Run these to set up demo data before recording:

```bash
# Start server
ORBITER_POD=apps/demo/demo.pod PORT=4399 node packages/admin/src/server.js

# Login and get cookie
COOKIE=$(curl -s -c - http://localhost:4399/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' | grep orb_sess | awk '{print $NF}')

# Schedule an entry for next week
curl -s "http://localhost:4399/api/collections/posts/entries/astro-content-collections/status" \
  -X PATCH -H 'Content-Type: application/json' \
  -b "orb_sess=$COOKIE" \
  -d '{"status":"scheduled","publish_at":"2026-06-27 10:00:00"}'

# Schedule another entry
curl -s "http://localhost:4399/api/collections/events/entries/design-festival-2026/status" \
  -X PATCH -H 'Content-Type: application/json' \
  -b "orb_sess=$COOKIE" \
  -d '{"status":"scheduled","publish_at":"2026-06-30 09:00:00"}'

# Set an expiring entry
curl -s "http://localhost:4399/api/collections/events/entries/woechentlicher-sketch-club/status" \
  -X PATCH -H 'Content-Type: application/json' \
  -b "orb_sess=$COOKIE" \
  -d '{"status":"published","unpublish_at":"2026-07-05 23:59:00"}'
```

After recording, reset entries back:

```bash
# Reset all to published
for slug in astro-content-collections; do
  curl -s "http://localhost:4399/api/collections/posts/entries/$slug/status" \
    -X PATCH -H 'Content-Type: application/json' \
    -b "orb_sess=$COOKIE" \
    -d '{"status":"published"}'
done
```
