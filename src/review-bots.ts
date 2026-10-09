const EXCERPT_LENGTH = 180;

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const HTML_TAG = /<\/?[a-z][^>]*>/gi;
const SUMMARY = /<summary\b[^>]*>([\s\S]*?)<\/summary\s*>/gi;
const FENCED_CODE = /```[\s\S]*?```/g;
const MARKDOWN_IMAGE = /!\[[^\]]*]\([^)]*\)/g;
const MARKDOWN_LINK = /\[([^\]]*)]\([^)]*\)/g;
const MARKDOWN_HEADING = /^#{1,6}\s+/gm;
const BLOCKQUOTE = /^>\s?/gm;
const MARKDOWN_DECORATION = /[*_`~|]/g;
const WHITESPACE = /\s+/g;

export const REVIEW_BOTS = {
  "coderabbitai[bot]": "CodeRabbit",
} as const;

type ReviewBotLogin = keyof typeof REVIEW_BOTS;

export const reviewBotLabel = (login: string): string | undefined =>
  REVIEW_BOTS[login as ReviewBotLogin];

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const commentExcerpt = (body: string): string => {
  const clean = (value: string): string =>
    value
      .replace(HTML_COMMENT, " ")
      .replace(HTML_TAG, " ")
      .replaceAll("&amp;", "&")
      .replace(FENCED_CODE, " ")
      .replace(MARKDOWN_IMAGE, " ")
      .replace(MARKDOWN_LINK, "$1")
      .replace(MARKDOWN_HEADING, "")
      .replace(BLOCKQUOTE, "")
      .replace(MARKDOWN_DECORATION, "")
      .replace(WHITESPACE, " ")
      .trim();

  const summaries = body.matchAll(SUMMARY);
  let plain = "";

  for (const summary of summaries) {
    plain = clean(summary[1] ?? "");
    if (plain.length > 0) {
      break;
    }
  }

  if (plain.length === 0) {
    plain = clean(body);
  }

  if (plain.length <= EXCERPT_LENGTH) {
    return plain;
  }

  return `${plain.slice(0, EXCERPT_LENGTH - 1)}…`;
};

const safeHref = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? escapeHtml(url.href) : undefined;
  } catch {
    return undefined;
  }
};

export const formatBotComment = (input: {
  body: string;
  bot: string;
  number: number;
  path?: string;
  repo: string;
  title: string;
  url: string;
}): string => {
  const file = input.path ? ` (<code>${escapeHtml(input.path)}</code>)` : "";
  const excerpt = commentExcerpt(input.body);
  const summary = excerpt.length > 0 ? `<br>🎯 ${escapeHtml(excerpt)}` : "";
  const href = safeHref(input.url);
  const commentLink = href ? `<br><a href="${href}">Ver comentario en GitHub</a>` : "";

  return `💬 <strong>${escapeHtml(input.repo)}</strong> · ${escapeHtml(input.bot)} comentó en PR #${input.number} ${escapeHtml(input.title)}${file}${summary}${commentLink}`;
};
