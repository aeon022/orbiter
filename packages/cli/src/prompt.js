/**
 * Minimal interactive prompts using Node.js readline.
 * No external dependencies.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

let rl;
function getRl() {
  if (!rl) rl = createInterface({ input: stdin, output: stdout });
  return rl;
}

export async function ask(question, fallback = '') {
  const hint = fallback ? ` (${fallback})` : '';
  const answer = await getRl().question(`  ${question}${hint}: `);
  return answer.trim() || fallback;
}

export async function askSecret(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout });
    stdout.write(`  ${question}: `);
    stdin.setRawMode?.(true);
    let value = '';
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch) => {
      ch = ch.toString();
      if (ch === '\n' || ch === '\r' || ch === '\u0004') {
        stdin.setRawMode?.(false);
        stdin.removeListener('data', onData);
        stdout.write('\n');
        rl.close();
        resolve(value);
      } else if (ch === '\u0003') {
        process.exit(1);
      } else if (ch === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

export function closeRl() {
  rl?.close();
  rl = null;
}
