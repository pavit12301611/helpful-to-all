import { getDb } from '@/server/db/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { contains } from '@/lib/db-config';
import { logActivity } from '@/server/core/audit';
import { BUSINESS_PAGE_SIZE, invoiceTotals, type AppointmentInput, type BusinessProfileInput, type CannedMessageInput, type CustomerInput, type InventoryItemInput, type InvoiceInput, type InvoiceItemInput, type SaleInput, type ServiceInput } from './schemas';

/**
 * Small business tools.
 *
 * One business per account keeps the model simple and honest: profile, services,
 * customers, inventory, appointments, invoices (with PDF export), QR code and a
 * revenue report built from recorded sales.
 */

export async function getMyBusiness(userId: string) {
  const db = await getDb();
  return db.businessProfile.findUnique({ where: { ownerId: userId } });
}

export async function requireBusiness(userId: string) {
  const business = await getMyBusiness(userId);
  if (!business) throw new NotFoundError('Create your business profile first.');
  return business;
}

export async function getPublicBusiness(slug: string) {
  const db = await getDb();
  const business = await db.businessProfile.findFirst({
    where: { slug, published: true },
    include: { services: { orderBy: { position: 'asc' } } },
  });
  if (!business) throw new NotFoundError('That business page does not exist or is not published.');
  return business;
}

export async function listBusinesses(filters: { q?: string; city?: string; page: number }) {
  const db = await getDb();
  const where: Record<string, unknown> = { published: true };
  if (filters.q) where.OR = [{ name: contains(filters.q) }, { description: contains(filters.q) }];
  if (filters.city) where.city = contains(filters.city);

  const [businesses, total] = await Promise.all([
    db.businessProfile.findMany({
      where,
      include: { _count: { select: { services: true } } },
      orderBy: { name: 'asc' },
      take: BUSINESS_PAGE_SIZE,
      skip: (filters.page - 1) * BUSINESS_PAGE_SIZE,
    }),
    db.businessProfile.count({ where }),
  ]);
  return { businesses, total };
}

export async function saveBusinessProfile(userId: string, input: BusinessProfileInput) {
  const db = await getDb();
  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `business-${userId.slice(0, 6)}`;

  const existing = await db.businessProfile.findUnique({ where: { ownerId: userId } });
  if (existing) {
    const clash = await db.businessProfile.findFirst({ where: { slug, ownerId: { not: userId } } });
    return db.businessProfile.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        slug: clash ? `${slug}-${userId.slice(0, 4)}` : slug,
        description: input.description || null,
        address: input.address || null,
        city: input.city || null,
        country: input.country || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        taxId: input.taxId || null,
        taxRateBp: input.taxRateBp ?? existing.taxRateBp,
        invoicePrefix: input.invoicePrefix || existing.invoicePrefix,
        currency: input.currency || existing.currency,
        qrMenuEnabled: input.qrMenuEnabled !== 'off',
        published: input.published !== 'off',
      },
    });
  }

  const clash = await db.businessProfile.findUnique({ where: { slug } });
  return db.businessProfile.create({
    data: {
      ownerId: userId,
      name: input.name,
      slug: clash ? `${slug}-${userId.slice(0, 4)}` : slug,
      description: input.description || null,
      address: input.address || null,
      city: input.city || null,
      country: input.country || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      taxId: input.taxId || null,
      taxRateBp: input.taxRateBp ?? 0,
      invoicePrefix: input.invoicePrefix || 'INV',
      invoiceCounter: 1,
      currency: input.currency || 'INR',
      qrMenuEnabled: input.qrMenuEnabled !== 'off',
      published: input.published !== 'off',
    },
  });
}

/* ---------------------------------------------------------------- services */

export async function listServices(businessId: string) {
  const db = await getDb();
  return db.service.findMany({ where: { businessId }, orderBy: [{ position: 'asc' }, { name: 'asc' }] });
}

export async function createService(userId: string, input: ServiceInput) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.service.create({
    data: {
      businessId: business.id,
      name: input.name,
      description: input.description || null,
      priceCents: input.priceCents ?? 0,
      durationMinutes: input.durationMinutes ?? 60,
      position: 0,
    },
  });
}

export async function deleteService(userId: string, id: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  await db.service.deleteMany({ where: { id, businessId: business.id } });
  return { deleted: true };
}

/* --------------------------------------------------------------- customers */

export async function listCustomers(userId: string, q?: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.customer.findMany({
    where: { businessId: business.id, ...(q ? { OR: [{ name: contains(q) }, { email: contains(q) }, { phone: contains(q) }] } : {}) },
    orderBy: { name: 'asc' },
    take: 100,
  });
}

