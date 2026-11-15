import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
// Raw HTML is ignored, no rehype-raw, default safe URL transform, KaTeX trust:false.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { trust: false, strict: "warn", maxExpand: 1000 }],
        ]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
