import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, 'Add your business name.').max(100),
  description: optionalText(600),
  address: optionalText(200),
  city: optionalText(80),
  country: optionalText(80),
  phone: optionalText(40),
  email: z.string().trim().email('Enter a valid email.').max(160).optional().or(z.literal('')),
  website: z.string().trim().url('That does not look like a link.').max(300).optional().or(z.literal('')),
  taxId: optionalText(60),
  taxRateBp: z.coerce.number().int().min(0).max(10000).optional(),
  invoicePrefix: z.string().trim().max(12).optional().or(z.literal('')),
  currency: z.string().trim().min(3).max(3).optional().or(z.literal('')),
  qrMenuEnabled: z.enum(['on', 'off']).optional(),
  published: z.enum(['on', 'off']).optional(),
});
export type BusinessProfileInput = z.input<typeof businessProfileSchema>;

export const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Name the service.').max(100),
  description: optionalText(400),
  priceCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
  durationMinutes: z.coerce.number().int().min(0).max(1440).optional(),
});
export type ServiceInput = z.input<typeof serviceSchema>;

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Add a name.').max(100),
  email: z.string().trim().email('Enter a valid email.').max(160).optional().or(z.literal('')),
  phone: optionalText(40),
  address: optionalText(200),
  notes: optionalText(600),
});
export type CustomerInput = z.input<typeof customerSchema>;

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Add an item name.').max(120),
  sku: optionalText(60),
  category: optionalText(60),
  quantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  unitCostCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
  priceCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
  reorderLevel: z.coerce.number().int().min(0).max(1_000_000).optional(),
});
export type InventoryItemInput = z.input<typeof inventoryItemSchema>;

export const appointmentSchema = z.object({
  clientName: z.string().trim().min(2, 'Add the client name.').max(100),
  clientEmail: z.string().trim().email('Enter a valid email.').max(160).optional().or(z.literal('')),
  customerId: optionalText(40),
  serviceId: optionalText(40),
  startsAt: z.string().trim().min(1, 'Pick a time.'),
  durationMinutes: z.coerce.number().int().min(5).max(720).optional(),
  notes: optionalText(400),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
});
export type AppointmentInput = z.input<typeof appointmentSchema>;

export const cannedMessageSchema = z.object({
  title: z.string().trim().min(2, 'Add a title.').max(80),
  body: z.string().trim().min(2, 'Add the message.').max(600),
});
export type CannedMessageInput = z.input<typeof cannedMessageSchema>;

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Describe the line item.').max(200),
  quantity: z.coerce.number().min(0.01).max(10000).default(1),
  unitPriceCents: z.coerce.number().int().min(0).max(100_000_000),
});
export type InvoiceItemInput = z.input<typeof invoiceItemSchema>;

export const invoiceSchema = z.object({
  customerId: optionalText(40),
  issueDate: z.string().trim().min(1, 'Add an issue date.'),
  dueDate: optionalText(40),
  currency: z.string().trim().min(3).max(3).optional().or(z.literal('')),
  taxRateBp: z.coerce.number().int().min(0).max(10000).optional(),
  discountCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
  notes: optionalText(600),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']).optional(),
});
export type InvoiceInput = z.input<typeof invoiceSchema>;

export const saleSchema = z.object({
  amountCents: z.coerce.number().int().min(0).max(1_000_000_000),
  method: z.enum(['cash', 'upi', 'card', 'bank', 'other']).default('cash'),
  invoiceId: optionalText(40),
  notes: optionalText(200),
});
export type SaleInput = z.input<typeof saleSchema>;

export const businessFilters = z.object({
  q: z.string().trim().max(80).optional(),
  city: optionalText(80),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

export const BUSINESS_PAGE_SIZE = 12;

/** Money maths kept in one place so invoices, sales and reports always agree. */
export function invoiceTotals<T extends { quantity?: number; unitPriceCents: number }>(
  items: T[],
  options: { taxRateBp: number; discountCents: number },
) {
  const quantityOf = (item: T) => item.quantity ?? 1;
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(quantityOf(item) * item.unitPriceCents), 0);
  const taxable = Math.max(0, subtotalCents - options.discountCents);
  const taxCents = Math.round((taxable * options.taxRateBp) / 10000);
  return {
    lines: items.map((item) => ({ ...item, quantity: quantityOf(item), totalCents: Math.round(quantityOf(item) * item.unitPriceCents) })),
    subtotalCents,
    discountCents: options.discountCents,
    taxCents,
    totalCents: taxable + taxCents,
  };
}
