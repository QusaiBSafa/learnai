/* Runs learner Python code with Pyodide (CPython compiled to WebAssembly).
   Messages in:  { type: 'run', id, code }
   Messages out: { type: 'status', text } | { type: 'started', id } | { type: 'out' | 'err', text }
                 { type: 'image', data } | { type: 'done', id, ok } */
const PYODIDE_VERSION = '0.29.5';
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
importScripts(`${INDEX_URL}pyodide.js`);

let pyodideReady = null;
function boot() {
  pyodideReady ??= (async () => {
    postMessage({ type: 'status', text: 'Loading Python (first run only)…' });
    const py = await loadPyodide({ indexURL: INDEX_URL });
    py.setStdout({ batched: (text) => postMessage({ type: 'out', text }) });
    py.setStderr({ batched: (text) => postMessage({ type: 'err', text }) });
    py.runPython("import os; os.environ['MPLBACKEND'] = 'AGG'");
    return py;
  })();
  return pyodideReady;
}

const SHOW_FIGURES = `
import sys
if 'matplotlib.pyplot' in sys.modules:
    import base64, io
    import matplotlib.pyplot as _plt
    for _n in _plt.get_fignums():
        _buf = io.BytesIO()
        _plt.figure(_n).savefig(_buf, format='png', dpi=110, bbox_inches='tight')
        _emit_image(base64.b64encode(_buf.getvalue()).decode())
    _plt.close('all')
`;

const QUIET_SHOW = `
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as _plt
_plt.show = lambda *a, **k: None
`;

self.onmessage = async (e) => {
  const { type, id, code } = e.data;
  if (type !== 'run') return;
  try {
    const py = await boot();
    postMessage({ type: 'status', text: 'Loading libraries…' });
    await py.loadPackagesFromImports(code, { messageCallback: () => {}, errorCallback: (m) => postMessage({ type: 'err', text: m }) });
    const ns = py.globals.get('dict')();
    ns.set('_emit_image', (data) => postMessage({ type: 'image', data }));
    if (/matplotlib/.test(code)) await py.runPythonAsync(QUIET_SHOW, { globals: ns });
    postMessage({ type: 'started', id });
    await py.runPythonAsync(code, { globals: ns });
    await py.runPythonAsync(SHOW_FIGURES, { globals: ns });
    ns.destroy();
    postMessage({ type: 'done', id, ok: true });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    // Trim Pyodide's internal frames so learners see their own traceback.
    const lines = msg.split('\n');
    const start = lines.findIndex((l) => l.includes('File "<exec>"'));
    postMessage({ type: 'err', text: start > 0 ? ['Traceback (most recent call last):', ...lines.slice(start)].join('\n') : msg });
    postMessage({ type: 'done', id, ok: false });
  }
};

boot().then(
  () => postMessage({ type: 'status', text: 'ready' }),
  (err) => postMessage({ type: 'err', text: `Could not load Python: ${err}` }),
);
