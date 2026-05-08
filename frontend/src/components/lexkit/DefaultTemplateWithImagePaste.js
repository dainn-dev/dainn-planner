import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  createEditorSystem,
  boldExtension,
  italicExtension,
  underlineExtension,
  strikethroughExtension,
  linkExtension,
  listExtension,
  historyExtension,
  blockFormatExtension,
  htmlExtension,
  contextMenuExtension,
  TableExtension,
  imageExtension,
} from '@lexkit/editor';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import { PASTE_COMMAND } from 'lexical';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Undo,
  Redo,
  Link,
  Unlink,
  RemoveFormatting,
  Table,
  Image as ImageIcon,
} from 'lucide-react';
import { defaultTheme } from './theme';
import './styles.css';

const extensions = [
  boldExtension,
  italicExtension,
  underlineExtension,
  strikethroughExtension,
  linkExtension.configure({
    linkSelectedTextOnPaste: true,
    autoLinkText: true,
    autoLinkUrls: true,
  }),
  listExtension,
  historyExtension,
  blockFormatExtension,
  htmlExtension,
  contextMenuExtension,
  new TableExtension().configure({
    enableContextMenu: true,
    contextMenuExtension,
  }),
  imageExtension,
];

const { Provider, useEditor } = createEditorSystem();

function ErrorBoundary({ children }) {
  return <>{children}</>;
}

// Plugin to handle image paste
function ImagePastePlugin({ onImageUpload }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor || !onImageUpload) return;

    const removeCommand = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const items = Array.from(clipboardData.items);
        const imageItem = items.find((item) => item.type.startsWith('image/'));

        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file) {
            onImageUpload(file);
          }
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      removeCommand();
    };
  }, [editor, onImageUpload]);

  return null;
}

