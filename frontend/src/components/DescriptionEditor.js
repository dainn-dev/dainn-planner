import React, { useCallback, useMemo, useRef } from 'react';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $getSelection, $insertNodes, $isTextNode, FORMAT_TEXT_COMMAND } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';

const theme = {
  paragraph: 'mb-1 last:mb-0',
  list: {
    ul: 'list-disc list-inside my-1',
    ol: 'list-decimal list-inside my-1',
    listitem: 'ml-2',
  },
  link: 'text-primary dark:text-primary-light underline cursor-pointer',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
  },
};

function onError(error) {
  console.error('DescriptionEditor:', error);
}

function HtmlOnChangePlugin({ onChange }) {
  const [editor] = useLexicalComposerContext();

  const handleChange = useCallback(
    (editorState) => {
      if (!onChange) return;
      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor, null);
        onChange(html);
      });
    },
    [editor, onChange]
  );

  return <OnChangePlugin ignoreSelectionChange onChange={handleChange} />;
}

function ToolbarPlugin({ onLinkPrompt }) {
  const [editor] = useLexicalComposerContext();

  const format = (type) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);
  };

  const insertList = (listType) => {
    editor.dispatchCommand(
      listType === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
      undefined
    );
  };

  const applyLink = () => {
    const url = onLinkPrompt ? onLinkPrompt() : window.prompt('URL:', 'https://');
    if (url == null || !String(url).trim()) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim());
  };

  const removeFormat = () => {
    editor.update(() => {
      const sel = $getSelection();
      if (!sel) return;
      sel.getNodes().forEach((node) => {
        if ($isTextNode(node)) {
          node.setFormat(0);
        }
      });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => format('bold')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Bold"
        aria-label="Bold"
      >
        <span className="material-symbols-outlined text-lg">format_bold</span>
      </button>
      <button
        type="button"
        onClick={() => format('italic')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Italic"
        aria-label="Italic"
      >
        <span className="material-symbols-outlined text-lg">format_italic</span>
      </button>
      <button
        type="button"
        onClick={() => format('underline')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Underline"
        aria-label="Underline"
      >
        <span className="material-symbols-outlined text-lg">format_underlined</span>
      </button>
      <button
        type="button"
        onClick={() => format('strikethrough')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Strikethrough"
        aria-label="Strikethrough"
      >
        <span className="material-symbols-outlined text-lg">format_strikethrough</span>
      </button>
      <span className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-0.5" aria-hidden />
      <button
        type="button"
        onClick={() => insertList('bullet')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Bullet list"
        aria-label="Bullet list"
      >
        <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
      </button>
      <button
        type="button"
        onClick={() => insertList('number')}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Numbered list"
        aria-label="Numbered list"
      >
        <span className="material-symbols-outlined text-lg">format_list_numbered</span>
      </button>
      <button
        type="button"
        onClick={applyLink}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Insert link"
        aria-label="Insert link"
      >
        <span className="material-symbols-outlined text-lg">link</span>
      </button>
      <span className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-0.5" aria-hidden />
      <button
        type="button"
        onClick={removeFormat}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Remove format"
        aria-label="Remove format"
      >
        <span className="material-symbols-outlined text-lg">format_clear</span>
      </button>
    </div>
  );
}

export function DescriptionEditor({ value = '', onChange, placeholder = '', onLinkPrompt }) {
  const valueAtMount = useRef(value);

  const initialEditorState = useMemo(() => {
    return (editor) => {
      const v = valueAtMount.current;
      if (!v || typeof v !== 'string' || !v.trim()) return;
      try {
        const parser = new DOMParser();
        const dom = parser.parseFromString(v.trim(), 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();
        root.clear();
        $insertNodes(nodes);
      } catch (e) {
        console.warn('DescriptionEditor: failed to parse initial HTML', e);
      }
    };
  }, []);

  const initialConfig = useMemo(
    () => ({
      namespace: 'TaskDescriptionEditor',
      theme,
      onError,
      nodes: [ListNode, ListItemNode, LinkNode],
      editorState: initialEditorState,
    }),
    [initialEditorState]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <ToolbarPlugin onLinkPrompt={onLinkPrompt} />
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="w-full min-h-[90px] max-h-[180px] overflow-y-auto px-4 py-3 text-sm text-gray-900 dark:text-slate-200 leading-relaxed focus:outline-none focus:ring-0 placeholder-gray-400 dark:placeholder-slate-500"
            aria-placeholder={placeholder}
            data-placeholder={placeholder}
          />
        }
        placeholder={
          placeholder ? (
            <div className="absolute top-3 left-4 text-gray-400 dark:text-slate-500 pointer-events-none text-sm">
              {placeholder}
            </div>
          ) : null
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <HtmlOnChangePlugin onChange={onChange} />
    </LexicalComposer>
  );
}

export default DescriptionEditor;
