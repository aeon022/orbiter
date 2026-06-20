# LinkedIn — English

---

**Shipped: Calendar view, cross-pod copy, and desktop auto-update for Orbiter CMS**

Building a CMS solo means every release has to count. This week's Orbiter update packs three features I've wanted for a while:

📅 **Calendar View**
A full month-grid page where every entry shows up color-coded — blue for scheduled, gold for expiring, green for published. Click a day, see what's there, jump straight to the editor. The dashboard now has a mini calendar widget too.

🔄 **Cross-Pod Import/Export**
Orbiter stores everything in a single POD (SQLite). Now you can export an entire pod as JSON and import it into another — collections are created automatically, entries can be skipped or overwritten. Great for staging → production workflows.

🖥️ **Desktop App v0.2.0**
The Electron app now auto-updates from GitHub Releases, ships as a universal macOS binary (M1 + Intel in one DMG), and has a one-click backup button.

Plus: a new table field type — a mini-spreadsheet right in the entry sidebar.

Orbiter is MIT-licensed, needs no cloud, and deploys to any shared hosting via FTP. Built for small businesses and freelancers who want a CMS without the infrastructure overhead.

GitHub: https://github.com/aeon022/orbiter
Docs: https://orbiter.sh/docs/

#opensource #webdev #cms #astro #sqlite #indiehacker
