// SPDX-License-Identifier: MIT

/** Same markers the section contract tests reject. Copy may be prose; a document may not. */
const FULL_PAGE_HTML = /<!doctype|<html/i;

export class FullPageHtmlError extends Error {
  constructor() {
    super("full_page_html_rejected");
    this.name = "FullPageHtmlError";
  }
}

export function containsFullPageHtml(text: string) {
  return FULL_PAGE_HTML.test(text);
}

/** Reject a tool payload that is, or embeds, a whole HTML document. */
export function assertSectionJsonOnly(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text && containsFullPageHtml(text)) throw new FullPageHtmlError();
}