export async function createCustomer(userId: string, input: CustomerInput) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.customer.create({
    data: {
      businessId: business.id,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      notes: input.notes || null,
    },
  });
}

export async function deleteCustomer(userId: string, id: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  await db.customer.deleteMany({ where: { id, businessId: business.id } });
  return { deleted: true };
}

/* --------------------------------------------------------------- inventory */

export async function listInventory(userId: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.inventoryItem.findMany({ where: { businessId: business.id }, orderBy: { name: 'asc' } });
}

export async function createInventoryItem(userId: string, input: InventoryItemInput) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.inventoryItem.create({
    data: {
      businessId: business.id,
      name: input.name,
      sku: input.sku || null,
      category: input.category || null,
      quantity: input.quantity ?? 0,
      unitCostCents: input.unitCostCents ?? 0,
      priceCents: input.priceCents ?? 0,
      reorderLevel: input.reorderLevel ?? 0,
    },
  });
}

export async function adjustInventory(userId: string, id: string, delta: number) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  const item = await db.inventoryItem.findFirst({ where: { id, businessId: business.id } });
  if (!item) throw new NotFoundError('That item does not exist.');
  const quantity = Math.max(0, item.quantity + delta);
  return db.inventoryItem.update({ where: { id }, data: { quantity } });
}

export async function deleteInventoryItem(userId: string, id: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  await db.inventoryItem.deleteMany({ where: { id, businessId: business.id } });
  return { deleted: true };
}

/* ------------------------------------------------------------- appointments */

export async function listAppointments(userId: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.appointment.findMany({
    where: { businessId: business.id },
    include: { service: true, customer: true },
    orderBy: { startsAt: 'asc' },
    take: 100,
  });
}

export async function createAppointment(userId: string, input: AppointmentInput) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  const startsAt = new Date(input.startsAt);
  const durationMinutes = input.durationMinutes ?? 60;

  return db.appointment.create({
    data: {
      businessId: business.id,
      clientName: input.clientName,
      clientEmail: input.clientEmail || null,
      customerId: input.customerId || null,
      serviceId: input.serviceId || null,
      startsAt,
      endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
      status: input.status ?? 'scheduled',
      notes: input.notes || null,
    },
  });
}

export async function setAppointmentStatus(userId: string, id: string, status: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  const appointment = await db.appointment.findFirst({ where: { id, businessId: business.id } });
  if (!appointment) throw new NotFoundError('That appointment does not exist.');
  return db.appointment.update({ where: { id }, data: { status } });
}

export async function deleteAppointment(userId: string, id: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  await db.appointment.deleteMany({ where: { id, businessId: business.id } });
  return { deleted: true };
}

/** Public booking from the business page - creates a scheduled appointment. */
export async function bookAppointment(slug: string, input: AppointmentInput) {
  const db = await getDb();
  const business = await db.businessProfile.findFirst({ where: { slug, published: true } });
  if (!business) throw new NotFoundError('That business page does not exist.');

  const existing = await db.customer.findFirst({
    where: { businessId: business.id, OR: [{ email: input.clientEmail || '__none__' }, { name: input.clientName }] },
  });

  const startsAt = new Date(input.startsAt);
  const durationMinutes = input.durationMinutes ?? 60;

  return db.appointment.create({
    data: {
      businessId: business.id,
      clientName: input.clientName,
      clientEmail: input.clientEmail || null,
      customerId: existing?.id ?? null,
      serviceId: input.serviceId || null,
      startsAt,
      endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
      status: 'scheduled',
      notes: input.notes || null,
    },
  });
}

/* ---------------------------------------------------------- canned messages */

export async function listCannedMessages(userId: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.cannedMessage.findMany({ where: { businessId: business.id }, orderBy: { title: 'asc' } });
}

export async function createCannedMessage(userId: string, input: CannedMessageInput) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.cannedMessage.create({ data: { businessId: business.id, title: input.title, body: input.body } });
}

export async function deleteCannedMessage(userId: string, id: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  await db.cannedMessage.deleteMany({ where: { id, businessId: business.id } });
  return { deleted: true };
}

/* ----------------------------------------------------------------- invoices */

export async function listInvoices(userId: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.invoice.findMany({
    where: { businessId: business.id },
    include: { items: { orderBy: { position: 'asc' } }, customer: true },
    orderBy: { issueDate: 'desc' },
    take: 100,
  });
}

