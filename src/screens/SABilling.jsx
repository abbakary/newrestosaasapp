import React, { useState } from 'react';
import { Sheet } from '../components/ui';
import { fmt } from '../data';
import { Badge, PayBadge, Field, Empty, Confirm, Bars, Stat, dShort, dTime, invStatus } from '../components/saasui';
import { PAY_METHODS, methodLabel, planOf } from '../data_saas';
import { InvoiceSheet } from './SATenants';

const tn = (SS, id) => (SS.tenants.find(t => t.id === id) || { name: '(deleted)' }).name;

/* ─── Printable Invoice View (exported for TenantBilling) ── */
export function InvoiceView({ SS, inv, onClose }) {
  const t    = SS.tenants.find(x => x.id === inv.tenantId) || {};
  const plan = planOf(SS.plans, inv.planId);
  return (
    <Sheet title={inv.no} subtitle={SS.settings.platformName} onClose={onClose} maxWidth={560}
      extraHeader={
        <button className="btn ghost sm" onClick={() => window.print()}>🖨 Print</button>
      }
    >
      <div className="sa-inv">
        <div className="row">
          <div>
            <small>Billed to</small><br />
            <b>{t.name}</b><br />
            <small>
              {t.ownerName} · {t.phone}<br />
              {t.address || t.city}{t.tin ? ' · TIN ' + t.tin : ''}
            </small>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge s={invStatus(inv)} /><br />
            <small>Issued {dShort(inv.issuedAt)}<br />Due {dShort(inv.dueAt)}</small>
          </div>
        </div>
        <table style={{ marginTop: 14 }}>
          <tbody>
            <tr>
              <td>{plan ? plan.name : inv.planId} package — {inv.cycle}{inv.note ? ' · ' + inv.note : ''}</td>
              <td style={{ textAlign: 'right' }}>{fmt(inv.base)}</td>
            </tr>
            {inv.disc > 0 && (
              <tr>
                <td>Discount {inv.promo}</td>
                <td style={{ textAlign: 'right' }}>− {fmt(inv.disc)}</td>
              </tr>
            )}
            <tr>
              <td>VAT ({SS.settings.vatPct}%)</td>
              <td style={{ textAlign: 'right' }}>{fmt(inv.vat)}</td>
            </tr>
            <tr>
              <td><b>Total due</b></td>
              <td style={{ textAlign: 'right' }}><b>{fmt(inv.total)}</b></td>
            </tr>
          </tbody>
        </table>
        {inv.status !== 'paid' && (
          <p className="sa-note">
            Pay via {PAY_METHODS.slice(0, 4).map(m => m.label).join(', ')}.
            Quote <b>{inv.no}</b> as the reference.
          </p>
        )}
      </div>
    </Sheet>
  );
}

