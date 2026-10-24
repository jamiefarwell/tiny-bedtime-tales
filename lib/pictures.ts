'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChildProfile, Page, PersonalStory } from './types';
import { heroLookKey } from './heroLook';
import { HERO_SHEET_VERSION } from './art/prompts';

// "Starring your child": pictures for personalised stories.
//
// The server draws (app/api/illustrate); this module decides what to draw and
// keeps the results on the device in IndexedDB, next to the stories in
// localStorage. Three kinds of image:
//   hero:<look>          the child's reference sheet, reused by every story
//   cast:<story>         the story's other recurring characters
//   scene:<story>:<page> one picture, facing that page and the next
// Everything is idempotent: asking for a picture that exists, or is being
// drawn, costs nothing, so the reader can safely resume unfinished stories.

const DB = 'tbt-pictures';
const STORE = 'images';
let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = run(d.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function getPicture(key: string): Promise<Blob | null> {
  try {
    return ((await tx('readonly', (s) => s.get(key))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

const listeners = new Set<(key: string) => void>();
function onPicture(fn: (key: string) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

async function putPicture(key: string, blob: Blob) {
  try {
    await tx('readwrite', (s) => s.put(blob, key));
  } catch {
    // Storage full or blocked: the picture shows this session only.
    memory.set(key, blob);
  }
  listeners.forEach((l) => l(key));
}
const memory = new Map<string, Blob>();

/** Forget a story's pictures (when it's removed from the shelf). */
export async function deleteStoryPictures(storyId: string) {
  try {
    const keys = (await tx('readonly', (s) => s.getAllKeys())) as string[];
    await Promise.all(
      keys.filter((k) => k === `cast:${storyId}` || k.startsWith(`scene:${storyId}:`)).map((k) => tx('readwrite', (s) => s.delete(k))),
    );
  } catch {}
}

// --- Keys ------------------------------------------------------------------

type Hero = Pick<ChildProfile, 'look' | 'ageBand' | 'pronouns'>;
export const heroKey = (c: Hero) => (c.look ? `hero:${HERO_SHEET_VERSION}:${heroLookKey(c.look, c.ageBand)}-${c.pronouns}` : '');
export const sceneKey = (storyId: string, pageIndex: number) => `scene:${storyId}:${pageIndex}`;

/** The pages that start a picture (they carry an art direction), in order. */
export function scenePages(pages: Page[]): number[] {
  return pages.flatMap((p, i) => (p.art && p.artSig ? [i] : []));
}

// --- Availability ----------------------------------------------------------

let available: Promise<boolean> | null = null;
/** Whether this deployment can draw pictures (GEMINI_API_KEY is set). */
export function picturesAvailable(): Promise<boolean> {
  available ??= fetch('/api/health', { cache: 'no-store' })
    .then((r) => r.json())
    .then((j) => Boolean(j.illustrator))
    .catch(() => false);
  return available;
}
export function usePicturesAvailable(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    picturesAvailable().then((v) => live && setOn(v));
    return () => {
      live = false;
    };
  }, []);
  return on;
}

// --- Drawing ---------------------------------------------------------------

const inflight = new Map<string, Promise<Blob | null>>();
const attempts = new Map<string, number>();

// The illustrator takes 15–30 s a picture; three at once keeps a story's
// pictures arriving roughly as fast as it's read.
let running = 0;
const queue: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= 3) await new Promise<void>((r) => queue.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

async function asPart(blob: Blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { mimeType: blob.type || 'image/webp', data: btoa(bin) };
}

function draw(key: string, body: () => Promise<Record<string, unknown> | null>): Promise<Blob | null> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const job = (async () => {
    const have = memory.get(key) ?? (await getPicture(key));
    if (have) return have;
    if ((attempts.get(key) ?? 0) >= 2 || !(await picturesAvailable())) return null;
    const payload = await body();
    if (!payload) return null;
    attempts.set(key, (attempts.get(key) ?? 0) + 1);
    return slot(async () => {
      try {
        const res = await fetch('/api/illustrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        await putPicture(key, blob);
        return blob;
      } catch {
        return null;
      }
    });
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** The child's reference sheet: drawn once per look, then reused. */
export function ensureHero(child: Hero): Promise<Blob | null> {
  const key = heroKey(child);
  if (!key) return Promise.resolve(null);
  return draw(key, async () => ({ kind: 'hero', look: child.look, ageBand: child.ageBand, pronouns: child.pronouns }));
}

interface StoryArt {
  id: string;
  cast: NonNullable<PersonalStory['cast']>;
  castSig: string;
}

function ensureCast(story: StoryArt, child: Hero): Promise<Blob | null> {
  if (!story.cast.length) return Promise.resolve(null);
  return draw(`cast:${story.id}`, async () => {
    const hero = await ensureHero(child);
    return hero && { kind: 'cast', storyId: story.id, cast: story.cast, castSig: story.castSig, hero: await asPart(hero) };
  });
}

/** One scene. `scene` is its number among the story's pictures, `total` how many there will be. */
export function ensureScene(story: StoryArt, child: Hero, page: Page, pageIndex: number, scene: number, total: number): Promise<Blob | null> {
  if (!page.art || !page.artSig) return Promise.resolve(null);
  return draw(sceneKey(story.id, pageIndex), async () => {
    const hero = await ensureHero(child);
    if (!hero) return null;
    const sheet = await ensureCast(story, child);
    return {
      kind: 'scene',
      storyId: story.id,
      index: pageIndex,
      scene,
      total,
      art: page.art,
      artSig: page.artSig,
      cast: story.cast,
      castSig: story.castSig,
      look: child.look,
      ageBand: child.ageBand,
      pronouns: child.pronouns,
      hero: await asPart(hero),
      ...(sheet ? { castSheet: await asPart(sheet) } : {}),
    };
  });
}

/** Draw anything still missing for a saved story (e.g. the tab closed mid-way). */
export function ensureStoryPictures(story: PersonalStory, child: ChildProfile | null) {
  if (!story.illustrated || !child?.look) return;
  const art = { id: story.id, cast: story.cast ?? [], castSig: story.castSig ?? '' };
  const starts = scenePages(story.pages);
  starts.forEach((pageIndex, scene) => ensureScene(art, child, story.pages[pageIndex], pageIndex, scene, starts.length));
}

// --- Hooks -----------------------------------------------------------------

/** An object URL for one stored picture, updating when it arrives. */
export function usePicture(key: string): string | null {
  const urls = usePictureUrls(useMemo(() => (key ? [key] : []), [key]));
  return urls.get(key) ?? null;
}

function usePictureUrls(keys: string[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const joined = keys.join('|');
  useEffect(() => {
    let live = true;
    const made = new Map<string, string>();
    const load = async (key: string) => {
      if (made.has(key)) return;
      const blob = memory.get(key) ?? (await getPicture(key));
      if (!blob || !live || made.has(key)) return;
      made.set(key, URL.createObjectURL(blob));
      setUrls(new Map(made));
    };
    const wanted = new Set(keys);
    keys.forEach(load);
    const off = onPicture((key) => wanted.has(key) && load(key));
    return () => {
      live = false;
      off();
      made.forEach((u) => URL.revokeObjectURL(u));
    };
    // keys is captured by value via `joined`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);
  return urls;
}

/**
 * The story's pages with their pictures filled in: each picture shows on the
 * page that starts it and the page after. Also reports how many are ready.
 */
export function useStoryPictures(storyId: string, pages: Page[], heroName = 'The hero'): { pages: Page[]; ready: number; total: number } {
  const starts = scenePages(pages);
  const keys = useMemo(() => starts.map((i) => sceneKey(storyId, i)), [storyId, starts.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const urls = usePictureUrls(keys);
  const withArt = useMemo(() => {
    if (!starts.length) return pages;
    return pages.map((p, i) => {
      if (p.image) return p;
      const start = [...starts].reverse().find((s) => s <= i && i - s <= 1);
      const url = start !== undefined ? urls.get(sceneKey(storyId, start)) : undefined;
      return url ? { ...p, image: url, imageAlt: pages[start!].art?.prompt.replace(/\bHERO\b/g, heroName) ?? '' } : p;
    });
  }, [pages, urls, storyId, heroName, starts.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  return { pages: withArt, ready: keys.filter((k) => urls.has(k)).length, total: starts.length };
}
