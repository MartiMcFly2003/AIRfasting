export type LegalBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "note"; text: string }
  | { type: "docLink"; text: string; href: string };

export interface LegalDoc {
  title: string;
  version: string;
  lastUpdated: string;
  blocks: LegalBlock[];
}