/* ─── Record Payment Sheet ──────────────────────────────── */
function PaySheet({ SS, SA, inv, onClose, toast }) {
  const [method, setMethod] = useState('mpesa');
  const [ref,    setRef]    = useState('');
  const [amount, setAmount] = useState(inv.total);

  return (
    <Sheet title={'Record payment — ' + inv.no} subtitle={tn(SS, inv.tenantId)} onClose={onClose} maxWidth={440}>
      <Field label="Method">
        <select className="inp" value={method} onChange={e => setMethod(e.target.value)}>
          {PAY_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </Field>
      <Field label="Transaction reference">
        <input className="inp" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. QK7H2P9LM1" />
      </Field>
      <Field label="Amount received (TSh)">
        <input className="inp" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
      </Field>
      <p className="sa-note">
        Saving marks the invoice paid, activates the tenant and moves the next billing date forward.
      </p>
      <div className="sa-actions">
        <button className="btn ghost sm" onClick={onClose}>Cancel</button>
        <button className="btn sm" onClick={() => {
          SA.recordPayment(inv.id, { method, ref, amount });
          toast('Payment recorded — ' + tn(SS, inv.tenantId) + ' is active');
          onClose();
        }}>Mark as paid</button>
      </div>
    </Sheet>
  );
}

/* ─── Main Billing Component ────────────────────────────── */
export function Billing({ SS, SA, can, toast }) {
  const [tab,   setTab]   = useState('pay');
  const [fs,    setFs]    = useState('all');
  const [q,     setQ]     = useState('');
  const [sheet, setSheet] = useState(null);
  const [rej,   setRej]   = useState('Payment not received');
  const B = can('billing');

  const pend = SS.payments.filter(p => p.status === 'pending');

  const invRows = SS.invoices.filter(i =>
    (fs === 'all' || invStatus(i) === fs) &&
    (!q || (tn(SS, i.tenantId) + i.no).toLowerCase().includes(q.toLowerCase()))
  );

  const conf = SS.payments.filter(p => p.status === 'confirmed');

  const monthRev = off => {
    const d = new Date();
    const m = new Date(d.getFullYear(), d.getMonth() - off, 1);
    const e = new Date(d.getFullYear(), d.getMonth() - off + 1, 1);
    return {
      label: m.toLocaleString('en', { month: 'short' }),
      value: conf.filter(p => p.at >= m && p.at < e).reduce((a, p) => a + p.amount, 0),
    };
  };

  const months     = [5, 4, 3, 2, 1, 0].map(monthRev);
  const outstanding = SS.invoices.filter(i => i.status === 'unpaid').reduce((a, i) => a + i.total, 0);
  const overdueAmt  = SS.invoices.filter(i => invStatus(i) === 'overdue').reduce((a, i) => a + i.total, 0);
  const byMethod    = PAY_METHODS.map(m => ({
    m, v: conf.filter(p => p.method === m.id).reduce((a, p) => a + p.amount, 0),
  })).filter(x => x.v > 0);

  return (
    <>
      {/* KPI strip */}
      <div className="sa-statrow">
        <Stat icon="💰" label="Collected this month"   value={fmt(months[5].value)}            color="#15803d" />
        <Stat icon="⏳" label="Pending confirmation"  value={pend.length}  sub={fmt(pend.reduce((a, p) => a + p.amount, 0))} color="#a16207" />
        <Stat icon="🧾" label="Outstanding invoices"  value={fmt(outstanding)}                 color="#c2410c" />
        <Stat icon="🚨" label="Overdue"               value={fmt(overdueAmt)}                  color="#b91c1c" />
      </div>

      {/* Toolbar */}
      <div className="sa-toolbar">
        <div className="sa-tabs" style={{ margin: 0, flex: 1 }}>
          {[
            ['pay', `Payments${pend.length ? ' (' + pend.length + ')' : ''}`],
            ['inv', 'Invoices'],
            ['rev', 'Revenue'],
          ].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {B && (
          <button className="btn ghost sm" onClick={() => {
            const r = SA.runBillingCycle();
            toast(`Billing cycle: ${r.invoiced} renewal invoice(s), ${r.suspended} suspended, ${r.expired} trial(s) ended`, 5000);
          }}>⚙ Run billing cycle</button>
        )}
        {B && <button className="btn sm" onClick={() => setSheet({ type: 'new' })}>＋ Invoice</button>}
      </div>

      {/* ── Payments tab ── */}
      {tab === 'pay' && (
        <>
          {pend.length > 0 && (
            <div className="card sa-pending">
              <div className="sa-sec">Waiting for confirmation</div>
              {pend.map(p => {
                const inv = SS.invoices.find(i => i.id === p.invoiceId);
                return (
                  <div key={p.id} className="sa-prow">
                    <div>
                      <b>{tn(SS, p.tenantId)}</b><br />
                      <small>{inv ? inv.no : ''} · {methodLabel(p.method)} · Ref <b>{p.ref || 'none'}</b> · {dTime(p.at)}</small>
                    </div>
                    <div className="sa-prow-r">
                      <b>{fmt(p.amount)}</b>
                      {B && (
                        <>
                          <button className="btn sm" onClick={() => {
                            SA.confirmPayment(p.id);
                            toast('Payment confirmed — account activated');
                          }}>✓ Confirm</button>
                          <button className="btn ghost sm" onClick={() => setSheet({ type: 'reject', p })}>✕ Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card sa-scroll" style={{ padding: 0, marginTop: 12 }}>
            <table className="sa-table">
              <thead>
                <tr><th>Date</th><th>Tenant</th><th>Method</th><th>Reference</th><th>Amount</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {SS.payments.map(p => (
                  <tr key={p.id}>
                    <td>{dShort(p.at)}</td>
                    <td>{tn(SS, p.tenantId)}</td>
                    <td>{methodLabel(p.method)}</td>
                    <td>{p.ref || '—'}</td>
                    <td>{fmt(p.amount)}</td>
                    <td><PayBadge s={p.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      {B && p.status === 'confirmed' && (
                        <button className="sa-link" onClick={() => setSheet({ type: 'refund', p })}>Refund</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!SS.payments.length && <tr><td colSpan="7"><Empty text="No payments yet" /></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Invoices tab ── */}
      {tab === 'inv' && (
        <>
          <div className="sa-toolbar">
            <input className="inp" placeholder="Search invoice or tenant…" value={q} onChange={e => setQ(e.target.value)} />
            <select className="inp" value={fs} onChange={e => setFs(e.target.value)}>
              {['all', 'unpaid', 'overdue', 'paid', 'void', 'refunded'].map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
              ))}
            </select>
          </div>
          <div className="card sa-scroll" style={{ padding: 0 }}>
            <table className="sa-table">
              <thead>
                <tr><th>Invoice</th><th>Tenant</th><th>Package</th><th>Issued</th><th>Due</th><th>Total</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {invRows.map(i => (
                  <tr key={i.id}>
                    <td><b>{i.no}</b></td>
                    <td>{tn(SS, i.tenantId)}</td>
                    <td>{i.planId} · {i.cycle}</td>
                    <td>{dShort(i.issuedAt)}</td>
                    <td>{dShort(i.dueAt)}</td>
                    <td>{fmt(i.total)}</td>
                    <td>
                      <Badge s={invStatus(i)} />
                      {i.reminders > 0 && <small> · {i.reminders} reminder(s)</small>}
                    </td>
                    <td>
                      <div className="sa-rowacts">
                        <button title="View / print" onClick={() => setSheet({ type: 'view', i })}>👁</button>
                        {B && i.status === 'unpaid' && <button title="Record payment" onClick={() => setSheet({ type: 'pay', i })}>💵</button>}
                        {B && i.status === 'unpaid' && <button title="Send reminder"  onClick={() => { SA.remind(i.id); toast('Reminder sent to ' + tn(SS, i.tenantId)); }}>🔔</button>}
                        {B && i.status === 'unpaid' && <button title="Void invoice"   onClick={() => setSheet({ type: 'void', i })}>🚫</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!invRows.length && <tr><td colSpan="8"><Empty text="No invoices found" /></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Revenue tab ── */}
      {tab === 'rev' && (
        <div className="sa-grid2" style={{ alignItems: 'start' }}>
          <div className="card">
            <div className="sa-sec">Collected revenue — last 6 months</div>
            <Bars data={months} fmtV={v => Math.round(v / 1000) + 'k'} />
          </div>
          <div className="card">
            <div className="sa-sec">By payment method</div>
            {byMethod.map(({ m, v }) => (
              <div key={m.id} className="sa-usage">
                <span>{m.icon} {m.label}</span>
                <div className="bar">
                  <i style={{ width: (v / byMethod.reduce((a, x) => a + x.v, 0)) * 100 + '%' }} />
                </div>
                <small>{fmt(v)}</small>
              </div>
            ))}
            {!byMethod.length && <Empty text="No confirmed payments yet" />}
          </div>
        </div>
      )}

      {/* ── Sheets ── */}
      {sheet?.type === 'new'    && <InvoiceSheet SS={SS} SA={SA} toast={toast} onClose={() => setSheet(null)} />}
      {sheet?.type === 'view'   && <InvoiceView  SS={SS} inv={sheet.i} onClose={() => setSheet(null)} />}
      {sheet?.type === 'pay'    && <PaySheet      SS={SS} SA={SA} inv={sheet.i} toast={toast} onClose={() => setSheet(null)} />}
      {sheet?.type === 'void'   && (
        <Confirm danger title="Void invoice?" yes="Void"
          msg={`${sheet.i.no} (${fmt(sheet.i.total)}) will be cancelled.`}
          onNo={() => setSheet(null)}
          onYes={() => { SA.voidInvoice(sheet.i.id); toast('Invoice voided'); setSheet(null); }}
        />
      )}
      {sheet?.type === 'refund' && (
        <Confirm danger title="Refund payment?" yes="Refund"
          msg={`Mark ${fmt(sheet.p.amount)} from ${tn(SS, sheet.p.tenantId)} as refunded.`}
          onNo={() => setSheet(null)}
          onYes={() => { SA.refundPayment(sheet.p.id); toast('Payment marked refunded'); setSheet(null); }}
        />
      )}
      {sheet?.type === 'reject' && (
        <Sheet title="Reject payment" subtitle={tn(SS, sheet.p.tenantId) + ' · ' + sheet.p.ref} onClose={() => setSheet(null)} maxWidth={420}>
          <Field label="Reason">
            <select className="inp" value={rej} onChange={e => setRej(e.target.value)}>
              {['Payment not received', 'Wrong amount', 'Reference not found', 'Duplicate submission'].map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={() => setSheet(null)}>Cancel</button>
            <button className="btn sm" style={{ background: '#dc2626' }} onClick={() => {
              SA.rejectPayment(sheet.p.id, rej);
              toast('Payment rejected'); setSheet(null);
            }}>Reject</button>
          </div>
        </Sheet>
      )}
    </>
  );
}
