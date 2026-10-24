'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { ChildProfile, PersonalStory } from './types';
import { DEMO_WALLET_DEFAULT, type DemoWallet } from './demoWalletState';
import { deleteStoryPictures } from './pictures';

// Family data lives on the device until parent accounts ship. Everything goes
// through this module so swapping localStorage for Supabase touches one file.

export interface ReadingProgress {
  page: number;
  finished: boolean;
  updatedAt: number;
}

export interface Settings {
  narration: boolean;
  autoTurn: boolean;
  readAlong: boolean;
  textScale: number;
  sleepy: boolean;
  ambient: 'off' | 'rain' | 'waves' | 'hush';
  voiceURI: string;
}

interface State {
  children: ChildProfile[];
  activeChildId: string | null;
  stories: PersonalStory[];
  progress: Record<string, ReadingProgress>;
  settings: Settings;
  /** Pretend token wallet for testing without payments (lib/demoWallet.ts). */
  demoWallet: DemoWallet;
}

const KEY = 'tbt:v2';
const DEFAULT_SETTINGS: Settings = {
  narration: true,
  autoTurn: true,
  readAlong: true,
  textScale: 1,
  sleepy: false,
  ambient: 'off',
  voiceURI: '',
};
const EMPTY: State = {
  children: [],
  activeChildId: null,
  stories: [],
  progress: {},
  settings: DEFAULT_SETTINGS,
  demoWallet: DEMO_WALLET_DEFAULT,
};

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): State {
  if (loaded || typeof window === 'undefined') return state;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      state = { ...EMPTY, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings }, demoWallet: parsed.demoWallet ?? DEMO_WALLET_DEFAULT };
    }
  } catch {
    // Private browsing or corrupted data: start fresh rather than crash.
  }
  return state;
}

function commit(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked; the session keeps working in memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      loaded = false;
      load();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const getSnapshot = () => load();
const getServerSnapshot = () => EMPTY;

/** Subscribe to a slice of family state. Returns EMPTY-derived values during SSR. */
export function useFamily<T>(select: (s: State) => T): T {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return select(snapshot);
}

/** True once the client store has been read (avoids empty-state flashes). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const family = {
  get: () => load(),

  saveChild(child: ChildProfile) {
    const s = load();
    const exists = s.children.some((c) => c.id === child.id);
    commit({
      ...s,
      children: exists ? s.children.map((c) => (c.id === child.id ? child : c)) : [...s.children, child],
      activeChildId: child.id,
    });
  },

  removeChild(id: string) {
    const s = load();
    const children = s.children.filter((c) => c.id !== id);
    commit({ ...s, children, activeChildId: children[0]?.id ?? null });
  },

  setActiveChild(id: string) {
    commit({ ...load(), activeChildId: id });
  },

  saveStory(story: PersonalStory) {
    const s = load();
    commit({ ...s, stories: [story, ...s.stories.filter((x) => x.id !== story.id)] });
  },

  removeStory(id: string) {
    const s = load();
    commit({ ...s, stories: s.stories.filter((x) => x.id !== id) });
    deleteStoryPictures(id);
  },

  setProgress(key: string, progress: ReadingProgress) {
    const s = load();
    commit({ ...s, progress: { ...s.progress, [key]: progress } });
  },

  updateSettings(patch: Partial<Settings>) {
    const s = load();
    commit({ ...s, settings: { ...s.settings, ...patch } });
  },

  setDemoWallet(demoWallet: DemoWallet) {
    commit({ ...load(), demoWallet });
  },
};

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useFamily((s) => s.settings);
  const update = useCallback((patch: Partial<Settings>) => family.updateSettings(patch), []);
  return [settings, update];
}

export function activeChild(s: State): ChildProfile | null {
  return s.children.find((c) => c.id === s.activeChildId) ?? s.children[0] ?? null;
}
