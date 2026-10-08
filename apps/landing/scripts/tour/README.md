# Tour screenshots

Regenerates `public/tour/*.webp` and `src/data/tour.json` (the interactive tour on the home page) from a throw-away demo pod.
Not part of the build — run it when the admin UI changes enough that the screens look stale.

```bash
npm i --no-save puppeteer-core            # once; uses your installed Chrome (set CHROME=… to override)
POD=/tmp/nordlicht.pod
node scripts/tour/seed.mjs $POD           # users, collections, entries (a made-up studio site)
ORBITER_POD=$POD PORT=4398 ADMIN_ORIGIN=http://localhost:4398 node ../../packages/admin/src/server.js &
node scripts/tour/prep.mjs                # media, covers, API keys, webhook, 2FA → writes session.json
node scripts/tour/post.mjs $POD           # realistic "last edited" times, extra signed-in devices
node scripts/tour/tweak.mjs $POD          # hides the Collections card on the dashboard
# stop the server, copy the pod to nordlicht.pod (so the status bar says "nordlicht"), start it again, then:
node scripts/tour/shots.cjs public/tour   # screenshots + hotspot rectangles → public/tour/tour.json
cp public/tour/tour.json src/data/tour.json && rm public/tour/tour.json
```

`shots.cjs` forces Station mode (dark), a 1200×750 viewport at 2× and logs in with the session from `prep.mjs`.
Hotspots are CSS selectors → their bounding boxes become percentages, so they follow the screenshot at any size.
All people, studios and addresses in the demo content are invented; IPs are from the documentation ranges (RFC 5737).
