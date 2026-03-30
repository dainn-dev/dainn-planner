import DOMPurify from "isomorphic-dompurify";

// Task description rich-text is editable HTML (LexKit export/import).
// We sanitize to prevent scripts/event handlers and dangerous URL schemes.
// NOTE: backend also sanitizes on write (defense-in-depth).
const TASK_RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "code",
    "pre",
    "span",
    "div",
    // Table support (Task editor includes TableExtension)
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "title", "colspan", "rowspan"],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeTaskHtml(dirty) {
  if (!dirty) return "";
  const out = DOMPurify.sanitize(String(dirty), TASK_RICH_TEXT_CONFIG);
  return typeof out === "string" ? out : String(out);
}

