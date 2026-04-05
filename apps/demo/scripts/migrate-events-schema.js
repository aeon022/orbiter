/**
 * migrate-events-schema.js
 * Updates the events collection schema in the live demo.pod:
 * - Adds optionLabels to recurring and recurring_month_pos selects
 * - Adds unitSelect/unitMap to recurring_interval
 * - Improves field labels
 *
 * Run: node apps/demo/scripts/migrate-events-schema.js
 */
import { openPod } from '@a83/orbiter-core';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const podPath = resolve(__dirname, '../demo.pod');

if (!existsSync(podPath)) {
  console.error('demo.pod not found — run npm run seed first');
  process.exit(1);
}

const db = openPod(podPath);

const row = db.db.prepare(`SELECT schema FROM _collections WHERE id = 'events'`).get();
if (!row) {
  console.error('events collection not found');
  db.close();
  process.exit(1);
}

const schema = JSON.parse(row.schema);

// Update recurring select
schema.recurring.label = 'Wiederholen';
schema.recurring.optionLabels = {
  none:             'Einmalig',
  daily:            'Täglich',
  weekly:           'Wöchentlich',
  monthly_day:      'Monatlich — Tag X',
  monthly_weekday:  'Monatlich — Wochentag',
  yearly:           'Jährlich',
};

// Update recurring_interval
schema.recurring_interval.label      = 'Alle';
schema.recurring_interval.unitSelect  = 'recurring';
schema.recurring_interval.unitMap     = {
  daily: 'Tage', weekly: 'Wochen',
  monthly_day: 'Monate', monthly_weekday: 'Monate', yearly: 'Jahre',
};

// Update recurring_days label
schema.recurring_days.label = 'An Wochentagen';

// Update recurring_day_of_month label
schema.recurring_day_of_month.label = 'Tag des Monats';

// Update recurring_month_pos
schema.recurring_month_pos.label = 'Position';
schema.recurring_month_pos.optionLabels = {
  '1st': '1.', '2nd': '2.', '3rd': '3.', '4th': '4.', last: 'Letzter',
};

// Update recurring_end_date label
schema.recurring_end_date.label = 'Wiederholung bis';

db.db.prepare(`UPDATE _collections SET schema = ? WHERE id = 'events'`)
  .run(JSON.stringify(schema));

db.close();

console.log('✓ events schema migrated');
