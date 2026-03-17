import React, { useEffect, useMemo, useRef } from 'react';
import {
  createEditorSystem,
  boldExtension,
  italicExtension,
  underlineExtension,
  strikethroughExtension,
  linkExtension,
  listExtension,
  historyExtension,
  htmlExtension,
} from '@lexkit/editor';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// Set up a minimal LexKit editor system using core formatting + HTML extensions.
const extensions = [
  boldExtension,
  italicExtension,
  underlineExtension,
  strikethroughExtension,
  linkExtension,
  listExtension,
  historyExtension,
  htmlExtension,
];

const { Provider, useEditor } = createEditorSystem();

function Toolbar() {
  const { commands, activeStates } = useEditor();

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => commands.formatText('bold')}
        className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors ${
          activeStates.bold ? 'bg-gray-200 dark:bg-slate-600' : ''
        }`}
        title="Bold"
        aria-label="Bold"
      >
        <span className="material-symbols-outlined text-lg">format_bold</span>
      </button>
      <button
        type="button"
        onClick={() => commands.formatText('italic')}
        className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors ${
          activeStates.italic ? 'bg-gray-200 dark:bg-slate-600' : ''
        }`}
        title="Italic"
        aria-label="Italic"
      >
        <span className="material-symbols-outlined text-lg">format_italic</span>
      </button>
      <button
        type="button"
        onClick={() => commands.formatText('underline')}
        className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors ${
          activeStates.underline ? 'bg-gray-200 dark:bg-slate-600' : ''
        }`}
        title="Underline"
        aria-label="Underline"
      >
        <span className="material-symbols-outlined text-lg">format_underlined</span>
      </button>
      <button
        type="button"
        onClick={() => commands.formatText('strikethrough')}
        className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors ${
          activeStates.strikethrough ? 'bg-gray-200 dark:bg-slate-600' : ''
        }`}
        title="Strikethrough"
        aria-label="Strikethrough"
      >
        <span className="material-symbols-outlined text-lg">format_strikethrough</span>
      </button>
      <span className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-0.5" aria-hidden />
      <button
        type="button"
        onClick={() => commands.toggleUnorderedList()}
        className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors ${
          activeStates.unorderedList ? 'bg-gray-200 dark:bg-slate-600' : ''
        }`}
        title="Bullet list"
        aria-label="Bullet list"
      >
        <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
      </button>
      <button
        type="button"
        onClick={() => commands.toggleOrderedList()}
        className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors ${
          activeStates.orderedList ? 'bg-gray-200 dark:bg-slate-600' : ''
        }`}
        title="Numbered list"
        aria-label="Numbered list"
      >
        <span className="material-symbols-outlined text-lg">format_list_numbered</span>
      </button>
      <button
        type="button"
        onClick={() => {
          if (activeStates.isLink) {
            commands.removeLink();
          } else {
            commands.insertLink();
          }
        }}
        className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors ${
          activeStates.isLink ? 'bg-gray-200 dark:bg-slate-600' : ''
        }`}
        title={activeStates.isLink ? 'Remove link' : 'Insert link'}
        aria-label={activeStates.isLink ? 'Remove link' : 'Insert link'}
      >
        <span className="material-symbols-outlined text-lg">link</span>
      </button>
    </div>
  );
}

function InnerEditor({ initialValue, onChange, placeholder }) {
  const { editor, commands } = useEditor();
  const didInitRef = useRef(false);

  // Inject initial HTML once on mount
  useEffect(() => {
    if (!editor || !commands || didInitRef.current) return;
    didInitRef.current = true;
    if (!initialValue || !initialValue.trim()) return;
    commands.importFromHTML(initialValue, { preventFocus: true }).catch(() => {});
  }, [editor, commands, initialValue]);

  // Export HTML on every editor update
  useEffect(() => {
    if (!editor || !commands || !onChange) return;
    const unregister = editor.registerUpdateListener(() => {
      try {
        const html = commands.exportToHTML();
        onChange(html);
      } catch (e) {
        // ignore export errors
      }
    });
    return unregister;
  }, [editor, commands, onChange]);

  const placeholderNode = useMemo(
    () =>
      placeholder ? (
        <div className="absolute top-3 left-4 text-gray-400 dark:text-slate-500 pointer-events-none text-sm">
          {placeholder}
        </div>
      ) : null,
    [placeholder]
  );

  return (
    <>
      <Toolbar />
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="w-full min-h-[90px] max-h-[180px] overflow-y-auto px-4 py-3 text-sm text-gray-900 dark:text-slate-200 leading-relaxed focus:outline-none focus:ring-0 placeholder-gray-400 dark:placeholder-slate-500"
              aria-placeholder={placeholder}
            />
          }
          placeholder={placeholderNode}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
    </>
  );
}

export default function TaskDescriptionEditor({ value, onChange, placeholder }) {
  const initialValueRef = useRef(value || '');

  const initialConfig = useMemo(
    () => ({
      // LexKit uses its own internal Lexical editor; no extra config needed here.
    }),
    []
  );

  return (
    <Provider extensions={extensions} config={initialConfig}>
      <InnerEditor initialValue={initialValueRef.current} onChange={onChange} placeholder={placeholder} />
    </Provider>
  );
}

