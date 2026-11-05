/* ─────────────────────────────────────────────────────────────
   SaaS platform data: packages, tenants, invoices, payments
   RestoERP Cloud — Tanzania restaurant ERP SaaS
   ───────────────────────────────────────────────────────────── */
export const DAY = 86400000;

export const MODULE_CATALOG = [
  { id: 'pos',        label: 'Point of Sale & Cashier',   icon: '💳' },
  { id: 'waiter',     label: 'Waiter App & Commission',   icon: '🧑‍🍳' },
  { id: 'kitchen',    label: 'Kitchen Display (KDS)',     icon: '🍳' },
  { id: 'portal',     label: 'Customer Portal & QR',      icon: '📱' },
  { id: 'inventory',  label: 'Inventory & Purchasing',    icon: '📦' },
  { id: 'production', label: 'Production & Recipes',      icon: '🏭' },
  { id: 'accounting', label: 'Accounting & VAT',          icon: '💲' },
  { id: 'hr',         label: 'Human Resources & Payroll', icon: '👤' },
  { id: 'manager',    label: 'Manager Analytics',         icon: '📊' },
  { id: 'hq',         label: 'Multi-site HQ',             icon: '🌍' },
];

export const PLANS0 = [
  {
    id: 'starter', name: 'Starter', tag: 'For a single café or small restaurant',
    priceM: 49000, priceY: 490000, outlets: 1, users: 5, tables: 15, trialDays: 14,
    popular: false, active: true,
    modules: ['pos', 'waiter', 'kitchen', 'portal'],
    features: ['1 outlet', 'Up to 5 staff users', 'Up to 15 tables', 'Customer QR ordering portal', 'Email support'],
  },
  {
    id: 'growth', name: 'Growth', tag: 'For busy restaurants that track stock & money',
    priceM: 99000, priceY: 990000, outlets: 2, users: 15, tables: 40, trialDays: 14,
    popular: true, active: true,
    modules: ['pos', 'waiter', 'kitchen', 'portal', 'inventory', 'accounting', 'manager'],
    features: ['Up to 2 outlets', 'Up to 15 staff users', 'Up to 40 tables', 'Inventory, purchasing & accounting', 'Manager analytics', 'WhatsApp & phone support'],
  },
  {
    id: 'pro', name: 'Pro', tag: 'For groups with a central kitchen and HR',
    priceM: 199000, priceY: 1990000, outlets: 5, users: 50, tables: 120, trialDays: 14,
    popular: false, active: true,
    modules: ['pos', 'waiter', 'kitchen', 'portal', 'inventory', 'production', 'accounting', 'hr', 'manager', 'hq'],
    features: ['Up to 5 outlets', 'Up to 50 staff users', 'Up to 120 tables', 'All modules including Production, HR & HQ', 'Priority support'],
  },
  {
    id: 'enterprise', name: 'Enterprise', tag: 'Chains, hotels and franchises',
    priceM: 449000, priceY: 4490000, outlets: -1, users: -1, tables: -1, trialDays: 30,
    popular: false, active: true,
    modules: ['pos', 'waiter', 'kitchen', 'portal', 'inventory', 'production', 'accounting', 'hr', 'manager', 'hq'],
    features: ['Unlimited outlets, users & tables', 'All modules', 'Dedicated account manager', 'Custom integrations & onboarding'],
  },
];

export const PAY_METHODS = [
  { id: 'mpesa',  label: 'M-Pesa (Vodacom)',           icon: '📲' },
  { id: 'tigo',   label: 'Mixx by Yas (Tigo Pesa)',    icon: '📲' },
  { id: 'airtel', label: 'Airtel Money',                icon: '📲' },
  { id: 'bank',   label: 'Bank transfer',               icon: '🏦' },
  { id: 'card',   label: 'Card (Visa / Mastercard)',    icon: '💳' },
  { id: 'cash',   label: 'Cash / Cheque (manual)',      icon: '💵' },
];
export const methodLabel = id => (PAY_METHODS.find(m => m.id === id) || { label: id }).label;

export const BIZ_TYPES = [
  'Restaurant', 'Café / Coffee shop', 'Bar & Lounge',
  'Fast food / Takeaway', 'Hotel restaurant',
  'Catering / Central kitchen', 'Food truck', 'Bakery',
];
export const REGIONS = [
  'Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Zanzibar',
  'Moshi (Kilimanjaro)', 'Mbeya', 'Tanga', 'Morogoro', 'Iringa', 'Other',
];

/* ── helpers ── */
export const planOf      = (plans, id) => plans.find(p => p.id === id);
export const periodPrice = (plan, cycle) => (plan ? (cycle === 'yearly' ? plan.priceY : plan.priceM) : 0);

export const addPeriod = (from, cycle) => {
  const d = new Date(from);
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.getTime();
};

