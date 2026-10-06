const EXCERPT_LENGTH = 180;

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
  const plain = body
    .replace(FENCED_CODE, " ")
    .replace(MARKDOWN_IMAGE, " ")
    .replace(MARKDOWN_LINK, "$1")
    .replace(MARKDOWN_HEADING, "")
    .replace(BLOCKQUOTE, "")
    .replace(MARKDOWN_DECORATION, "")
    .replace(WHITESPACE, " ")
    .trim();

  if (plain.length <= EXCERPT_LENGTH) {
    return plain;
  }

  return `${plain.slice(0, EXCERPT_LENGTH - 1)}…`;
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
  const summary = excerpt.length > 0 ? `<br>${escapeHtml(excerpt)}` : "";

  return `💬 <strong>${escapeHtml(input.repo)}</strong> · ${input.bot} comentó en PR <a href="${escapeHtml(input.url)}">#${input.number} ${escapeHtml(input.title)}</a>${file}${summary}`;
};
