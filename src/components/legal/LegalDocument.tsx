import Link from "next/link";
import type { LegalBlock, LegalDoc } from "@/lib/legal/types";

function renderBlock(block: LegalBlock, key: number) {
  switch (block.type) {
    case "h1":
      return (
        <h2 key={key} className="mt-6 font-heading text-xl tracking-wide text-ivory">
          {block.text}
        </h2>
      );
    case "h2":
      return (
        <h3 key={key} className="mt-4 font-heading text-base tracking-wide text-ivory">
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p key={key} className="font-body text-sm leading-relaxed text-silver">
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul key={key} className="flex list-disc flex-col gap-1 pl-5 font-body text-sm leading-relaxed text-silver">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div key={key} className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left font-body text-sm text-silver">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="border-b border-ivory/10 py-2 pr-4 font-accent text-xs uppercase tracking-wider text-ivory">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border-b border-ivory/5 py-2 pr-4 align-top leading-relaxed">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
      return (
        <p key={key} className="font-body text-sm italic leading-relaxed text-silver/80">
          {block.text}
        </p>
      );
    case "docLink":
      return (
        <p key={key}>
          <Link href={block.href} className="font-accent text-sm text-ivory underline hover:text-coral">
            Full document: {block.text} →
          </Link>
        </p>
      );
  }
}

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="font-heading text-3xl tracking-wide text-ivory">{doc.title}</h1>
      <p className="font-accent text-xs uppercase tracking-wider text-silver">
        {doc.version} · {doc.lastUpdated}
      </p>
      {doc.blocks.map((block, i) => renderBlock(block, i))}
    </article>
  );
}