export function calcInvoice(plan, cycle, vatPct = 18, promoPct = 0, override) {
  const base = (override !== undefined && override !== '') ? Number(override) : periodPrice(plan, cycle);
  const disc = Math.round(base * (promoPct / 100));
  const sub  = base - disc;
  const vat  = Math.round(sub * (vatPct / 100));
  return { base, disc, sub, vat, total: sub + vat };
}

export const slugify  = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28);
export const limitTxt = n => (n === -1 ? 'Unlimited' : n);
export const uid      = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const genPw    = () => 'Rs' + Math.random().toString(36).slice(2, 8) + Math.floor(10 + Math.random() * 89);

/** Effective status: trial whose end date passed → 'expired' */
export function effStatus(t, now = Date.now()) {
  if (t.status === 'trial' && t.trialEnds && t.trialEnds < now) return 'expired';
  return t.status;
}

/* ── seed ── */
export function SAAS_SEED() {
  const now   = Date.now();
  const plans = PLANS0.map(p => ({ ...p }));

  const settings = {
    platformName:     'RestoERP Cloud',
    domain:           'restoerp.app',
    supportPhone:     '+255 755 888 775',
    supportEmail:     'support@restoerp.app',
    vatPct:           18,
    graceDays:        7,
    autoSuspend:      true,
    registrationOpen: true,
    maintenance:      false,
    invoiceDueDays:   7,
    promos: [
      { code: 'WELCOME10', pct: 10, active: true },
      { code: 'YEAR20',    pct: 20, active: true },
    ],
    payInfo: {
      mpesa:  'Lipa Namba 5551234 · RestoERP Cloud',
      tigo:   'Lipa Namba 5559876 · RestoERP Cloud',
      airtel: 'Lipa Namba 5554321 · RestoERP Cloud',
      bank:   'CRDB Bank · A/C 0150 0000 0000 · RestoERP Cloud',
      card:   'Secure card checkout (gateway link sent after confirmation)',
      cash:   'Pay at our office and ask for a receipt',
    },
  };

  const T = (id, name, slug, owner, phone, city, plan, cycle, status, extra = {}) => ({
    id, name, slug, ownerName: owner, phone, email: slug + '@mail.co.tz',
    city, address: '', tin: '', bizType: 'Restaurant',
    outlets: 1, tables: 12, users: 4,
    orderTypes: ['dine-in', 'takeaway'],
    modules: planOf(plans, plan).modules,
    plan, cycle, status,
    createdAt: now - 120 * DAY, trialEnds: null,
    nextBilling: now + 14 * DAY,
    notes: '', source: 'admin', suspendReason: '',
    ...extra,
  });

  const tenants = [
    T('t1', 'Safari Grill & Lounge',  'safari-grill',   'David Kimani',    '0718000777', 'Dar es Salaam',       'pro',        'yearly',  'active',    { outlets: 3,  tables: 62, users: 21, createdAt: now - 300 * DAY, nextBilling: now + 65 * DAY, bizType: 'Bar & Lounge' }),
    T('t2', 'Mama Africa Kitchen',    'mama-africa',    'Zainabu Mrisho',  '0754111222', 'Arusha',              'growth',     'monthly', 'active',    { outlets: 2,  tables: 28, users: 12, createdAt: now - 190 * DAY, nextBilling: now + 6 * DAY }),
    T('t3', 'Kilimanjaro Bites',      'kili-bites',     'Elias Mushi',     '0765333444', 'Moshi (Kilimanjaro)', 'starter',    'monthly', 'trial',     { trialEnds: now + 3 * DAY, createdAt: now - 11 * DAY, nextBilling: null, source: 'wizard', bizType: 'Café / Coffee shop', users: 3, tables: 9 }),
    T('t4', 'Zanzibar Spice House',   'zanzibar-spice', 'Salma Hassan',    '0777555666', 'Zanzibar',            'pro',        'monthly', 'past_due',  { outlets: 2,  tables: 40, users: 18, createdAt: now - 240 * DAY, nextBilling: now - 9 * DAY }),
    T('t5', 'Lake View Grill',        'lake-view',      'Peter Ngowi',     '0689777888', 'Mwanza',              'growth',     'monthly', 'suspended', { createdAt: now - 160 * DAY, nextBilling: now - 40 * DAY, suspendReason: 'Non-payment (30+ days overdue)', outlets: 1, tables: 25, users: 9 }),
    T('t6', 'Dodoma Chomoka',         'dodoma-chomoka', 'Rose Mwakyusa',   '0712999000', 'Dodoma',              'starter',    'monthly', 'pending',   { createdAt: now - 1 * DAY, nextBilling: null, source: 'wizard', bizType: 'Fast food / Takeaway', users: 2, tables: 8 }),
  ];

  const invoices = [];
  const payments = [];
  let seq = 1;

  const inv = (t, ageDays, status, kind = 'renewal') => {
    const plan   = planOf(plans, t.plan);
    const c      = calcInvoice(plan, t.cycle, settings.vatPct);
    const issued = now - ageDays * DAY;
    const i = {
      id: 'i' + seq,
      no: 'INV-2026-' + String(seq).padStart(4, '0'),
      tenantId: t.id, planId: t.plan, cycle: t.cycle, kind, ...c,
      status, issuedAt: issued,
      dueAt:   issued + settings.invoiceDueDays * DAY,
      paidAt:  status === 'paid' ? issued + 2 * DAY : null,
      reminders: 0, promo: '',
    };
    invoices.push(i);
    if (status === 'paid') {
      payments.push({
        id: 'p' + seq, invoiceId: i.id, tenantId: t.id, amount: c.total,
        method: ['mpesa', 'bank', 'tigo', 'airtel'][seq % 4],
        ref: 'TX' + (900000 + seq * 137),
        status: 'confirmed', at: i.paidAt, by: 'System',
      });
    }
    seq++;
  };

  [150, 120, 90, 60, 30].forEach(a => { inv(tenants[1], a, 'paid'); inv(tenants[3], a, 'paid'); });
  [140, 80].forEach(a => inv(tenants[0], a, 'paid'));
  inv(tenants[0], 5,  'paid', 'renewal');
  [100, 70, 40].forEach(a => inv(tenants[4], a, 'paid'));
  inv(tenants[1], 2,  'paid');
  inv(tenants[3], 12, 'unpaid');
  inv(tenants[4], 38, 'unpaid');
  inv(tenants[1], 1,  'unpaid');
  inv(tenants[5], 1,  'unpaid', 'signup');

  payments.push({
    id: 'p_pending1',
    invoiceId: invoices[invoices.length - 1].id,
    tenantId: 't6', amount: invoices[invoices.length - 1].total,
    method: 'mpesa', ref: 'QK7H2P9LM1',
    status: 'pending', at: now - 3600000, by: 'Rose Mwakyusa',
  });

  const tickets = [
    { id: 'k1', tenantId: 't2', subject: 'Cannot print receipts on 80mm printer',     status: 'open',     priority: 'high',   createdAt: now - 5 * 3600000, msgs: [{ from: 'tenant', name: 'Zainabu Mrisho', at: now - 5 * 3600000, text: 'The receipt prints cut off on the right side. Please help.' }] },
    { id: 'k2', tenantId: 't4', subject: 'Need invoice with TIN for last payment',     status: 'pending',  priority: 'normal', createdAt: now - 2 * DAY,     msgs: [{ from: 'tenant', name: 'Salma Hassan',    at: now - 2 * DAY,     text: 'Please send a VAT invoice with our TIN 123-456-789.' }, { from: 'admin', name: 'Support', at: now - DAY, text: 'We have updated it, please confirm your TIN.' }] },
    { id: 'k3', tenantId: 't1', subject: 'Add 2 more outlets to the plan',             status: 'resolved', priority: 'low',    createdAt: now - 9 * DAY,     msgs: [{ from: 'tenant', name: 'David Kimani',    at: now - 9 * DAY,     text: 'We are opening 2 new branches next month.' }, { from: 'admin', name: 'Support', at: now - 8 * DAY, text: 'Done, your Pro plan allows up to 5 outlets.' }] },
  ];

  const announcements = [
    { id: 'a1', title: 'Scheduled maintenance',         body: 'The platform will be updated on Sunday 02:00–03:00 EAT. Ordering may be briefly unavailable.', type: 'warning', audience: 'all', active: true, at: now - 2 * DAY },
    { id: 'a2', title: 'New: Customer loyalty points',  body: 'Growth and Pro plans can now reward repeat customers from the customer portal.',                  type: 'info',    audience: 'all', active: true, at: now - 6 * DAY },
  ];

  const admins = [
    { id: 'adm1', name: 'Platform Owner',  ph: '0700000001', pw: 'demo', email: 'owner@restoerp.app',   role: 'superadmin', active: true, title: 'Super Admin · Platform Owner' },
    { id: 'adm2', name: 'Billing Officer', ph: '0700000002', pw: 'demo', email: 'billing@restoerp.app', role: 'billing',    active: true, title: 'Billing & Collections' },
    { id: 'adm3', name: 'Support Agent',   ph: '0700000003', pw: 'demo', email: 'support@restoerp.app', role: 'support',    active: true, title: 'Customer Support' },
  ];

  const audit = [{ id: 'l0', at: now - 3 * DAY, by: 'System', action: 'Platform seeded with demo tenants', target: '' }];
  return { v: 1, plans, settings, tenants, invoices, payments, tickets, announcements, admins, audit, invSeq: seq };
}
