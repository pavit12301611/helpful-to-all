'use client';

import * as React from 'react';
import Link from 'next/link';
import { Copy, Download, Minus, Plus, QrCode, Trash2 } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmActionButton } from '@/components/forms/confirm-action';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { Badge, StatusBadge, labelize } from '@/components/ui/card';
import { useToast } from '@/components/ui/feedback';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils';
import {
  adjustInventoryAction,
  bookAppointmentAction,
  createAppointmentAction,
  createCannedMessageAction,
  createCustomerAction,
  createInventoryItemAction,
  createInvoiceAction,
  createServiceAction,
  deleteAppointmentAction,
  deleteCannedMessageAction,
  deleteCustomerAction,
  deleteInventoryItemAction,
  deleteInvoiceAction,
  deleteServiceAction,
  recordSaleAction,
  saveBusinessProfileAction,
  setAppointmentStatusAction,
  setInvoiceStatusAction,
} from './actions';

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  taxRateBp: number;
  invoicePrefix: string;
  currency: string;
  qrMenuEnabled: boolean;
  published: boolean;
};

export function BusinessProfileForm({ business }: { business: Business | null }) {
  return (
    <ServerForm action={saveBusinessProfileAction} successMessage="Business profile saved." ariaLabel="Save business profile" className="space-y-4">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name" name="name" error={errors.name} required>
              {(props) => <Input {...props} name="name" required maxLength={100} defaultValue={business?.name} />}
            </Field>
            <Field label="Currency" name="currency" error={errors.currency} hint="3 letter code, e.g. INR, USD.">
              {(props) => <Input {...props} name="currency" maxLength={3} defaultValue={business?.currency ?? 'INR'} />}
            </Field>
          </div>
          <Field label="What do you offer?" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={3} maxLength={600} defaultValue={business?.description ?? ''} />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Address" name="address" error={errors.address}>
              {(props) => <Input {...props} name="address" maxLength={200} defaultValue={business?.address ?? ''} />}
            </Field>
            <Field label="City" name="city" error={errors.city}>
              {(props) => <Input {...props} name="city" maxLength={80} defaultValue={business?.city ?? ''} />}
            </Field>
            <Field label="Country" name="country" error={errors.country}>
              {(props) => <Input {...props} name="country" maxLength={80} defaultValue={business?.country ?? ''} />}
            </Field>
            <Field label="Phone" name="phone" error={errors.phone}>
              {(props) => <Input {...props} name="phone" maxLength={40} defaultValue={business?.phone ?? ''} />}
            </Field>
            <Field label="Public email" name="email" error={errors.email}>
              {(props) => <Input {...props} name="email" type="email" maxLength={160} defaultValue={business?.email ?? ''} />}
            </Field>
            <Field label="Website" name="website" error={errors.website}>
              {(props) => <Input {...props} name="website" type="url" maxLength={300} defaultValue={business?.website ?? ''} />}
            </Field>
            <Field label="Tax ID" name="taxId" error={errors.taxId} hint="Shown on invoices, e.g. GSTIN.">
              {(props) => <Input {...props} name="taxId" maxLength={60} defaultValue={business?.taxId ?? ''} />}
            </Field>
            <Field label="Default tax rate (%)" name="taxRateBp" error={errors.taxRateBp} hint="Stored in basis points: 18% = 1800.">
              {(props) => <Input {...props} name="taxRateBp" type="number" min={0} max={10000} step={50} defaultValue={business?.taxRateBp ?? 0} />}
            </Field>
            <Field label="Invoice prefix" name="invoicePrefix" error={errors.invoicePrefix}>
              {(props) => <Input {...props} name="invoicePrefix" maxLength={12} defaultValue={business?.invoicePrefix ?? 'INV'} />}
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Checkbox name="qrMenuEnabled" label="Show a QR menu on my public page" defaultChecked={business?.qrMenuEnabled ?? true} />
            <Checkbox name="published" label="Publish my business page" defaultChecked={business?.published ?? true} />
          </div>
          <SubmitButton pending={pending}>Save business profile</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function QrPanel({ slug, label }: { slug: string; label: string }) {
  const toast = useToast();
  const url = typeof window === 'undefined' ? `/business/${slug}` : `${window.location.origin}/business/${slug}`;
  const pngUrl = `/api/business/${slug}/qr`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Print this code and stick it on your counter or menu. It opens {label} - no app needed.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pngUrl} alt={`QR code linking to ${label}`} width={180} height={180} className="rounded-lg border border-border bg-white p-2" />
      <div className="flex flex-wrap gap-2">
        <a href={pngUrl} download={`${slug}-qr.png`} className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          <Download className="h-4 w-4" aria-hidden="true" />
          Download PNG
        </a>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.push({ tone: 'success', title: 'Link copied.' });
            } catch {
              toast.push({ tone: 'warning', title: 'Copy failed', description: url });
            }
          }}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy link
        </button>
      </div>
      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
        {url}
      </p>
    </div>
  );
}

