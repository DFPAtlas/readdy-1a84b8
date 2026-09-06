// ── Demo billing data ──

export const demoSubscription = {
  id: 'demo-sub-1',
  weddingId: 'demo-wedding',
  userId: 'demo-user',
  planKey: 'free' as const,
  planId: 'cd6bf190-a752-4025-8043-d941db05317a',
  status: 'active' as const,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  billingInterval: 'month' as const,
  currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
  trialEnd: null,
  cancelledAt: null,
  createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
};

export const demoInvoices = [
  {
    id: 'inv-demo-1',
    number: 'INV-DEMO-001',
    description: 'Vowora Free — Monthly',
    amountMinor: 0,
    currency: 'gbp',
    status: 'paid' as const,
    invoiceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    periodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    hostedUrl: null,
    pdfUrl: null,
  },
  {
    id: 'inv-demo-2',
    number: 'INV-DEMO-002',
    description: 'Vowora Free — Monthly',
    amountMinor: 0,
    currency: 'gbp',
    status: 'paid' as const,
    invoiceDate: new Date().toISOString(),
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
    hostedUrl: null,
    pdfUrl: null,
  },
];