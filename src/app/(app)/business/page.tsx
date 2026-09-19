import type { Metadata } from 'next';
import { Store } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import {
  getMyBusiness,
  listAppointments,
  listCannedMessages,
  listCustomers,
  listInventory,
  listInvoices,
  listServices,
  revenueReport,
} from '@/features/business/service';
import {
  AppointmentForm,
  AppointmentRow,
  BusinessLink,
  BusinessProfileForm,
  CannedMessageForm,
  CannedMessageList,
  CustomerForm,
  CustomerRow,
  InventoryForm,
  InventoryRow,
  InvoiceForm,
  InvoiceRow,
  QrPanel,
  RevenueChart,
  SaleForm,
  ServiceForm,
  ServiceRow,
} from '@/features/business/components';
import { Card, CardContent, CardHeader, SectionHeading, Stat } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { Tabs } from '@/components/ui/list';
import { formatMoney } from '@/lib/utils';

export const metadata: Metadata = { title: 'My business' };

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'services', label: 'Services' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'customers', label: 'Customers' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'sales', label: 'Sales and reports' },
  { key: 'messages', label: 'Canned messages' },
  { key: 'profile', label: 'Profile and QR' },
];

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const tab = TABS.some((entry) => entry.key === params.tab) ? (params.tab as string) : 'overview';

  const business = await getMyBusiness(user.id);

  if (!business) {
    return (
      <div className="space-y-5">
        <SectionHeading title="Small business tools" description="Invoices, inventory, customers, appointments and a QR code for your counter." icon={<Store className="h-6 w-6" aria-hidden="true" />} />
        <Card>
          <CardHeader title="Create your business profile" description="One profile per account. You can publish a public page with your services and a booking form." />
          <CardContent>
            <BusinessProfileForm business={null} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const [services, inventory, customers, appointments, invoices, canned, report] = await Promise.all([
    listServices(business.id),
    listInventory(user.id),
    listCustomers(user.id),
    listAppointments(user.id),
    listInvoices(user.id),
    listCannedMessages(user.id),
    revenueReport(user.id, 30),
  ]);

  const upcoming = appointments.filter((appointment) => appointment.status === 'scheduled' || appointment.status === 'confirmed');

  return (
    <div className="space-y-5">
      <SectionHeading
        title={business.name}
        description={business.description || 'Invoices, inventory, customers, appointments and reports.'}
        icon={<Store className="h-6 w-6" aria-hidden="true" />}
        action={<BusinessLink slug={business.slug} name={business.name} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Revenue (${report.days} days)`} value={formatMoney(report.totalCents, report.currency)} hint={`${report.count} sale${report.count === 1 ? '' : 's'}`} tone="success" />
        <Stat label="Unpaid invoices" value={formatMoney(report.outstandingCents, report.currency)} tone={report.outstandingCents > 0 ? 'warning' : 'default'} />
        <Stat label="Upcoming appointments" value={String(upcoming.length)} />
        <Stat label="Stock value" value={formatMoney(report.stockValueCents, business.currency)} hint={`${report.lowStock.length} item(s) to reorder`} tone={report.lowStock.length > 0 ? 'warning' : 'default'} />
      </div>

      <Tabs tabs={TABS} current={tab} basePath="/business" searchParams={{}} />

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Daily revenue" description="Recorded sales only - nothing is estimated." />
            <CardContent>
              <RevenueChart byDay={report.byDay} currency={report.currency} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Reorder soon" description="Items at or below their reorder level." />
            <CardContent>
              {report.lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing to reorder.</p>
              ) : (
                <ul className="space-y-1">
                  {report.lowStock.map((item) => (
                    <li key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{item.name}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} left (reorder at {item.reorderLevel})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Next appointments" />
            <CardContent>
              {upcoming.length === 0 ? (
                <EmptyState title="No upcoming appointments" description="Add one in the Appointments tab, or let clients book from your public page." />
              ) : (
                <ul className="space-y-2">
                  {upcoming.slice(0, 5).map((appointment) => (
                    <AppointmentRow key={appointment.id} appointment={appointment} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'services' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Add a service" description="Services appear on your public page and can be picked when booking." />
            <CardContent>
              <ServiceForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Your services (${services.length})`} />
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services yet.</p>
              ) : (
                <ul className="space-y-2">
                  {services.map((service) => (
                    <ServiceRow key={service.id} service={service} currency={business.currency} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'inventory' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Add an item" description="Cost price is used for stock value; sell price is used on invoices." />
            <CardContent>
              <InventoryForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Stock (${inventory.length})`} description={`Total stock value: ${formatMoney(report.stockValueCents, business.currency)}`} />
            <CardContent>
              {inventory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet.</p>
              ) : (
                <ul className="space-y-2">
                  {inventory.map((item) => (
                    <InventoryRow key={item.id} item={item} currency={business.currency} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'customers' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Add a customer" description="Customer details stay in your own business records and are never public." />
            <CardContent>
              <CustomerForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Customers (${customers.length})`} />
            <CardContent>
              {customers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No customers yet.</p>
              ) : (
                <ul className="space-y-2">
                  {customers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'appointments' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Add an appointment" />
            <CardContent>
              <AppointmentForm services={services} customers={customers} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Appointments (${appointments.length})`} />
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {appointments.map((appointment) => (
                    <AppointmentRow key={appointment.id} appointment={appointment} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'invoices' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Create an invoice" description="Numbers are generated from your prefix and counter. Download the PDF and send it yourself." />
            <CardContent>
              <InvoiceForm customers={customers} business={{ currency: business.currency, taxRateBp: business.taxRateBp }} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Invoices (${invoices.length})`} />
            <CardContent>
              {invoices.length === 0 ? (
                <EmptyState title="No invoices yet" description="Create your first invoice above - the PDF download appears here." />
              ) : (
                <ul className="space-y-2">
                  {invoices.map((invoice) => (
                    <InvoiceRow key={invoice.id} invoice={invoice} currency={invoice.currency ?? business.currency} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'sales' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Record a sale" description="OpenHub never processes payments - record what you received so reports stay accurate." />
            <CardContent>
              <SaleForm invoices={invoices} currency={business.currency} />
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title={`Revenue report (${report.days} days)`} />
              <CardContent className="space-y-3">
                <RevenueChart byDay={report.byDay} currency={report.currency} />
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium text-foreground">{formatMoney(report.totalCents, report.currency)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Average sale</span>
                    <span className="text-foreground">{formatMoney(report.averageCents, report.currency)}</span>
                  </li>
                  {report.byMethod.map((entry) => (
                    <li key={entry.method} className="flex justify-between">
                      <span className="text-muted-foreground">{entry.method}</span>
                      <span className="text-foreground">{formatMoney(entry.cents, report.currency)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="What this report does not include" />
              <CardContent>
                <Alert tone="info" title="Your numbers, your records">
                  Revenue is calculated only from sales you record here. OpenHub has no payment gateway, no bank connection and no
                  access to your card machine, so anything paid outside this app must be added manually.
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'messages' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Add a canned message" description="Short replies you send often - hours, prices, directions." />
            <CardContent>
              <CannedMessageForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Canned messages (${canned.length})`} />
            <CardContent>
              <CannedMessageList messages={canned} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'profile' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Business profile" description="Publishing shows your services and booking form to everyone." />
            <CardContent>
              <BusinessProfileForm business={business} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="QR code" description="One code for your business page; customers scan it to see services and book." />
            <CardContent>
              <QrPanel slug={business.slug} label={business.name} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