function Toolbar({ commands, activeStates, hasExtension, onInsertImage }) {
  const [showTablePopover, setShowTablePopover] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const fileInputRef = useRef(null);

  const handleInsertTable = () => {
    commands.insertTable({ rows: tableRows, columns: tableCols });
    setShowTablePopover(false);
    setTableRows(3);
    setTableCols(3);
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onInsertImage) {
      onInsertImage(file);
    }
    e.target.value = '';
  };

  return (
    <div className="lexkit-toolbar">
      <div className="lexkit-toolbar-section">
        <button
          type="button"
          onClick={() => commands.toggleBold()}
          className={`lexkit-toolbar-button ${activeStates.bold ? 'active' : ''}`}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => commands.toggleItalic()}
          className={`lexkit-toolbar-button ${activeStates.italic ? 'active' : ''}`}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => commands.toggleUnderline()}
          className={`lexkit-toolbar-button ${activeStates.underline ? 'active' : ''}`}
          title="Underline (Ctrl+U)"
        >
          <Underline size={16} />
        </button>
        <button
          type="button"
          onClick={() => commands.toggleStrikethrough()}
          className={`lexkit-toolbar-button ${activeStates.strikethrough ? 'active' : ''}`}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
      </div>

      {hasExtension('list') && (
        <div className="lexkit-toolbar-section">
          <button
            type="button"
            onClick={() => commands.toggleUnorderedList()}
            className={`lexkit-toolbar-button ${activeStates.unorderedList ? 'active' : ''}`}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => commands.toggleOrderedList()}
            className={`lexkit-toolbar-button ${activeStates.orderedList ? 'active' : ''}`}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
        </div>
      )}

      <div className="lexkit-toolbar-section">
        <button
          type="button"
          onClick={() =>
            activeStates.isLink ? commands.removeLink() : commands.insertLink()
          }
          className={`lexkit-toolbar-button ${activeStates.isLink ? 'active' : ''}`}
          title={activeStates.isLink ? 'Remove Link' : 'Insert Link'}
        >
          {activeStates.isLink ? <Unlink size={16} /> : <Link size={16} />}
        </button>
      </div>

      {hasExtension('image') && (
        <div className="lexkit-toolbar-section">
          <button
            type="button"
            onClick={handleImageButtonClick}
            className="lexkit-toolbar-button"
            title="Insert Image"
          >
            <ImageIcon size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageFileChange}
          />
        </div>
      )}

      {hasExtension('table') && (
        <div className="lexkit-toolbar-section" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowTablePopover((v) => !v)}
            className="lexkit-toolbar-button"
            title="Insert Table"
          >
            <Table size={16} />
          </button>
          {showTablePopover && (
            <div className="lexkit-table-popover">
              <label className="lexkit-table-popover-label">
                Rows
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, +e.target.value || 1))}
                  className="lexkit-table-popover-input"
                />
              </label>
              <label className="lexkit-table-popover-label">
                Cols
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, +e.target.value || 1))}
                  className="lexkit-table-popover-input"
                />
              </label>
              <button
                type="button"
                className="lexkit-table-popover-insert"
                onClick={handleInsertTable}
              >
                Insert
              </button>
            </div>
          )}
        </div>
      )}

      <div className="lexkit-toolbar-section">
        <button
          type="button"
          onClick={() => commands.clearFormatting?.()}
          className="lexkit-toolbar-button"
          title="Clear Formatting"
        >
          <RemoveFormatting size={16} />
        </button>
      </div>

      {hasExtension('history') && (
        <div className="lexkit-toolbar-section">
          <button
            type="button"
            onClick={() => commands.undo()}
            disabled={!activeStates.canUndo}
            className="lexkit-toolbar-button"
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
          </button>
          <button
            type="button"
            onClick={() => commands.redo()}
            disabled={!activeStates.canRedo}
            className="lexkit-toolbar-button"
            title="Redo (Ctrl+Y)"
          >
            <Redo size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function EditorContent({ placeholder, onReady, onHtmlChange, enableHtmlSync, onImageUpload }) {
  const { commands, hasExtension, activeStates, lexical: editor } = useEditor();
  const commandsRef = useRef(commands);
  const readyRef = useRef(false);
  const onHtmlChangeRef = useRef(onHtmlChange);
  const onImageUploadRef = useRef(onImageUpload);

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  useEffect(() => {
    onHtmlChangeRef.current = onHtmlChange;
  }, [onHtmlChange]);

  useEffect(() => {
    onImageUploadRef.current = onImageUpload;
  }, [onImageUpload]);

  const handleImageUpload = async (file) => {
    const uploadFn = onImageUploadRef.current;
    if (!uploadFn) return;
    try {
      const url = await uploadFn(file);
      if (url && commandsRef.current?.insertImage) {
        commandsRef.current.insertImage({ src: url, alt: file.name });
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  const methods = useMemo(
    () => ({
      injectHTML: (content) => {
        setTimeout(() => {
          if (editor) {
            editor.update(() => {
              commandsRef.current.importFromHTML(content, { preventFocus: true });
            });
          }
        }, 100);
      },
      getHTML: () => commandsRef.current.exportToHTML(),
      clear: () => {
        if (editor) {
          editor.update(() => {
            commandsRef.current.importFromHTML('', { preventFocus: true });
          });
        }
      },
    }),
    [editor],
  );

  useEffect(() => {
    if (!editor || !commands) return;
    if (!readyRef.current) {
      readyRef.current = true;
      onReady?.(methods);
    }
  }, [editor, commands, onReady, methods]);

  /** Keep controlled consumers (e.g. My CV) in sync; defer briefly so parent `injectHTML` runs first */
  useEffect(() => {
    if (!editor || !enableHtmlSync) return undefined;
    let allowEmit = false;
    const tid = window.setTimeout(() => {
      allowEmit = true;
    }, 220);
    const unregister = editor.registerUpdateListener(() => {
      if (!allowEmit) return;
      const cb = onHtmlChangeRef.current;
      if (!cb) return;
      try {
        cb(commandsRef.current.exportToHTML());
      } catch {
        // ignore
      }
    });
    return () => {
      window.clearTimeout(tid);
      unregister();
    };
  }, [editor, enableHtmlSync]);

  return (
    <>
      <Toolbar
        commands={commands}
        activeStates={activeStates}
        hasExtension={hasExtension}
        onInsertImage={handleImageUpload}
      />
      <div className="lexkit-editor">
        <ImagePastePlugin onImageUpload={handleImageUpload} />
        <RichTextPlugin
          contentEditable={<ContentEditable className="lexkit-content-editable" />}
          placeholder={
            <div className="lexkit-placeholder">{placeholder || 'Start typing...'}</div>
          }
          ErrorBoundary={ErrorBoundary}
        />
      </div>
    </>
  );
}

const DefaultTemplateWithImagePaste = forwardRef(({ className, placeholder, onReady, onHtmlChange, onImageUpload }, ref) => {
  const [editorTheme, setEditorTheme] = useState('light');
  const [methods, setMethods] = useState(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setEditorTheme(isDark ? 'dark' : 'light');

    const observer = new MutationObserver(() => {
      setEditorTheme(
        document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => methods, [methods]);

  const handleReady = (m) => {
    setMethods(m);
    onReady?.(m);
  };

  return (
    <div
      className={`lexkit-editor-wrapper ${className || ''}`}
      data-editor-theme={editorTheme}
    >
      <Provider extensions={extensions} config={{ theme: defaultTheme }}>
        <EditorContent
          placeholder={placeholder}
          onReady={handleReady}
          onHtmlChange={onHtmlChange}
          enableHtmlSync={typeof onHtmlChange === 'function'}
          onImageUpload={onImageUpload}
        />
      </Provider>
    </div>
  );
});

DefaultTemplateWithImagePaste.displayName = 'DefaultTemplateWithImagePaste';

export { DefaultTemplateWithImagePaste };
export default DefaultTemplateWithImagePaste;
