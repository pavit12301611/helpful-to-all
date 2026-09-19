import { NextResponse } from 'next/server';
import { requireUser } from '@/server/core/guards';
import { getInvoice } from '@/features/business/service';
import { PDF_PAGE, renderPdf, type PdfLine, type PdfRule } from '@/server/services/pdf';
import { formatMoney } from '@/lib/utils';
import { isAppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Invoice PDF.
 *
 * Written by OpenHub's own minimal PDF writer (no external service, no paid API)
 * and only served to the account that owns the invoice.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const invoice = await getInvoice(user.id, id);
    const business = invoice.business;
    const currency = invoice.currency ?? business.currency;
    const { margin, width } = PDF_PAGE;
    const right = width - margin;

    const lines: PdfLine[] = [];
    const rules: PdfRule[] = [];
    let y = margin;

    lines.push({ text: business.name, x: margin, y, size: 18, bold: true });
    lines.push({ text: 'INVOICE', x: right, y, size: 18, bold: true, align: 'right' });
    y += 18;

    const contactParts = [business.address, business.city, business.country, business.phone, business.email, business.website].filter(
      (value): value is string => Boolean(value),
    );
    for (const part of contactParts) {
      lines.push({ text: part, x: margin, y, size: 9, color: [0.4, 0.4, 0.4] });
      y += 12;
    }
    if (business.taxId) {
      lines.push({ text: `Tax ID: ${business.taxId}`, x: margin, y, size: 9, color: [0.4, 0.4, 0.4] });
      y += 12;
    }

    y += 8;
    lines.push({ text: `Invoice: ${invoice.number}`, x: right, y, size: 10, bold: true, align: 'right' });
    y += 13;
    lines.push({ text: `Issued: ${invoice.issueDate.toISOString().slice(0, 10)}`, x: right, y, size: 10, align: 'right' });
    y += 13;
    if (invoice.dueDate) {
      lines.push({ text: `Due: ${invoice.dueDate.toISOString().slice(0, 10)}`, x: right, y, size: 10, align: 'right' });
      y += 13;
    }
    lines.push({ text: `Status: ${invoice.status.toUpperCase()}`, x: right, y, size: 10, align: 'right' });
    y += 20;

    if (invoice.customer) {
      lines.push({ text: 'BILL TO', x: margin, y, size: 9, bold: true, color: [0.45, 0.45, 0.45] });
      y += 13;
      lines.push({ text: invoice.customer.name, x: margin, y, size: 11, bold: true });
      y += 13;
      const customerParts = [invoice.customer.address, invoice.customer.email, invoice.customer.phone].filter(
        (value): value is string => Boolean(value),
      );
      for (const part of customerParts) {
        lines.push({ text: part, x: margin, y, size: 9, color: [0.4, 0.4, 0.4] });
        y += 12;
      }
      y += 10;
    }

    rules.push({ y, from: margin, to: right });
    y += 18;

    lines.push({ text: 'Description', x: margin, y, size: 10, bold: true });
    lines.push({ text: 'Qty', x: right - 180, y, size: 10, bold: true, align: 'right' });
    lines.push({ text: 'Unit', x: right - 90, y, size: 10, bold: true, align: 'right' });
    lines.push({ text: 'Amount', x: right, y, size: 10, bold: true, align: 'right' });
    y += 8;
    rules.push({ y, from: margin, to: right, width: 0.5 });
    y += 16;

    for (const item of invoice.items) {
      lines.push({ text: item.description.slice(0, 70), x: margin, y, size: 10 });
      lines.push({ text: String(item.quantity), x: right - 180, y, size: 10, align: 'right' });
      lines.push({ text: formatMoney(item.unitPriceCents, currency), x: right - 90, y, size: 10, align: 'right' });
      lines.push({ text: formatMoney(item.totalCents, currency), x: right, y, size: 10, align: 'right' });
      y += 16;
      if (y > PDF_PAGE.height - 160) break;
    }

    y += 6;
    rules.push({ y, from: right - 220, to: right, width: 0.5 });
    y += 18;

    const summary: [string, number][] = [['Subtotal', invoice.subtotalCents]];
    if (invoice.discountCents > 0) summary.push(['Discount', -invoice.discountCents]);
    summary.push([`Tax (${(invoice.taxRateBp / 100).toFixed(2)}%)`, invoice.taxCents]);

    for (const [label, amount] of summary) {
      lines.push({ text: label, x: right - 220, y, size: 10 });
      lines.push({ text: formatMoney(amount, currency), x: right, y, size: 10, align: 'right' });
      y += 15;
    }

    y += 4;
    rules.push({ y, from: right - 220, to: right, width: 0.5 });
    y += 18;
    lines.push({ text: 'TOTAL', x: right - 220, y, size: 12, bold: true });
    lines.push({ text: formatMoney(invoice.totalCents, currency), x: right, y, size: 12, bold: true, align: 'right' });
    y += 26;

    if (invoice.notes) {
      lines.push({ text: 'Notes', x: margin, y, size: 9, bold: true, color: [0.45, 0.45, 0.45] });
      y += 13;
      for (const chunk of invoice.notes.match(/.{1,95}/g) ?? []) {
        lines.push({ text: chunk, x: margin, y, size: 9, color: [0.35, 0.35, 0.35] });
        y += 12;
      }
      y += 10;
    }

    lines.push({
      text: 'Generated by OpenHub. Verify the details with the business before paying.',
      x: margin,
      y: PDF_PAGE.height - margin,
      size: 8,
      color: [0.55, 0.55, 0.55],
    });

    const pdf = renderPdf(lines, rules);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.name === 'NotFoundError' ? 404 : 403 });
    }
    throw error;
  }
}
