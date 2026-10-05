'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CodeSample } from '@/lib/types';

type Line = { kind: 'out' | 'err' | 'sys' | 'img'; text: string };
const TIME_LIMIT_MS = { python: 15000, javascript: 5000 } as const;

export default function CodeRunner({ code }: { code: CodeSample }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<{ getCode: () => string; setCode: (s: string) => void } | null>(null);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runId = useRef(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const fallback = useRef<HTMLTextAreaElement>(null);
  const [editorReady, setEditorReady] = useState(false);

  // CodeMirror is loaded in the browser only.
  useEffect(() => {
    let destroyed = false;
    let cm: { destroy: () => void } | null = null;
    (async () => {
      const [{ EditorView, basicSetup }, { keymap }, { indentWithTab }, lang, { oneDark }] = await Promise.all([
        import('codemirror'),
        import('@codemirror/view'),
        import('@codemirror/commands'),
        code.lang === 'python' ? import('@codemirror/lang-python').then((m) => m.python()) : import('@codemirror/lang-javascript').then((m) => m.javascript()),
        import('@codemirror/theme-one-dark'),
      ]);
      if (destroyed || !host.current) return;
      const ev = new EditorView({
        doc: code.source,
        parent: host.current,
        extensions: [
          basicSetup,
          lang,
          oneDark,
          keymap.of([indentWithTab, { key: 'Mod-Enter', run: () => (runRef.current(), true) }]),
          EditorView.contentAttributes.of({ 'aria-label': 'Code editor' }),
        ],
      });
      cm = ev;
      view.current = {
        getCode: () => ev.state.doc.toString(),
        setCode: (s) => ev.dispatch({ changes: { from: 0, to: ev.state.doc.length, insert: s } }),
      };
      setEditorReady(true);
    })().catch(() => setEditorReady(false));
    return () => {
      destroyed = true;
      cm?.destroy();
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [code.lang, code.source]);

  const push = (l: Line) => setLines((ls) => [...ls, l]);

  const stop = useCallback((reason?: string) => {
    if (timer.current) clearTimeout(timer.current);
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setStatus('');
    if (reason) push({ kind: 'err', text: reason });
  }, []);

  const run = useCallback(() => {
    if (!code.runnable) return;
    const source = view.current?.getCode() ?? fallback.current?.value ?? code.source;
    setLines([]);
    setBusy(true);
    const id = ++runId.current;
    const started = performance.now();
    if (!worker.current) {
      worker.current = new Worker(code.lang === 'python' ? '/workers/python-worker.js' : '/workers/js-worker.js');
    }
    const w = worker.current;
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; text?: string; data?: string; id?: number; ok?: boolean };
      if (m.type === 'status') setStatus(m.text === 'ready' ? '' : m.text ?? '');
      else if (m.type === 'started' && m.id === id) {
        setStatus('Running…');
        timer.current = setTimeout(() => stop(`Stopped: your code ran longer than ${TIME_LIMIT_MS[code.lang] / 1000} s. Check for an endless loop.`), TIME_LIMIT_MS[code.lang]);
      } else if (m.type === 'out') push({ kind: 'out', text: m.text ?? '' });
      else if (m.type === 'err') push({ kind: 'err', text: m.text ?? '' });
      else if (m.type === 'image') push({ kind: 'img', text: m.data ?? '' });
      else if (m.type === 'done' && m.id === id) {
        if (timer.current) clearTimeout(timer.current);
        setBusy(false);
        setStatus('');
        push({ kind: 'sys', text: `${m.ok ? 'Finished' : 'Stopped with an error'} in ${((performance.now() - started) / 1000).toFixed(2)} s` });
      }
    };
    w.onerror = (e) => stop(`Could not start the runner: ${e.message || 'unknown error'}. Check your internet connection and try again.`);
    w.postMessage({ type: 'run', id, code: source });
  }, [code, stop]);

  const runRef = useRef(run);
  runRef.current = run;

  const reset = () => {
    view.current?.setCode(code.source);
    if (fallback.current) fallback.current.value = code.source;
    setLines([]);
  };

  const fname = code.title || (code.lang === 'python' ? 'main.py' : 'script.js');
  return (
    <section className="runner" aria-label="Code you can run">
      <div className="runner-bar">
        <span className="fname">{fname}</span>
        <span className="lang">{code.lang}</span>
        <span className="sp" />
        <button type="button" onClick={reset} disabled={busy}>Reset</button>
        {busy ? (
          <button type="button" className="run" onClick={() => stop('Stopped.')}>■ Stop</button>
        ) : (
          <button type="button" className="run" onClick={run} disabled={!code.runnable} title={code.runnable ? 'Run (Ctrl/Cmd + Enter)' : undefined}>
            ▶ Run
          </button>
        )}
      </div>
      <div className="editor" ref={host}>
        {!editorReady && <textarea ref={fallback} defaultValue={code.source} spellCheck={false} aria-label="Code editor" />}
      </div>
      <div className="console" aria-live="polite">
        {lines.length === 0 && !status && (
          <span className="sys">
            {code.runnable
              ? code.lang === 'python'
                ? 'Press Run. The first run downloads Python into your browser, which takes a few seconds.'
                : 'Press Run to see the output.'
              : 'This example needs things a browser can’t provide. Read it here, then try it in Google Colab or on your computer.'}
          </span>
        )}
        {status && <div className="sys">{status}</div>}
        {lines.map((l, i) =>
          l.kind === 'img' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={`data:image/png;base64,${l.text}`} alt="Plot produced by your code" />
          ) : (
            <div key={i} className={l.kind === 'out' ? undefined : l.kind}>{l.text}</div>
          ),
        )}
      </div>
      <div className="note">
        {code.note ? `${code.note} · ` : ''}
        {code.runnable ? 'Runs in your browser · nothing is sent anywhere' : 'Read-only example'}
      </div>
    </section>
  );
}