export function ServiceForm() {
  return (
    <ServerForm action={createServiceAction} successMessage="Service added." resetOnSuccess ariaLabel="Add a service" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Service" name="name" error={errors.name} required>
              {(props) => <Input {...props} name="name" required maxLength={100} placeholder="Fan repair" />}
            </Field>
            <Field label="Price" name="priceCents" error={errors.priceCents} hint="In cents/paise: 40000 = 400.00.">
              {(props) => <Input {...props} name="priceCents" type="number" min={0} step={100} defaultValue="0" />}
            </Field>
            <Field label="Duration (minutes)" name="durationMinutes" error={errors.durationMinutes}>
              {(props) => <Input {...props} name="durationMinutes" type="number" min={0} max={1440} defaultValue="60" />}
            </Field>
          </div>
          <Field label="Description" name="description" error={errors.description}>
            {(props) => <Textarea {...props} name="description" rows={2} maxLength={400} />}
          </Field>
          <SubmitButton pending={pending}>Add service</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function ServiceRow({ service, currency }: { service: { id: string; name: string; description: string | null; priceCents: number | null; durationMinutes: number | null }; currency: string }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{service.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatMoney(service.priceCents ?? 0, currency)} · {service.durationMinutes ?? 0} min
          {service.description ? ` · ${service.description}` : ''}
        </p>
      </div>
      <ConfirmActionButton
        action={() => deleteServiceAction(service.id)}
        title="Remove this service?"
        description="Existing appointments keep their record."
        confirmLabel="Remove service"
        label={`Remove ${service.name}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

export function CustomerForm() {
  return (
    <ServerForm action={createCustomerAction} successMessage="Customer added." resetOnSuccess ariaLabel="Add a customer" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" name="name" error={errors.name} required>
              {(props) => <Input {...props} name="name" required maxLength={100} />}
            </Field>
            <Field label="Email" name="email" error={errors.email}>
              {(props) => <Input {...props} name="email" type="email" maxLength={160} />}
            </Field>
            <Field label="Phone" name="phone" error={errors.phone}>
              {(props) => <Input {...props} name="phone" maxLength={40} />}
            </Field>
          </div>
          <Field label="Address" name="address" error={errors.address} hint="Only stored in your own business records.">
            {(props) => <Input {...props} name="address" maxLength={200} />}
          </Field>
          <Field label="Notes" name="notes" error={errors.notes}>
            {(props) => <Textarea {...props} name="notes" rows={2} maxLength={600} />}
          </Field>
          <SubmitButton pending={pending}>Add customer</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function CustomerRow({ customer }: { customer: { id: string; name: string; email: string | null; phone: string | null; notes: string | null } }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
        <p className="text-xs text-muted-foreground">
          {[customer.email, customer.phone, customer.notes].filter(Boolean).join(' · ') || 'No details'}
        </p>
      </div>
      <ConfirmActionButton
        action={() => deleteCustomerAction(customer.id)}
        title="Remove this customer?"
        description="Invoices keep their record but lose the link to this customer."
        confirmLabel="Remove customer"
        label={`Remove ${customer.name}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

export function InventoryForm() {
  return (
    <ServerForm action={createInventoryItemAction} successMessage="Item added." resetOnSuccess ariaLabel="Add an inventory item" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Item" name="name" error={errors.name} required>
              {(props) => <Input {...props} name="name" required maxLength={120} />}
            </Field>
            <Field label="SKU" name="sku" error={errors.sku}>
              {(props) => <Input {...props} name="sku" maxLength={60} />}
            </Field>
            <Field label="Category" name="category" error={errors.category}>
              {(props) => <Input {...props} name="category" maxLength={60} />}
            </Field>
            <Field label="Quantity" name="quantity" error={errors.quantity}>
              {(props) => <Input {...props} name="quantity" type="number" min={0} defaultValue="0" />}
            </Field>
            <Field label="Cost each" name="unitCostCents" error={errors.unitCostCents}>
              {(props) => <Input {...props} name="unitCostCents" type="number" min={0} step={100} defaultValue="0" />}
            </Field>
            <Field label="Sell price each" name="priceCents" error={errors.priceCents}>
              {(props) => <Input {...props} name="priceCents" type="number" min={0} step={100} defaultValue="0" />}
            </Field>
            <Field label="Reorder at" name="reorderLevel" error={errors.reorderLevel}>
              {(props) => <Input {...props} name="reorderLevel" type="number" min={0} defaultValue="0" />}
            </Field>
          </div>
          <SubmitButton pending={pending}>Add item</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function InventoryRow({ item, currency }: { item: { id: string; name: string; sku: string | null; quantity: number; priceCents: number; unitCostCents: number; reorderLevel: number }; currency: string }) {
  const low = item.quantity <= item.reorderLevel;
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {item.sku ? `${item.sku} · ` : ''}
          {formatMoney(item.priceCents, currency)} each · stock value {formatMoney(item.quantity * item.unitCostCents, currency)}
        </p>
      </div>
      {low ? <Badge tone="danger">Reorder</Badge> : null}
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => adjustInventoryAction(item.id, -1)} aria-label={`Decrease ${item.name}`} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted">
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="w-10 text-center text-sm tabular-nums text-foreground">{item.quantity}</span>
        <button type="button" onClick={() => adjustInventoryAction(item.id, 1)} aria-label={`Increase ${item.name}`} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <ConfirmActionButton
        action={() => deleteInventoryItemAction(item.id)}
        title="Remove this item?"
        description="Sales already recorded are kept."
        confirmLabel="Remove item"
        label={`Remove ${item.name}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

export function AppointmentForm({
  services,
  customers,
}: {
  services: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}) {
  return (
    <ServerForm action={createAppointmentAction} successMessage="Appointment added." resetOnSuccess ariaLabel="Add an appointment" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Client name" name="clientName" error={errors.clientName} required>
              {(props) => <Input {...props} name="clientName" required maxLength={100} />}
            </Field>
            <Field label="Client email" name="clientEmail" error={errors.clientEmail}>
              {(props) => <Input {...props} name="clientEmail" type="email" maxLength={160} />}
            </Field>
            <Field label="Existing customer" name="customerId" error={errors.customerId}>
              {(props) => (
                <Select {...props} name="customerId" defaultValue="">
                  <option value="">New client</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Service" name="serviceId" error={errors.serviceId}>
              {(props) => (
                <Select {...props} name="serviceId" defaultValue="">
                  <option value="">No service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Starts" name="startsAt" error={errors.startsAt} required>
              {(props) => <Input {...props} name="startsAt" type="datetime-local" required />}
            </Field>
            <Field label="Duration (minutes)" name="durationMinutes" error={errors.durationMinutes}>
              {(props) => <Input {...props} name="durationMinutes" type="number" min={5} max={720} defaultValue="60" />}
            </Field>
          </div>
          <Field label="Notes" name="notes" error={errors.notes}>
            {(props) => <Textarea {...props} name="notes" rows={2} maxLength={400} />}
          </Field>
          <SubmitButton pending={pending}>Add appointment</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function AppointmentRow({
  appointment,
}: {
  appointment: {
    id: string;
    clientName: string;
    clientEmail: string | null;
    startsAt: Date;
    endsAt: Date | null;
    status: string;
    notes: string | null;
    service: { name: string } | null;
  };
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {appointment.clientName}
          {appointment.service ? <span className="text-muted-foreground"> · {appointment.service.name}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(appointment.startsAt)}
          {appointment.endsAt ? ` - ${appointment.endsAt.toTimeString().slice(0, 5)}` : ''}
          {appointment.clientEmail ? ` · ${appointment.clientEmail}` : ''}
          {appointment.notes ? ` · ${appointment.notes}` : ''}
        </p>
      </div>
      <StatusBadge status={appointment.status} />
      <label htmlFor={`appt-${appointment.id}`} className="sr-only">
        Status for {appointment.clientName}
      </label>
      <select
        id={`appt-${appointment.id}`}
        className="input-base h-8 w-32 text-xs"
        value={appointment.status}
        onChange={(event) => setAppointmentStatusAction(appointment.id, event.target.value)}
      >
        <option value="scheduled">Scheduled</option>
        <option value="confirmed">Confirmed</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="no_show">No show</option>
      </select>
      <ConfirmActionButton
        action={() => deleteAppointmentAction(appointment.id)}
        title="Remove this appointment?"
        description="It will disappear from your calendar."
        confirmLabel="Remove appointment"
        label={`Remove appointment for ${appointment.clientName}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

export function CannedMessageForm() {
  return (
    <ServerForm action={createCannedMessageAction} successMessage="Canned message saved." resetOnSuccess ariaLabel="Add a canned message" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <Field label="Title" name="title" error={errors.title} required>
            {(props) => <Input {...props} name="title" required maxLength={80} placeholder="Opening hours" />}
          </Field>
          <Field label="Message" name="body" error={errors.body} required>
            {(props) => <Textarea {...props} name="body" rows={3} required maxLength={600} />}
          </Field>
          <SubmitButton pending={pending}>Save message</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function CannedMessageList({ messages }: { messages: { id: string; title: string; body: string }[] }) {
  const toast = useToast();
  if (messages.length === 0) return <p className="text-sm text-muted-foreground">No canned messages yet.</p>;
  return (
    <ul className="space-y-2">
      {messages.map((message) => (
        <li key={message.id} className="rounded-lg border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{message.title}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{message.body}</p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label={`Copy ${message.title}`}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(message.body);
                    toast.push({ tone: 'success', title: 'Message copied.' });
                  } catch {
                    toast.push({ tone: 'warning', title: 'Copy failed', description: 'Select the text and copy it manually.' });
                  }
                }}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
              <ConfirmActionButton
                action={() => deleteCannedMessageAction(message.id)}
                title="Remove this canned message?"
                description="You can add it again any time."
                confirmLabel="Remove message"
                label={`Remove ${message.title}`}
                variant="ghost"
                size="icon"
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                className="text-muted-foreground"
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

type InvoiceLine = { description: string; quantity: string; unitPriceCents: string };

export function InvoiceForm({
  customers,
  business,
}: {
  customers: { id: string; name: string }[];
  business: { currency: string; taxRateBp: number };
}) {
  const [lines, setLines] = React.useState<InvoiceLine[]>([{ description: '', quantity: '1', unitPriceCents: '' }]);

  const total = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPriceCents) || 0), 0);

  return (
    <ServerForm action={createInvoiceAction} successMessage="Invoice created." ariaLabel="Create an invoice" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Customer" name="customerId" error={errors.customerId}>
              {(props) => (
                <Select {...props} name="customerId" defaultValue="">
                  <option value="">Walk-in client</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Issue date" name="issueDate" error={errors.issueDate} required>
              {(props) => <Input {...props} name="issueDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />}
            </Field>
            <Field label="Due date" name="dueDate" error={errors.dueDate}>
              {(props) => <Input {...props} name="dueDate" type="date" />}
            </Field>
            <Field label="Status" name="status" error={errors.status}>
              {(props) => (
                <Select {...props} name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                </Select>
              )}
            </Field>
            <Field label="Tax rate (basis points)" name="taxRateBp" error={errors.taxRateBp} hint="1800 = 18%.">
              {(props) => <Input {...props} name="taxRateBp" type="number" min={0} max={10000} step={50} defaultValue={business.taxRateBp} />}
            </Field>
            <Field label="Discount" name="discountCents" error={errors.discountCents}>
              {(props) => <Input {...props} name="discountCents" type="number" min={0} step={100} defaultValue="0" />}
            </Field>
            <Field label="Currency" name="currency" error={errors.currency}>
              {(props) => <Input {...props} name="currency" maxLength={3} defaultValue={business.currency} />}
            </Field>
          </div>

          <div className="space-y-2">
            <p className="label">Line items</p>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem_2.5rem]">
                <label htmlFor={`line-desc-${index}`} className="sr-only">
                  Description
                </label>
                <input
                  id={`line-desc-${index}`}
                  name="itemDescription"
                  className="input-base"
                  placeholder="Description"
                  value={line.description}
                  onChange={(event) => {
                    const next = [...lines];
                    next[index] = { ...line, description: event.target.value };
                    setLines(next);
                  }}
                />
                <label htmlFor={`line-qty-${index}`} className="sr-only">
                  Quantity
                </label>
                <input
                  id={`line-qty-${index}`}
                  name="itemQuantity"
                  className="input-base"
                  type="number"
                  min={0.01}
                  step={1}
                  value={line.quantity}
                  onChange={(event) => {
                    const next = [...lines];
                    next[index] = { ...line, quantity: event.target.value };
                    setLines(next);
                  }}
                />
                <label htmlFor={`line-price-${index}`} className="sr-only">
                  Unit price in cents
                </label>
                <input
                  id={`line-price-${index}`}
                  name="itemUnitPriceCents"
                  className="input-base"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="Unit price"
                  value={line.unitPriceCents}
                  onChange={(event) => {
                    const next = [...lines];
                    next[index] = { ...line, unitPriceCents: event.target.value };
                    setLines(next);
                  }}
                />
                <button
                  type="button"
                  aria-label="Remove line"
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                  onClick={() => setLines((current) => (current.length <= 1 ? current : current.filter((_, lineIndex) => lineIndex !== index)))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => setLines((current) => [...current, { description: '', quantity: '1', unitPriceCents: '' }])}>
                + Add line
              </button>
              <span className="text-sm text-muted-foreground">Subtotal: {formatMoney(total, business.currency)}</span>
            </div>
          </div>

          <Field label="Notes on the invoice" name="notes" error={errors.notes}>
            {(props) => <Textarea {...props} name="notes" rows={2} maxLength={600} placeholder="Payment terms, bank details, thank you note." />}
          </Field>
          <SubmitButton pending={pending}>Create invoice</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function InvoiceRow({
  invoice,
  currency,
}: {
  invoice: { id: string; number: string; issueDate: Date; dueDate: Date | null; status: string; totalCents: number; customer: { name: string } | null };
  currency: string;
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {invoice.number}
          <span className="text-muted-foreground"> · {invoice.customer?.name ?? 'Walk-in client'}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(invoice.issueDate)}
          {invoice.dueDate ? ` · due ${formatDate(invoice.dueDate)}` : ''} · {formatMoney(invoice.totalCents, currency)}
        </p>
      </div>
      <StatusBadge status={invoice.status} />
      <a href={`/api/invoices/${invoice.id}/pdf`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-muted">
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        PDF
      </a>
      <label htmlFor={`invoice-${invoice.id}`} className="sr-only">
        Status for {invoice.number}
      </label>
      <select
        id={`invoice-${invoice.id}`}
        className="input-base h-8 w-28 text-xs"
        value={invoice.status}
        onChange={(event) => setInvoiceStatusAction(invoice.id, event.target.value)}
      >
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
        <option value="void">Void</option>
      </select>
      <ConfirmActionButton
        action={() => deleteInvoiceAction(invoice.id)}
        title={`Delete invoice ${invoice.number}?`}
        description="Recorded sales keep their own record."
        confirmLabel="Delete invoice"
        label={`Delete ${invoice.number}`}
        variant="ghost"
        size="icon"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        className="text-muted-foreground"
      />
    </li>
  );
}

export function SaleForm({ invoices, currency }: { invoices: { id: string; number: string }[]; currency: string }) {
  return (
    <ServerForm action={recordSaleAction} successMessage="Sale recorded." resetOnSuccess ariaLabel="Record a sale" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Amount" name="amountCents" error={errors.amountCents} required hint={`In cents/paise, e.g. 47200 = ${formatMoney(47200, currency)}`}>
              {(props) => <Input {...props} name="amountCents" type="number" min={0} step={100} required />}
            </Field>
            <Field label="Payment method" name="method" error={errors.method}>
              {(props) => (
                <Select {...props} name="method" defaultValue="cash">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank transfer</option>
                  <option value="other">Other</option>
                </Select>
              )}
            </Field>
            <Field label="Invoice" name="invoiceId" error={errors.invoiceId}>
              {(props) => (
                <Select {...props} name="invoiceId" defaultValue="">
                  <option value="">No invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.number}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Note" name="notes" error={errors.notes}>
              {(props) => <Input {...props} name="notes" maxLength={200} />}
            </Field>
          </div>
          <SubmitButton pending={pending}>Record sale</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function RevenueChart({ byDay, currency }: { byDay: { day: string; cents: number }[]; currency: string }) {
  if (byDay.length === 0) return <p className="text-sm text-muted-foreground">No sales recorded in this period yet.</p>;
  const max = Math.max(...byDay.map((day) => day.cents), 1);
  return (
    <div>
      <ul className="flex h-32 items-end gap-1" aria-label="Daily revenue chart">
        {byDay.map((day) => (
          <li key={day.day} className="flex flex-1 flex-col items-center gap-1" title={`${day.day}: ${formatMoney(day.cents, currency)}`}>
            <span className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(4, (day.cents / max) * 100)}%` }} />
            <span className="text-[10px] text-muted-foreground">{day.day.slice(5)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Hover a bar for the exact total. Amounts are in {currency}.</p>
    </div>
  );
}

export function PublicBookingForm({
  slug,
  services,
}: {
  slug: string;
  services: { id: string; name: string; durationMinutes: number | null }[];
}) {
  return (
    <ServerForm action={(formData) => bookAppointmentAction(slug, formData)} successMessage="Booking sent." resetOnSuccess ariaLabel="Book an appointment" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name" name="clientName" error={errors.clientName} required>
              {(props) => <Input {...props} name="clientName" required maxLength={100} />}
            </Field>
            <Field label="Your email" name="clientEmail" error={errors.clientEmail} hint="Used only to confirm this booking.">
              {(props) => <Input {...props} name="clientEmail" type="email" maxLength={160} />}
            </Field>
            <Field label="Service" name="serviceId" error={errors.serviceId}>
              {(props) => (
                <Select {...props} name="serviceId" defaultValue="">
                  <option value="">General visit</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Preferred time" name="startsAt" error={errors.startsAt} required>
              {(props) => <Input {...props} name="startsAt" type="datetime-local" required />}
            </Field>
          </div>
          <Field label="Anything they should know?" name="notes" error={errors.notes}>
            {(props) => <Textarea {...props} name="notes" rows={2} maxLength={400} />}
          </Field>
          <SubmitButton pending={pending}>Request booking</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function PublicServiceList({ services, currency }: { services: { id: string; name: string; description: string | null; priceCents: number | null; durationMinutes: number | null }[]; currency: string }) {
  if (services.length === 0) return <p className="text-sm text-muted-foreground">No services listed yet.</p>;
  return (
    <ul className="space-y-2">
      {services.map((service) => (
        <li key={service.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{service.name}</p>
            {service.description ? <p className="text-xs text-muted-foreground">{service.description}</p> : null}
          </div>
          <Badge tone="primary">{(service.priceCents ?? 0) > 0 ? formatMoney(service.priceCents ?? 0, currency) : 'Price on request'}</Badge>
          <span className="text-xs text-muted-foreground">{service.durationMinutes ?? 60} min</span>
        </li>
      ))}
    </ul>
  );
}

export function BusinessLink({ slug, name }: { slug: string; name: string }) {
  return (
    <Link href={`/business/${slug}`} className="link text-sm">
      View public page for {name}
    </Link>
  );
}

export function TaxLabel({ rateBp }: { rateBp: number }) {
  return <span className="text-xs text-muted-foreground">Tax {labelize(String(rateBp / 100))}%</span>;
}
