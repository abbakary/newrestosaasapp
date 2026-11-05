import React, { useState, useEffect, useRef, createContext } from 'react';
import { SAAS_SEED, DAY, planOf, calcInvoice, addPeriod, uid, genPw, slugify } from './data_saas';

export const SaaS = createContext();
const KEY = 'resto_saas_v1';

/* Apply a confirmed payment: marks invoice paid, activates tenant, rolls billing date */
function applyConfirm(s, payId, by) {
  const p = s.payments.find(x => x.id === payId);
  if (!p) return s;
  const inv = s.invoices.find(i => i.id === p.invoiceId);
  const now = Date.now();
  return {
    ...s,
    payments: s.payments.map(x =>
      x.id === payId ? { ...x, status: 'confirmed', by, confirmedAt: now } : x
    ),
    invoices: s.invoices.map(i =>
      i.id === p.invoiceId ? { ...i, status: 'paid', paidAt: now } : i
    ),
    tenants: s.tenants.map(t => {
      if (!inv || t.id !== inv.tenantId) return t;
      const plan = planOf(s.plans, inv.planId);
      return {
        ...t,
        plan: inv.planId,
        cycle: inv.cycle,
        status: 'active',
        trialEnds: null,
        suspendReason: '',
        modules: plan ? plan.modules : t.modules,
        nextBilling: addPeriod(Math.max(now, t.nextBilling || 0), inv.cycle),
      };
    }),
  };
}

