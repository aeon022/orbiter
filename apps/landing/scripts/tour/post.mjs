// DB-level touch-ups after the API steps: realistic "last edited" times, and a few extra signed-in devices
import { openPod } from '../../../../packages/core/src/index.js';
import { randomBytes } from 'node:crypto';
const db = openPod(process.argv[2]);
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
const hours = { 'single-file-website': 30, 'typography-long-form': 54, 'review-workflow': 5, 'autumn-campaign': 9, 'harbour-festival': 120, 'design-systems': 20, 'three-handovers': 3, 'photo-shoot': 70 };
for (const [slug, h] of Object.entries(hours)) db.db.prepare("UPDATE _entries SET updated_at=?, created_at=? WHERE collection_id='journal' AND slug=?").run(ago(h), ago(h + 48), slug);
for (const [slug, h] of Object.entries({ 'harbour-festival': 100, 'nordic-bakery': 200, 'atlas-clinic': 300, 'lumen-lab': 400 })) db.db.prepare("UPDATE _entries SET updated_at=?, created_at=? WHERE collection_id='projects' AND slug=?").run(ago(h), ago(h + 48), slug);
const exp = new Date(Date.now() + 29 * 864e5).toISOString().replace('T', ' ').slice(0, 19);
db.createSession('u-admin', randomBytes(32).toString('hex'), exp, { ip: '203.0.113.24', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1' });
db.createSession('u-admin', randomBytes(32).toString('hex'), exp, { ip: '198.51.100.7', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Firefox/131.0' });
db.db.prepare("UPDATE _sessions SET created_at=? WHERE ip='203.0.113.24'").run(ago(26));
db.db.prepare("UPDATE _sessions SET created_at=? WHERE ip='198.51.100.7'").run(ago(75));
db.close(); process.exit(0);
