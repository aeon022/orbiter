import { openPod } from '../../../../packages/core/src/index.js';
const db = openPod(process.argv[2]);
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
db.db.prepare("UPDATE _entries SET updated_at=?, created_at=? WHERE collection_id IN ('people','events')").run(ago(500), ago(600));
db.setMeta('dashboard.show_collections', '0');
db.close(); process.exit(0);