export function SaaSStore({ children }) {
  const [S, setS] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && saved.tenants && saved.plans) return { ...SAAS_SEED(), ...saved };
    } catch { /* ignore */ }
    return SAAS_SEED();
  });

  const SR    = useRef(S); SR.current = S;
  const actor = useRef('System');

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ignore */ }
  }, [S]);

  const log = (s, action, target = '') => ({
    ...s,
    audit: [
      { id: uid('l'), at: Date.now(), by: actor.current, action, target },
      ...s.audit,
    ].slice(0, 300),
  });

  const upd = (fn, action, target) =>
    setS(s => { const n = fn(s); return action ? log(n, action, target) : n; });

  const tname = (s, id) => (s.tenants.find(t => t.id === id) || {}).name || id;

  /* Build invoice object */
  const buildInvoice = (s, { tenantId, planId, cycle, kind = 'renewal', promoPct = 0, promo = '', override, note = '' }) => {
    const plan = planOf(s.plans, planId);
    const c    = calcInvoice(plan, cycle, s.settings.vatPct, promoPct, override);
    const now  = Date.now();
    return {
      id: uid('i'),
      no: 'INV-' + new Date().getFullYear() + '-' + String(s.invSeq).padStart(4, '0'),
      tenantId, planId, cycle, kind, ...c,
      status: 'unpaid',
      issuedAt: now,
      dueAt: now + s.settings.invoiceDueDays * DAY,
      paidAt: null,
      reminders: 0,
      promo, note,
    };
  };

  const SA = {
    setActor: n => { actor.current = n || 'System'; },
    reset: () => setS(SAAS_SEED()),

    /* ── tenants ── */
    createTenant(d) {
      const s0   = SR.current;
      const plan = planOf(s0.plans, d.plan);
      const now  = Date.now();
      const t = {
        id: uid('t'),
        name: d.name,
        slug: d.slug || slugify(d.name),
        ownerName: d.ownerName,
        phone: d.phone,
        email: d.email || '',
        city: d.city || '',
        address: d.address || '',
        tin: d.tin || '',
        bizType: d.bizType || 'Restaurant',
        outlets: d.outlets || 1,
        tables: d.tables || 10,
        users: 1,
        orderTypes: d.orderTypes || ['dine-in'],
        modules: plan ? plan.modules : [],
        plan: d.plan,
        cycle: d.cycle || 'monthly',
        status: d.status || 'trial',
        createdAt: now,
        trialEnds: null,
        nextBilling: null,
        notes: d.notes || '',
        source: d.source || 'admin',
        suspendReason: '',
      };
      if (t.status === 'trial')  t.trialEnds   = now + (d.trialDays ?? plan?.trialDays ?? 14) * DAY;
      if (t.status === 'active') t.nextBilling = addPeriod(now, t.cycle);

      setS(s => {
        let n = { ...s, tenants: [t, ...s.tenants] };
        if (d.invoice) {
          const invoice = buildInvoice(n, {
            tenantId: t.id, planId: t.plan, cycle: t.cycle,
            kind: 'signup', promoPct: d.promoPct || 0, promo: d.promo || '',
          });
          n = { ...n, invSeq: n.invSeq + 1 };
          if (d.payNow) {
            const payment = {
              id: uid('p'),
              invoiceId: invoice.id, tenantId: t.id, amount: invoice.total,
              method: d.method || 'mpesa', ref: d.ref || '',
              status: d.markPaid ? 'confirmed' : 'pending',
              at: now, by: d.markPaid ? actor.current : t.ownerName,
            };
            n = { ...n, invoices: [invoice, ...n.invoices], payments: [payment, ...n.payments] };
            if (d.markPaid) n = applyConfirm(n, payment.id, actor.current);
          } else {
            n = { ...n, invoices: [invoice, ...n.invoices] };
          }
        }
        return log(n, d.source === 'wizard' ? 'New self-registration' : 'Tenant created', t.name);
      });
      return t;
    },

    updateTenant: (id, patch) =>
      upd(s => ({ ...s, tenants: s.tenants.map(t => t.id === id ? { ...t, ...patch } : t) }),
        'Tenant updated', tname(SR.current, id)),

    setStatus: (id, status, reason = '') =>
      upd(s => ({
        ...s,
        tenants: s.tenants.map(t =>
          t.id === id ? { ...t, status, suspendReason: status === 'suspended' ? reason : '' } : t
        ),
      }), status === 'suspended' ? 'Tenant suspended' : status === 'cancelled' ? 'Tenant cancelled' : 'Tenant activated',
        tname(SR.current, id) + (reason ? ' — ' + reason : '')),

    extendTrial: (id, days) =>
      upd(s => ({
        ...s,
        tenants: s.tenants.map(t =>
          t.id === id
            ? { ...t, status: 'trial', trialEnds: Math.max(Date.now(), t.trialEnds || 0) + days * DAY }
            : t
        ),
      }), `Trial extended by ${days} days`, tname(SR.current, id)),

    changePlan(id, planId, cycle, { invoice = false, promoPct = 0 } = {}) {
      upd(s => {
        const plan = planOf(s.plans, planId);
        let n = {
          ...s,
          tenants: s.tenants.map(t =>
            t.id === id ? { ...t, plan: planId, cycle, modules: plan ? plan.modules : t.modules } : t
          ),
        };
        if (invoice) {
          const i = buildInvoice(n, { tenantId: id, planId, cycle, kind: 'plan-change', promoPct });
          n = { ...n, invSeq: n.invSeq + 1, invoices: [i, ...n.invoices] };
        }
        return n;
      }, 'Plan changed', tname(SR.current, id) + ' → ' + planId + ' (' + cycle + ')');
    },

    deleteTenant: id =>
      upd(s => ({
        ...s,
        tenants:  s.tenants.filter(t => t.id !== id),
        invoices: s.invoices.filter(i => i.tenantId !== id),
        payments: s.payments.filter(p => p.tenantId !== id),
        tickets:  s.tickets.filter(k => k.tenantId !== id),
      }), 'Tenant deleted', tname(SR.current, id)),

    resetPassword(id) {
      const pw = genPw();
      upd(s => s, 'Password reset', tname(SR.current, id));
      return pw;
    },

    /* ── plans ── */
    savePlan: p =>
      upd(s => ({
        ...s,
        plans: s.plans.some(x => x.id === p.id)
          ? s.plans.map(x => x.id === p.id ? p : x)
          : [...s.plans, p],
      }), 'Plan saved', p.name),

    deletePlan: id =>
      upd(s => ({ ...s, plans: s.plans.filter(p => p.id !== id) }), 'Plan deleted', id),

    /* ── invoices & payments ── */
    createInvoice(d) {
      let made = null;
      upd(s => {
        made = buildInvoice(s, d);
        return { ...s, invSeq: s.invSeq + 1, invoices: [made, ...s.invoices] };
      }, 'Invoice created', tname(SR.current, d.tenantId));
      return made;
    },

    voidInvoice: id =>
      upd(s => ({
        ...s, invoices: s.invoices.map(i => i.id === id ? { ...i, status: 'void' } : i),
      }), 'Invoice voided', id),

    remind: id =>
      upd(s => ({
        ...s,
        invoices: s.invoices.map(i =>
          i.id === id ? { ...i, reminders: (i.reminders || 0) + 1, lastReminder: Date.now() } : i
        ),
      }), 'Payment reminder sent', id),

    /** Admin records payment received → confirmed immediately */
    recordPayment(invoiceId, { method, ref, amount }) {
      upd(s => {
        const inv = s.invoices.find(i => i.id === invoiceId);
        if (!inv) return s;
        const p = {
          id: uid('p'), invoiceId, tenantId: inv.tenantId,
          amount: Number(amount) || inv.total, method, ref,
          status: 'confirmed', at: Date.now(), by: actor.current,
        };
        return applyConfirm({ ...s, payments: [p, ...s.payments] }, p.id, actor.current);
      }, 'Payment recorded', invoiceId);
    },

    /** Tenant submits "I paid" → pending for platform to confirm */
    submitPayment(invoiceId, { method, ref }) {
      upd(s => {
        const inv = s.invoices.find(i => i.id === invoiceId);
        if (!inv) return s;
        const t = s.tenants.find(x => x.id === inv.tenantId);
        const p = {
          id: uid('p'), invoiceId, tenantId: inv.tenantId, amount: inv.total,
          method, ref, status: 'pending',
          at: Date.now(), by: t ? t.ownerName : 'Tenant',
        };
        return { ...s, payments: [p, ...s.payments] };
      }, 'Payment submitted for confirmation', invoiceId);
    },

    confirmPayment: id =>
      upd(s => applyConfirm(s, id, actor.current), 'Payment confirmed', id),

    rejectPayment: (id, reason = '') =>
      upd(s => ({
        ...s,
        payments: s.payments.map(p =>
          p.id === id ? { ...p, status: 'rejected', reason, by: actor.current } : p
        ),
      }), 'Payment rejected', id + (reason ? ' — ' + reason : '')),

    refundPayment: id =>
      upd(s => {
        const p = s.payments.find(x => x.id === id);
        if (!p) return s;
        return {
          ...s,
          payments: s.payments.map(x => x.id === id ? { ...x, status: 'refunded' } : x),
          invoices: s.invoices.map(i => i.id === p.invoiceId ? { ...i, status: 'refunded' } : i),
        };
      }, 'Payment refunded', id),

    /** Billing cycle: create renewals, expire trials, auto-suspend overdue */
    runBillingCycle() {
      const res = { invoiced: 0, suspended: 0, expired: 0 };
      upd(s => {
        const now = Date.now();
        let n = { ...s };

        n.tenants.forEach(t => {
          if (
            t.status === 'active' && t.nextBilling &&
            t.nextBilling - now < 7 * DAY &&
            !n.invoices.some(i => i.tenantId === t.id && i.status === 'unpaid')
          ) {
            const i = buildInvoice(n, { tenantId: t.id, planId: t.plan, cycle: t.cycle });
            n = { ...n, invSeq: n.invSeq + 1, invoices: [i, ...n.invoices] };
            res.invoiced++;
          }
        });

        n.tenants = n.tenants.map(t => {
          if (t.status === 'trial' && t.trialEnds && t.trialEnds < now) {
            res.expired++;
            return { ...t, status: 'suspended', suspendReason: 'Trial ended without payment' };
          }
          const lateInvs = n.invoices.filter(
            i => i.tenantId === t.id && i.status === 'unpaid' &&
                 i.dueAt + n.settings.graceDays * DAY < now
          ).length;
          if (t.status === 'past_due' && lateInvs && n.settings.autoSuspend) {
            res.suspended++;
            return { ...t, status: 'suspended', suspendReason: 'Non-payment (grace period ended)' };
          }
          if (t.status === 'active' && n.invoices.some(i => i.tenantId === t.id && i.status === 'unpaid' && i.dueAt < now)) {
            return { ...t, status: 'past_due' };
          }
          return t;
        });

        return n;
      }, 'Billing cycle run');
      return res;
    },

    /* ── support tickets ── */
    createTicket: (tenantId, subject, text, name, priority = 'normal') =>
      upd(s => ({
        ...s,
        tickets: [{
          id: uid('k'), tenantId, subject, status: 'open', priority,
          createdAt: Date.now(),
          msgs: [{ from: 'tenant', name, at: Date.now(), text }],
        }, ...s.tickets],
      }), 'Support ticket opened', subject),

    replyTicket: (id, from, name, text) =>
      upd(s => ({
        ...s,
        tickets: s.tickets.map(k =>
          k.id === id
            ? { ...k, status: from === 'admin' ? 'pending' : 'open', msgs: [...k.msgs, { from, name, at: Date.now(), text }] }
            : k
        ),
      }), 'Ticket reply', id),

    setTicket: (id, patch) =>
      upd(s => ({
        ...s,
        tickets: s.tickets.map(k => k.id === id ? { ...k, ...patch } : k),
      }), 'Ticket updated', id),

    /* ── announcements ── */
    saveAnnouncement: a =>
      upd(s => ({
        ...s,
        announcements: s.announcements.some(x => x.id === a.id)
          ? s.announcements.map(x => x.id === a.id ? a : x)
          : [{ ...a, at: Date.now() }, ...s.announcements],
      }), 'Announcement saved', a.title),

    deleteAnnouncement: id =>
      upd(s => ({
        ...s, announcements: s.announcements.filter(a => a.id !== id),
      }), 'Announcement deleted', id),

    /* ── team admins ── */
    saveAdmin: a =>
      upd(s => ({
        ...s,
        admins: s.admins.some(x => x.id === a.id)
          ? s.admins.map(x => x.id === a.id ? a : x)
          : [...s.admins, a],
      }), 'Team member saved', a.name),

    deleteAdmin: id =>
      upd(s => ({ ...s, admins: s.admins.filter(a => a.id !== id) }), 'Team member removed', id),

    /* ── settings ── */
    saveSettings: patch =>
      upd(s => ({ ...s, settings: { ...s.settings, ...patch } }), 'Settings updated'),
  };

  return <SaaS.Provider value={{ SS: S, SA }}>{children}</SaaS.Provider>;
}
