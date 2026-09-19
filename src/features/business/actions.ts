'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { requireUser } from '@/server/core/guards';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  appointmentSchema,
  businessProfileSchema,
  cannedMessageSchema,
  customerSchema,
  inventoryItemSchema,
  invoiceItemSchema,
  invoiceSchema,
  saleSchema,
  serviceSchema,
} from './schemas';
import {
  adjustInventory,
  bookAppointment,
  createAppointment,
  createCannedMessage,
  createCustomer,
  createInventoryItem,
  createInvoice,
  createService,
  deleteAppointment,
  deleteCannedMessage,
  deleteCustomer,
  deleteInventoryItem,
  deleteInvoice,
  deleteService,
  recordSale,
  saveBusinessProfile,
  setAppointmentStatus,
  setInvoiceStatus,
} from './service';

function read(formData: FormData, keys: string[]) {
  const input: Record<string, unknown> = {};
  for (const key of keys) input[key] = formData.get(key) ?? '';
  return input;
}

export async function saveBusinessProfileAction(formData: FormData): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: businessProfileSchema,
    input: read(formData, [
      'name',
      'description',
      'address',
      'city',
      'country',
      'phone',
      'email',
      'website',
      'taxId',
      'taxRateBp',
      'invoicePrefix',
      'currency',
      'qrMenuEnabled',
      'published',
    ]),
    successMessage: 'Business profile saved.',
    handler: (data) => saveBusinessProfile(user.id, data),
  });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function createServiceAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: serviceSchema,
    input: read(formData, ['name', 'description', 'priceCents', 'durationMinutes']),
    successMessage: 'Service added.',
    handler: (data) => createService(user.id, data),
  });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Service removed.', handler: () => deleteService(user.id, id) });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function createCustomerAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);
  const result = await runAction({
    schema: customerSchema,
    input: read(formData, ['name', 'email', 'phone', 'address', 'notes']),
    successMessage: 'Customer added.',
    handler: (data) => createCustomer(user.id, data),
  });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function deleteCustomerAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Customer removed.', handler: () => deleteCustomer(user.id, id) });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function createInventoryItemAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: inventoryItemSchema,
    input: read(formData, ['name', 'sku', 'category', 'quantity', 'unitCostCents', 'priceCents', 'reorderLevel']),
    successMessage: 'Item added.',
    handler: (data) => createInventoryItem(user.id, data),
  });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function adjustInventoryAction(id: string, delta: number): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ handler: () => adjustInventory(user.id, id, delta) });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function deleteInventoryItemAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Item removed.', handler: () => deleteInventoryItem(user.id, id) });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function createAppointmentAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: appointmentSchema,
    input: read(formData, ['clientName', 'clientEmail', 'customerId', 'serviceId', 'startsAt', 'durationMinutes', 'notes', 'status']),
    successMessage: 'Appointment added.',
    handler: (data) => createAppointment(user.id, data),
  });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function bookAppointmentAction(slug: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  await enforceRateLimit('create', formData.get('clientEmail')?.toString() ?? 'anonymous');
  const result = await runAction({
    schema: appointmentSchema,
    input: read(formData, ['clientName', 'clientEmail', 'serviceId', 'startsAt', 'durationMinutes', 'notes']),
    successMessage: 'Booking request sent. The business will confirm.',
    handler: (data) => bookAppointment(slug, data),
  });
  if (result.ok) revalidatePath(`/business/${slug}`);
  return result;
}

export async function setAppointmentStatusAction(id: string, status: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Appointment updated.', handler: () => setAppointmentStatus(user.id, id, status) });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function deleteAppointmentAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Appointment removed.', handler: () => deleteAppointment(user.id, id) });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function createCannedMessageAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: cannedMessageSchema,
    input: read(formData, ['title', 'body']),
    successMessage: 'Canned message saved.',
    handler: (data) => createCannedMessage(user.id, data),
  });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function deleteCannedMessageAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Canned message removed.', handler: () => deleteCannedMessage(user.id, id) });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function createInvoiceAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  await enforceRateLimit('create', user.id);

  const descriptions = formData.getAll('itemDescription');
  const quantities = formData.getAll('itemQuantity');
  const prices = formData.getAll('itemUnitPriceCents');

  const items = descriptions
    .map((description, index) => ({
      description,
      quantity: quantities[index],
      unitPriceCents: prices[index],
    }))
    .filter((item) => typeof item.description === 'string' && item.description.trim() !== '');

  const parsedItems = items.map((item) => invoiceItemSchema.parse({
    description: item.description,
    quantity: item.quantity || 1,
    unitPriceCents: item.unitPriceCents || 0,
  }));

  const result = await runAction({
    schema: invoiceSchema,
    input: read(formData, ['customerId', 'issueDate', 'dueDate', 'currency', 'taxRateBp', 'discountCents', 'notes', 'status']),
    successMessage: 'Invoice created.',
    handler: (data) => createInvoice(user.id, data, parsedItems),
  });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function setInvoiceStatusAction(id: string, status: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Invoice updated.', handler: () => setInvoiceStatus(user.id, id, status) });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction({ successMessage: 'Invoice deleted.', handler: () => deleteInvoice(user.id, id) });
  if (result.ok) revalidatePath('/business');
  return result;
}

export async function recordSaleAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await runAction({
    schema: saleSchema,
    input: read(formData, ['amountCents', 'method', 'invoiceId', 'notes']),
    successMessage: 'Sale recorded.',
    handler: (data) => recordSale(user.id, data),
  });
  if (result.ok) revalidatePath('/business');
  return result;
}
