/**
 * Minimal PDF writer.
 *
 * Invoices need to be downloadable without pulling a heavy dependency into a
 * self-hosted install, so OpenHub writes a small, valid PDF 1.4 document by hand:
 * one page, Helvetica text, left/right aligned columns and simple rules.
 *
 * The writer is intentionally tiny - it covers invoices and the emergency card
 * export, not general purpose layout.
 */

export type PdfLine = {
  text: string;
  /** Points from the left edge. */
  x: number;
  /** Points from the top edge. */
  y: number;
  size?: number;
  bold?: boolean;
  /** Right edge for right aligned text. */
  align?: 'left' | 'right';
  color?: [number, number, number];
};

export type PdfRule = { y: number; from: number; to: number; width?: number };

const PAGE_WIDTH = 595.28; // A4 portrait
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

function escapeText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    // PDF standard fonts are Latin-1: replace anything outside it so the file stays valid.
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '-');
}

function buildContent(lines: PdfLine[], rules: PdfRule[]) {
  const parts: string[] = ['BT', '/F1 10 Tf', 'ET'];

  for (const rule of rules) {
    const y = PAGE_HEIGHT - rule.y;
    parts.push(
      `0.85 0.85 0.85 RG`,
      `${rule.width ?? 0.7} w`,
      `${rule.from.toFixed(2)} ${y.toFixed(2)} m`,
      `${rule.to.toFixed(2)} ${y.toFixed(2)} l`,
      'S',
    );
  }

  for (const line of lines) {
    const size = line.size ?? 10;
    const font = line.bold ? '/F2' : '/F1';
    const [r, g, b] = line.color ?? [0.1, 0.1, 0.1];
    const y = PAGE_HEIGHT - line.y;
    let x = line.x;

    if (line.align === 'right') {
      // Helvetica average advance is ~0.5 em; good enough for right aligned totals.
      x = line.x - escapeText(line.text).length * size * 0.5;
    }

    parts.push('BT', `${font} ${size} Tf`, `${r} ${g} ${b} rg`, `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`, `(${escapeText(line.text)}) Tj`, 'ET');
  }

  return parts.join('\n');
}

/** Builds a single page A4 PDF and returns it as a Buffer. */
export function renderPdf(lines: PdfLine[], rules: PdfRule[] = []): Buffer {
  const content = buildContent(lines, rules);
  const contentBuffer = Buffer.from(content, 'latin1');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${contentBuffer.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let position = 0;

  const push = (value: string | Buffer) => {
    const buffer = typeof value === 'string' ? Buffer.from(value, 'latin1') : value;
    chunks.push(buffer);
    position += buffer.length;
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  objects.forEach((object, index) => {
    offsets[index] = position;
    push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefPosition = position;
  const xref = [`xref`, `0 ${objects.length + 1}`, `0000000000 65535 f `];
  for (const offset of offsets) xref.push(`${String(offset).padStart(10, '0')} 00000 n `);
  push(`${xref.join('\n')}\n`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF\n`);

  return Buffer.concat(chunks);
}

export const PDF_PAGE = { width: PAGE_WIDTH, height: PAGE_HEIGHT, margin: MARGIN };
