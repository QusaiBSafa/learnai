/* Runs learner JavaScript in an isolated worker: no DOM, no network. */
const fmt = (args) =>
  args
    .map((a) => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    })
    .join(' ');
const send = (type) => (...args) => postMessage({ type, text: fmt(args) });
self.console = { log: send('out'), info: send('out'), warn: send('err'), error: send('err'), table: send('out') };
for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches']) {
  try { Object.defineProperty(self, k, { value: undefined, configurable: false }); } catch { /* ignore */ }
}

self.onmessage = async (e) => {
  const { id, code } = e.data;
  postMessage({ type: 'started', id });
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction(code)();
    postMessage({ type: 'done', id, ok: true });
  } catch (err) {
    postMessage({ type: 'err', text: String(err && err.stack ? err.stack.split('\n')[0] : err) });
    postMessage({ type: 'done', id, ok: false });
  }
};
postMessage({ type: 'status', text: 'ready' });
