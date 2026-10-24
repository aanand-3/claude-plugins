/** A document section rendered from markdown; hub IDs in the text become links to their pages. */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useData } from "../data";
import { docHref } from "../router";

const ID_RE = /\b(?:IDEA|(?:G|P|FEAT|BUG|CHORE|SPIKE)-\d+|K-\d{4}-\d{2}-\d{2}-[a-z0-9-]+)\b/g;
const CODE_RE = /(```[\s\S]*?```|`[^`\n]*`)/;

/** Link every known ID outside code spans and fences. */
export function linkIds(md: string, known: (id: string) => boolean): string {
  return md.split(CODE_RE).map((part, i) =>
    i % 2 ? part : part.replace(ID_RE, (id, at: number, all: string) =>
      known(id) && all[at - 1] !== "[" ? `[${id}](${docHref(id)})` : id)).join("");
}

export function Markdown({ text }: { text: string }) {
  const { byId } = useData();
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => href?.startsWith("#/")
            ? <a className="idlink" href={href}><span className="id">{children}</span></a>
            : <a href={href} target="_blank" rel="noreferrer">{children}</a>,
        }}
      >
        {linkIds(text, (id) => byId.has(id))}
      </ReactMarkdown>
    </div>
  );
}
