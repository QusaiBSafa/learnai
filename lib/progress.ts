'use client';
import { useSyncExternalStore } from 'react';

// Progress lives only in this browser: no account needed.
const KEY = 'learnai.progress.v1';
const EVENT = 'learnai-progress';
type Store = Record<string, number>; // "course/lesson" -> completed at (ms)

let cache: Store | null = null;
let cacheRaw: string | null = null;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cacheRaw && cache) return cache;
    cacheRaw = raw;
    cache = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    cache ??= {};
  }
  return cache;
}

function write(next: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: progress just won't persist */
  }
  cache = next;
  cacheRaw = JSON.stringify(next);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

const EMPTY: Store = {};
export function useProgress() {
  const done = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    done,
    isDone: (course: string, lesson: string) => Boolean(done[`${course}/${lesson}`]),
    countIn: (course: string, lessons: string[]) => lessons.filter((l) => done[`${course}/${l}`]).length,
    total: Object.keys(done).length,
  };
}

export function setDone(course: string, lesson: string, value: boolean) {
  const next = { ...read() };
  if (value) next[`${course}/${lesson}`] = Date.now();
  else delete next[`${course}/${lesson}`];
  write(next);
}

export function resetProgress() {
  write({});
}