export async function getInvoice(userId: string, id: string) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  const invoice = await db.invoice.findFirst({
    where: { id, businessId: business.id },
    include: { items: { orderBy: { position: 'asc' } }, customer: true, business: true },
  });
  if (!invoice) throw new NotFoundError('That invoice does not exist.');
  return invoice;
}

export async function createInvoice(userId: string, input: InvoiceInput, items: InvoiceItemInput[]) {
  const business = await requireBusiness(userId);
  if (items.length === 0) throw new ForbiddenError('Add at least one line item.');
  const db = await getDb();

  const taxRateBp = input.taxRateBp ?? business.taxRateBp;
  const discountCents = input.discountCents ?? 0;
  const totals = invoiceTotals(items, { taxRateBp, discountCents });

  const number = `${business.invoicePrefix || 'INV'}-${String(business.invoiceCounter).padStart(4, '0')}`;
  const clash = await db.invoice.findFirst({ where: { businessId: business.id, number } });
  if (clash) throw new ConflictError(`Invoice ${number} already exists. Try again.`);

  const invoice = await db.invoice.create({
    data: {
      businessId: business.id,
      customerId: input.customerId || null,
      number,
      issueDate: new Date(input.issueDate),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      status: input.status ?? 'draft',
      currency: input.currency || business.currency,
      taxRateBp,
      discountCents,
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      notes: input.notes || null,
      items: { create: totals.lines.map((line, index) => ({ description: line.description, quantity: line.quantity, unitPriceCents: line.unitPriceCents, totalCents: line.totalCents, position: index })) },
    },
    include: { items: true, customer: true, business: true },
  });

  await db.businessProfile.update({ where: { id: business.id }, data: { invoiceCounter: business.invoiceCounter + 1 } });
  await logActivity({ userId, type: 'business', description: `Created invoice ${number}`, targetType: 'invoice', targetId: invoice.id });

  return invoice;
}

export async function setInvoiceStatus(userId: string, id: string, status: string) {
  const invoice = await getInvoice(userId, id);
  const db = await getDb();
  return db.invoice.update({ where: { id: invoice.id }, data: { status } });
}

export async function deleteInvoice(userId: string, id: string) {
  const invoice = await getInvoice(userId, id);
  const db = await getDb();
  await db.invoice.delete({ where: { id: invoice.id } });
  await logActivity({ userId, type: 'business', description: `Deleted invoice ${invoice.number}`, targetType: 'invoice', targetId: id });
  return { deleted: true };
}

/* -------------------------------------------------------------------- sales */

export async function recordSale(userId: string, input: SaleInput) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  return db.saleRecord.create({
    data: {
      businessId: business.id,
      amountCents: input.amountCents,
      currency: business.currency,
      method: input.method ?? 'cash',
      invoiceId: input.invoiceId || null,
      notes: input.notes || null,
      soldAt: new Date(),
    },
  });
}

export async function revenueReport(userId: string, days = 30) {
  const business = await requireBusiness(userId);
  const db = await getDb();
  const since = new Date(Date.now() - days * 86_400_000);

  const [sales, invoices, lowStock] = await Promise.all([
    db.saleRecord.findMany({ where: { businessId: business.id, soldAt: { gte: since } }, orderBy: { soldAt: 'asc' } }),
    db.invoice.findMany({
      where: { businessId: business.id, issueDate: { gte: since } },
      select: { number: true, totalCents: true, status: true },
    }),
    db.inventoryItem.findMany({ where: { businessId: business.id } }),
  ]);

  const totalCents = sales.reduce((sum, sale) => sum + sale.amountCents, 0);
  const byMethod = new Map<string, number>();
  const byDay = new Map<string, number>();

  for (const sale of sales) {
    const method = sale.method ?? 'other';
    byMethod.set(method, (byMethod.get(method) ?? 0) + sale.amountCents);
    const day = (sale.soldAt ?? sale.createdAt).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + sale.amountCents);
  }

  const outstandingCents = invoices
    .filter((invoice) => invoice.status === 'sent' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + invoice.totalCents, 0);

  return {
    days,
    outstandingCents,
    currency: business.currency,
    totalCents,
    count: sales.length,
    averageCents: sales.length ? Math.round(totalCents / sales.length) : 0,
    byMethod: [...byMethod.entries()].map(([method, cents]) => ({ method, cents })),
    byDay: [...byDay.entries()].map(([day, cents]) => ({ day, cents })).sort((a, b) => a.day.localeCompare(b.day)),
    lowStock: lowStock.filter((item) => item.quantity <= item.reorderLevel).map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, reorderLevel: item.reorderLevel })),
    stockValueCents: lowStock.reduce((sum, item) => sum + item.quantity * item.unitCostCents, 0),
  };
}
