// Source view for the Orbiter / Lander editor: CodeMirror 6 with Markdown / HTML highlighting and an optional Vim mode.
// Built into vendor/codemirror-md.js (see vendor/README.md); exposes window.OrbCM.createSource().
import { EditorState, Compartment, EditorSelection } from '@codemirror/state';
import { EditorView, keymap, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { vim, Vim, getCM } from '@replit/codemirror-vim';

const theme = EditorView.theme({
  '&': { color: 'var(--text)', backgroundColor: 'transparent', fontSize: '13px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--mono, ui-monospace, monospace)', lineHeight: '1.8' },
  '.cm-content': { padding: '14px 16px', caretColor: 'var(--text)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)' },
  '.cm-fat-cursor': { background: 'var(--text) !important', color: 'var(--bg2, #fff) !important' },
  '&:not(.cm-focused) .cm-fat-cursor': { background: 'none !important', outline: '1px solid var(--text)', color: 'inherit !important' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': { background: 'rgba(120,140,200,.28)' },
  '.cm-panels': { backgroundColor: 'var(--bg2, #fff)', color: 'var(--text)', borderTop: '1px solid var(--line)', fontFamily: 'var(--mono, monospace)', fontSize: '12px' },
  '.cm-vim-panel': { padding: '4px 10px' }, '.cm-vim-panel input': { background: 'transparent', color: 'var(--text)', border: '0', outline: 'none', fontFamily: 'inherit' },
});
const colours = HighlightStyle.define([
  { tag: [t.heading, t.heading1, t.heading2, t.heading3], color: 'var(--red, #c33)', fontWeight: '600' },
  { tag: t.strong, fontWeight: '700' }, { tag: t.emphasis, fontStyle: 'italic' }, { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.link, t.url], color: 'var(--accent, #3a6ea5)', textDecoration: 'underline' },
  { tag: [t.monospace], color: 'var(--muted)' }, { tag: [t.processingInstruction, t.meta, t.contentSeparator, t.quote], color: 'var(--muted)' },
  { tag: [t.tagName, t.angleBracket], color: 'var(--red, #c33)' }, { tag: t.attributeName, color: 'var(--accent, #3a6ea5)' }, { tag: t.attributeValue, color: 'var(--muted)' },
  { tag: t.comment, color: 'var(--muted)', fontStyle: 'italic' },
]);

export function createSource({ parent, doc = '', lang = 'md', vimOn = false, onChange, onSave, onMode, onHelp }) {
  const langC = new Compartment(), vimC = new Compartment();
  const langExt = (l) => (l === 'html' ? html() : markdown());
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        vimC.of(vimOn ? vim() : []),
        history(), drawSelection(), EditorView.lineWrapping,
        keymap.of([{ key: 'Mod-s', run: () => { onSave?.(); return true; } }, indentWithTab, ...defaultKeymap, ...historyKeymap]),
        langC.of(langExt(lang)), theme, syntaxHighlighting(colours),
        EditorView.updateListener.of((u) => { if (u.docChanged) onChange?.(u.state.doc.toString()); }),
        EditorView.contentAttributes.of({ 'aria-label': 'Text source', spellcheck: 'false' }),
      ],
    }),
  });
  Vim.defineEx('write', 'w', () => onSave?.());
  Vim.defineEx('help', 'h', () => onHelp?.());
  Vim.defineEx('cheat', 'cheat', () => onHelp?.());
  // mode indicator (NORMAL / INSERT / VISUAL / REPLACE) for the host page
  const hook = (on) => {
    const cm = on ? getCM(view) : null;
    if (cm && !cm.__orbHook) { cm.__orbHook = true; cm.on('vim-mode-change', (e) => { if (vimState.on) onMode?.(e.mode, e.subMode); }); }
    onMode?.(on ? 'normal' : '');
  };
  const vimState = { on: vimOn };
  if (vimOn) queueMicrotask(() => hook(true));
  return {
    get: () => view.state.doc.toString(),
    set: (text, l) => { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }); if (l) view.dispatch({ effects: langC.reconfigure(langExt(l)) }); },
    setLang: (l) => view.dispatch({ effects: langC.reconfigure(langExt(l)) }),
    setVim: (on) => { vimState.on = on; view.dispatch({ effects: vimC.reconfigure(on ? vim() : []) }); hook(on); },
    // wrap / unwrap the selection (or insert an empty pair) in Markdown marks: ** _ == `
    wrap: (mark) => { const n = mark.length; view.dispatch(view.state.changeByRange((r) => { const sel = view.state.sliceDoc(r.from, r.to);
      if (sel.length >= 2 * n && sel.startsWith(mark) && sel.endsWith(mark)) return { changes: { from: r.from, to: r.to, insert: sel.slice(n, -n) }, range: EditorSelection.range(r.from, r.to - 2 * n) };
      return { changes: { from: r.from, to: r.to, insert: mark + sel + mark }, range: EditorSelection.range(r.from + n, r.to + n) }; })); view.focus(); },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
    dom: view.dom,
  };
}
