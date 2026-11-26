"use client";

import { createElement, Fragment, type ReactNode } from "react";

function inlineMarkdown(value: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  return value.split(pattern).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return createElement("strong", { key: index }, part.slice(2, -2));
    if (part.startsWith("*") && part.endsWith("*")) return createElement("em", { key: index }, part.slice(1, -1));
    if (part.startsWith("`") && part.endsWith("`")) return createElement("code", { key: index }, part.slice(1, -1));
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) return createElement("a", { key: index, href: link[2], target: "_blank", rel: "noreferrer" }, link[1]);
    return createElement(Fragment, { key: index }, part);
  });
}

export default function MarkdownContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let code: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(createElement("p", { key: blocks.length }, inlineMarkdown(paragraph.join(" "))));
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listType && list.length) {
      const type = listType;
      blocks.push(createElement(type, { key: blocks.length }, ...list.map((item, index) => createElement("li", { key: index }, inlineMarkdown(item)))));
    }
    list = [];
    listType = null;
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      flushParagraph(); flushList();
      if (inCode) {
        blocks.push(createElement("pre", { key: blocks.length }, createElement("code", null, code.join("\n"))));
        code = [];
      }
      inCode = !inCode;
      return;
    }
    if (inCode) { code.push(line); return; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = heading[1].length + 1;
      blocks.push(createElement(`h${level}`, { key: blocks.length }, inlineMarkdown(heading[2])));
    } else if (bullet || numbered) {
      flushParagraph();
      const nextType = bullet ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push((bullet || numbered)![1]);
    } else if (/^\s*>\s?/.test(line)) {
      flushParagraph(); flushList();
      blocks.push(createElement("blockquote", { key: blocks.length }, inlineMarkdown(line.replace(/^\s*>\s?/, ""))));
    } else if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
      flushParagraph(); flushList();
      blocks.push(createElement("hr", { key: blocks.length }));
    } else if (!line.trim()) {
      flushParagraph(); flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  });
  flushParagraph(); flushList();
  if (inCode && code.length) blocks.push(createElement("pre", { key: blocks.length }, createElement("code", null, code.join("\n"))));
  return createElement("div", { className: "markdown-content" }, ...blocks);
}
