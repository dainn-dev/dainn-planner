import DOMPurify from "isomorphic-dompurify"

/**
 * CV rich-text fields (experience/cert descriptions, portfolio body) may contain HTML from the API.
 * Sanitize before dangerouslySetInnerHTML so script/on* handlers cannot run (defense in depth; API should still validate on write).
 */
const CV_RICH_TEXT_CONFIG = {
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
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "title"],
  ALLOW_DATA_ATTR: false,
}

export function sanitizeCvHtml(dirty: string | null | undefined): string {
  if (!dirty) return ""
  const out = DOMPurify.sanitize(dirty, CV_RICH_TEXT_CONFIG)
  return typeof out === "string" ? out : String(out)
}
