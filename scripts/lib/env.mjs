// Minimal .env loader.
//
// The scripts tell the operator to put credentials in .env, but nothing read
// that file, so following the instruction had no effect and the next run failed
// the same way. This loads .env from the repository root, if present.
//
// Real environment variables win: a value exported in the shell is deliberate
// and should not be silently overridden by a stale file.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadEnv(path = resolve(ROOT, '.env')) {
    let text;
    try {
        text = readFileSync(path, 'utf8');
    } catch {
        return {}; // No .env is a normal state.
    }

    const loaded = {};
    for (const rawLine of text.split('\n')) {
        const line = rawLine.replace(/\r$/, '');
        const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
        if (!match) continue;
        const value = match[2].replace(/^["']|["']$/g, '');
        loaded[match[1]] = value;
        if (!(match[1] in process.env)) process.env[match[1]] = value;
    }
    return loaded;
}
