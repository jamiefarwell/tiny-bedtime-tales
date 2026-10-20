// Minimal .env loader (no dotenv dependency).
//
// Loads, in order, `.env.local` then `.env` from the repo root. Values already
// present in process.env always win, and a key set by an earlier file is not
// overwritten by a later one. Supports:
//   KEY=value            # trailing comments after whitespace
//   export KEY=value
//   KEY="double quoted with \n escapes"
//   KEY='single quoted, literal'
// Never logs values.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** @param {string} src */
export function parseEnv(src) {
  /** @type {Record<string, string>} */
  const out = {};
  const lines = src.replace(/^﻿/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    const q = value[0];
    if (q === '"' || q === "'" || q === '`') {
      // Allow multi-line quoted values.
      let body = value.slice(1);
      while (!hasClosingQuote(body, q) && i + 1 < lines.length) {
        body += '\n' + lines[++i];
      }
      const close = findClosingQuote(body, q);
      value = close === -1 ? body : body.slice(0, close);
      if (q === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
    } else {
      const hash = value.search(/\s#/);
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    out[key] = value;
  }
  return out;
}

function findClosingQuote(body, q) {
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\' && q === '"') { i++; continue; }
    if (body[i] === q) return i;
  }
  return -1;
}
function hasClosingQuote(body, q) { return findClosingQuote(body, q) !== -1; }

/**
 * Load .env.local and .env from `root` into process.env (non-destructively).
 * @param {string} root
 * @returns {string[]} the files that were found (paths only, never values)
 */
export function loadEnv(root) {
  const loaded = [];
  for (const name of ['.env.local', '.env']) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    const vars = parseEnv(readFileSync(file, 'utf8'));
    for (const [k, v] of Object.entries(vars)) {
      if (process.env[k] === undefined || process.env[k] === '') process.env[k] = v;
    }
    loaded.push(name);
  }
  return loaded;
}

/** Read an env var, treating empty strings as unset. */
export function env(name, fallback = undefined) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

/** Numeric env var with fallback. */
export function envNumber(name, fallback) {
  const v = env(name);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Env ${name} must be a number`);
  return n;
}
