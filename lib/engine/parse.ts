// Incremental parser for the storyteller's plain-text format (see
// SYSTEM_PROMPT). Fed streamed text; emits events as each section completes.

export interface CastLine {
  name: string;
  role: string;
  look: string;
}
export interface ArtLine {
  shot: string;
  prompt: string;
}

export type ParseEvent =
  | { type: 'meta'; title: string; hook: string; premise: string; cast: CastLine[] }
  | { type: 'page'; index: number; heading: string; text: string; art?: ArtLine }
  | { type: 'memory'; text: string };

const PAGE_RE = /^=== PAGE (\d+):\s*(.*)$/;

export class StoryParser {
  private buffer = '';
  private lines: string[] = [];
  private section: 'head' | 'page' | 'memory' | 'end' = 'head';
  private title = '';
  private hook = '';
  private premise = '';
  private cast: CastLine[] = [];
  private metaSent = false;
  private page: { index: number; heading: string; body: string[]; art?: ArtLine } | null = null;
  private memory: string[] = [];

  push(chunk: string): ParseEvent[] {
    this.buffer += chunk;
    const parts = this.buffer.split('\n');
    this.buffer = parts.pop() ?? '';
    const out: ParseEvent[] = [];
    for (const line of parts) this.line(line, out);
    return out;
  }

  /** Flush whatever is buffered at the end of the stream. */
  end(): ParseEvent[] {
    const out: ParseEvent[] = [];
    if (this.buffer) this.line(this.buffer, out);
    this.buffer = '';
    this.closePage(out);
    if (this.section === 'memory' && this.memory.length) {
      out.push({ type: 'memory', text: tidy(this.memory) });
      this.memory = [];
    }
    return out;
  }

  private line(raw: string, out: ParseEvent[]) {
    const line = raw.replace(/\r$/, '');
    const trimmed = line.trim();
    if (this.section === 'end') return;

    const pageMatch = trimmed.match(PAGE_RE);
    if (pageMatch) {
      this.sendMeta(out);
      this.closePage(out);
      this.section = 'page';
      this.page = { index: Number(pageMatch[1]) - 1, heading: pageMatch[2].trim(), body: [] };
      return;
    }
    if (trimmed === '=== MEMORY') {
      this.sendMeta(out);
      this.closePage(out);
      this.section = 'memory';
      return;
    }
    if (trimmed === '=== END') {
      this.closePage(out);
      if (this.memory.length) out.push({ type: 'memory', text: tidy(this.memory) });
      this.memory = [];
      this.section = 'end';
      return;
    }

    if (this.section === 'head') {
      if (trimmed.startsWith('TITLE:')) this.title = trimmed.slice(6).trim();
      else if (trimmed.startsWith('HOOK:')) this.hook = trimmed.slice(5).trim();
      else if (trimmed.startsWith('PREMISE:')) this.premise = trimmed.slice(8).trim();
      else if (trimmed.startsWith('CAST:')) {
        const [name, role, look] = trimmed.slice(5).split('|').map((x) => x.trim());
        if (name && look && this.cast.length < 3) this.cast.push({ name, role: role || 'friend', look });
      }
    } else if (this.section === 'page' && this.page) {
      // Art directions sit before the page text; never show them to the reader.
      if (trimmed.startsWith('ART:')) {
        const raw = trimmed.slice(4).trim();
        const cut = raw.indexOf('|');
        const shot = cut >= 0 ? raw.slice(0, cut).trim() : '';
        const prompt = (cut >= 0 ? raw.slice(cut + 1) : raw).trim();
        if (prompt && !this.page.art) this.page.art = { shot, prompt };
        return;
      }
      this.page.body.push(line);
    } else if (this.section === 'memory') {
      this.memory.push(line);
    }
  }

  private sendMeta(out: ParseEvent[]) {
    if (this.metaSent) return;
    this.metaSent = true;
    out.push({ type: 'meta', title: this.title || 'Tonight’s Story', hook: this.hook, premise: this.premise, cast: this.cast });
  }

  private closePage(out: ParseEvent[]) {
    if (!this.page) return;
    const text = tidy(this.page.body);
    if (text) out.push({ type: 'page', index: this.page.index, heading: this.page.heading, text, ...(this.page.art ? { art: this.page.art } : {}) });
    this.page = null;
  }
}

/** Join lines, collapse runs of blank lines to a single paragraph break. */
function tidy(lines: string[]): string {
  return lines
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Cheap post-check for phrases the system prompt bans. Logged, not enforced:
// it tells us how often the prompt slips so we can tune it.
const BANNED = /\b(sparkl\w*|shimmer\w*|twinkl\w*|glimmer\w*|glistening|tapestry|whimsical|from that day on|learned that|true treasure|power of friendship)\b/gi;
export function bannedPhraseCount(text: string): number {
  return (text.match(BANNED) || []).length;
}
