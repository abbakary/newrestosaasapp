import React, { useState, useContext } from 'react';
import { Sheet } from '../components/ui';
import { fmt } from '../data';
import { Ctx } from '../store';
import { Badge, PayBadge, Field, Empty, Confirm, Bars, Stat, dShort, dTime, invStatus } from '../components/saasui';
import { PAY_METHODS, methodLabel, planOf } from '../data_saas';
import { InvoiceSheet } from './SATenants';

const tn = (SS, id) => (SS.tenants.find(t => t.id === id) || { name: '(deleted)' }).name;

/* ─── Printable Invoice View (exported for TenantBilling) ── */
export function InvoiceView({ SS, inv, onClose }) {
  const { lang } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  const t    = SS.tenants.find(x => x.id === inv.tenantId) || {};
  const plan = planOf(SS.plans, inv.planId);
  return (
    <Sheet title={inv.no} subtitle={SS.settings.platformName} onClose={onClose} maxWidth={560}
      extraHeader={
        <button className="btn ghost sm" onClick={() => window.print()}>
          🖨 {isSw ? 'Chapisha' : 'Print'}
        </button>
      }
    >
      <div className="sa-inv">
        <div className="row">
          <div>
            <small>{isSw ? 'Imetumwa kwa' : 'Billed to'}</small><br />
            <b>{t.name}</b><br />
            <small>
              {t.ownerName} · {t.phone}<br />
              {t.address || t.city}{t.tin ? ' · TIN ' + t.tin : ''}
            </small>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge s={invStatus(inv)} /><br />
            <small>
              {isSw ? 'Imetolewa' : 'Issued'} {dShort(inv.issuedAt)}<br />
              {isSw ? 'Mwisho' : 'Due'} {dShort(inv.dueAt)}
            </small>
          </div>
        </div>
        <table style={{ marginTop: 14 }}>
          <tbody>
            <tr>
              <td>
                {isSw
                  ? `Kifurushi cha ${plan ? plan.name : inv.planId} — ${inv.cycle === 'yearly' ? 'mwaka' : 'mwezi'}${inv.note ? ' · ' + inv.note : ''}`
                  : `${plan ? plan.name : inv.planId} package — ${inv.cycle}${inv.note ? ' · ' + inv.note : ''}`}
              </td>
              <td style={{ textAlign: 'right' }}>{fmt(inv.base)}</td>
            </tr>
            {inv.disc > 0 && (
              <tr>
                <td>{isSw ? 'Punguzo' : 'Discount'} {inv.promo}</td>
                <td style={{ textAlign: 'right' }}>− {fmt(inv.disc)}</td>
              </tr>
            )}
            <tr>
              <td>VAT ({SS.settings.vatPct}%)</td>
              <td style={{ textAlign: 'right' }}>{fmt(inv.vat)}</td>
            </tr>
            <tr>
              <td><b>{isSw ? 'Jumla ya kulipa' : 'Total due'}</b></td>
              <td style={{ textAlign: 'right' }}><b>{fmt(inv.total)}</b></td>
            </tr>
          </tbody>
        </table>
        {inv.status !== 'paid' && (
          <p className="sa-note">
            {isSw
              ? <>Lipa kupitia {PAY_METHODS.slice(0, 4).map(m => m.label).join(', ')}. Tumia <b>{inv.no}</b> kama kumbukumbu.</>
              : <>Pay via {PAY_METHODS.slice(0, 4).map(m => m.label).join(', ')}. Quote <b>{inv.no}</b> as the reference.</>}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/* ─── Record Payment Sheet ──────────────────────────────── */
function PaySheet({ SS, SA, inv, onClose, toast, isSw }) {
  const [method, setMethod] = useState('mpesa');
  const [ref,    setRef]    = useState('');
  const [amount, setAmount] = useState(inv.total);

  return (
    <Sheet
      title={(isSw ? 'Rekodi malipo — ' : 'Record payment — ') + inv.no}
      subtitle={tn(SS, inv.tenantId)}
      onClose={onClose}
      maxWidth={440}
    >
      <Field label={isSw ? 'Njia' : 'Method'}>
        <select className="inp" value={method} onChange={e => setMethod(e.target.value)}>
          {PAY_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </Field>
      <Field label={isSw ? 'Kumbukumbu ya muamala' : 'Transaction reference'}>
        <input className="inp" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. QK7H2P9LM1" />
      </Field>
      <Field label={isSw ? 'Kiasi kilichopokelewa (TSh)' : 'Amount received (TSh)'}>
        <input className="inp" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
      </Field>
      <p className="sa-note">
        {isSw
          ? 'Kuhifadhi kunaweka alama ya kulipwa kwenye ankara, kuwezesha mpangaji na kusogeza mbele tarehe ijayo ya malipo.'
          : 'Saving marks the invoice paid, activates the tenant and moves the next billing date forward.'}
      </p>
      <div className="sa-actions">
        <button className="btn ghost sm" onClick={onClose}>
          {isSw ? 'Ghairi' : 'Cancel'}
        </button>
        <button className="btn sm" onClick={() => {
          SA.recordPayment(inv.id, { method, ref, amount });
          toast(isSw
            ? `Malipo yamerekodiwa — ${tn(SS, inv.tenantId)} yuko hai`
            : `Payment recorded — ${tn(SS, inv.tenantId)} is active`);
          onClose();
        }}>
          {isSw ? 'Weka alama imelipwa' : 'Mark as paid'}
        </button>
      </div>
    </Sheet>
  );
}

/* ─── Main Billing Component ────────────────────────────── */
export function Billing({ SS, SA, can, toast }) {
  const { lang } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
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
      label: m.toLocaleString(isSw ? 'sw' : 'en', { month: 'short' }),
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
        <Stat icon="💰" label={isSw ? 'Imekusanywa mwezi huu' : 'Collected this month'}   value={fmt(months[5].value)}            color="#15803d" />
        <Stat icon="⏳" label={isSw ? 'Inasubiri uthibitisho' : 'Pending confirmation'}  value={pend.length}  sub={fmt(pend.reduce((a, p) => a + p.amount, 0))} color="#a16207" />
        <Stat icon="🧾" label={isSw ? 'Ankara zinazodaiwa' : 'Outstanding invoices'}  value={fmt(outstanding)}                 color="#c2410c" />
        <Stat icon="🚨" label={isSw ? 'Zilizochelewa' : 'Overdue'}               value={fmt(overdueAmt)}                  color="#b91c1c" />
      </div>

      {/* Toolbar */}
      <div className="sa-toolbar">
        <div className="sa-tabs" style={{ margin: 0, flex: 1 }}>
          {[
            ['pay', `${isSw ? 'Malipo' : 'Payments'}${pend.length ? ' (' + pend.length + ')' : ''}`],
            ['inv', isSw ? 'Ankara' : 'Invoices'],
            ['rev', isSw ? 'Mapato' : 'Revenue'],
          ].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {B && (
          <button className="btn ghost sm" onClick={() => {
            const r = SA.runBillingCycle();
            toast(isSw
              ? `Mzunguko wa bili: ankara ${r.invoiced} mpya, ${r.suspended} zimesimamishwa, ${r.expired} majaribio yameisha`
              : `Billing cycle: ${r.invoiced} renewal invoice(s), ${r.suspended} suspended, ${r.expired} trial(s) ended`, 5000);
          }}>
            {isSw ? '⚙ Endesha mzunguko wa bili' : '⚙ Run billing cycle'}
          </button>
        )}
        {B && (
          <button className="btn sm" onClick={() => setSheet({ type: 'new' })}>
            {isSw ? '＋ Ankara' : '＋ Invoice'}
          </button>
        )}
      </div>

      {/* ── Payments tab ── */}
      {tab === 'pay' && (
        <>
          {pend.length > 0 && (
            <div className="card sa-pending">
              <div className="sa-sec">{isSw ? 'Inasubiri uthibitisho' : 'Waiting for confirmation'}</div>
              {pend.map(p => {
                const inv = SS.invoices.find(i => i.id === p.invoiceId);
                return (
                  <div key={p.id} className="sa-prow">
                    <div>
                      <b>{tn(SS, p.tenantId)}</b><br />
                      <small>{inv ? inv.no : ''} · {methodLabel(p.method)} · {isSw ? 'Kumb' : 'Ref'} <b>{p.ref || (isSw ? 'hakuna' : 'none')}</b> · {dTime(p.at)}</small>
                    </div>
                    <div className="sa-prow-r">
                      <b>{fmt(p.amount)}</b>
                      {B && (
                        <>
                          <button className="btn sm" onClick={() => {
                            SA.confirmPayment(p.id);
                            toast(isSw ? 'Malipo yamethibitishwa — akaunti imewezeshwa' : 'Payment confirmed — account activated');
                          }}>
                            {isSw ? '✓ Thibitisha' : '✓ Confirm'}
                          </button>
                          <button className="btn ghost sm" onClick={() => setSheet({ type: 'reject', p })}>
                            {isSw ? '✕ Kataa' : '✕ Reject'}
                          </button>
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
                <tr>
                  <th>{isSw ? 'Tarehe' : 'Date'}</th>
                  <th>{isSw ? 'Mpangaji' : 'Tenant'}</th>
                  <th>{isSw ? 'Njia' : 'Method'}</th>
                  <th>{isSw ? 'Kumbukumbu' : 'Reference'}</th>
                  <th>{isSw ? 'Kiasi' : 'Amount'}</th>
                  <th>{isSw ? 'Hali' : 'Status'}</th>
                  <th />
                </tr>
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
                        <button className="sa-link" onClick={() => setSheet({ type: 'refund', p })}>
                          {isSw ? 'Rudisha fedha' : 'Refund'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!SS.payments.length && <tr><td colSpan="7"><Empty text={isSw ? 'Hakuna malipo bado' : 'No payments yet'} /></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Invoices tab ── */}
      {tab === 'inv' && (
        <>
          <div className="sa-toolbar">
            <input
              className="inp"
              placeholder={isSw ? 'Tafuta ankara au mpangaji…' : 'Search invoice or tenant…'}
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <select className="inp" value={fs} onChange={e => setFs(e.target.value)}>
              {['all', 'unpaid', 'overdue', 'paid', 'void', 'refunded'].map(s => (
                <option key={s} value={s}>{s === 'all' ? (isSw ? 'Hali zote' : 'All statuses') : s}</option>
              ))}
            </select>
          </div>
          <div className="card sa-scroll" style={{ padding: 0 }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>{isSw ? 'Ankara' : 'Invoice'}</th>
                  <th>{isSw ? 'Mpangaji' : 'Tenant'}</th>
                  <th>{isSw ? 'Kifurushi' : 'Package'}</th>
                  <th>{isSw ? 'Imetolewa' : 'Issued'}</th>
                  <th>{isSw ? 'Mwisho' : 'Due'}</th>
                  <th>{isSw ? 'Jumla' : 'Total'}</th>
                  <th>{isSw ? 'Hali' : 'Status'}</th>
                  <th style={{ textAlign: 'right' }}>{isSw ? 'Vitendo' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {invRows.map(i => (
                  <tr key={i.id}>
                    <td><b>{i.no}</b></td>
                    <td>{tn(SS, i.tenantId)}</td>
                    <td>{i.planId} · {i.cycle === 'yearly' ? (isSw ? 'mwaka' : 'yearly') : (isSw ? 'mwezi' : 'monthly')}</td>
                    <td>{dShort(i.issuedAt)}</td>
                    <td>{dShort(i.dueAt)}</td>
                    <td>{fmt(i.total)}</td>
                    <td>
                      <Badge s={invStatus(i)} />
                      {i.reminders > 0 && <small> · {i.reminders} {isSw ? 'ukumbusho' : 'reminder(s)'}</small>}
                    </td>
                    <td>
                      <div className="sa-rowacts">
                        <button title={isSw ? 'Tazama / chapisha' : 'View / print'} onClick={() => setSheet({ type: 'view', i })}>👁</button>
                        {B && i.status === 'unpaid' && <button title={isSw ? 'Rekodi malipo' : 'Record payment'} onClick={() => setSheet({ type: 'pay', i })}>💵</button>}
                        {B && i.status === 'unpaid' && (
                          <button
                            title={isSw ? 'Tuma ukumbusho' : 'Send reminder'}
                            onClick={() => {
                              SA.remind(i.id);
                              toast((isSw ? 'Ukumbusho umetumwa kwa ' : 'Reminder sent to ') + tn(SS, i.tenantId));
                            }}
                          >🔔</button>
                        )}
                        {B && i.status === 'unpaid' && <button title={isSw ? 'Futa ankara' : 'Void invoice'} onClick={() => setSheet({ type: 'void', i })}>🚫</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!invRows.length && <tr><td colSpan="8"><Empty text={isSw ? 'Hakuna ankara zilizopatikana' : 'No invoices found'} /></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Revenue tab ── */}
      {tab === 'rev' && (
        <div className="sa-grid2" style={{ alignItems: 'start' }}>
          <div className="card">
            <div className="sa-sec">{isSw ? 'Mapato yaliyokusanywa — miezi 6 iliyopita' : 'Collected revenue — last 6 months'}</div>
            <Bars data={months} fmtV={v => Math.round(v / 1000) + 'k'} />
          </div>
          <div className="card">
            <div className="sa-sec">{isSw ? 'Kwa njia ya malipo' : 'By payment method'}</div>
            {byMethod.map(({ m, v }) => (
              <div key={m.id} className="sa-usage">
                <span>{m.icon} {m.label}</span>
                <div className="bar">
                  <i style={{ width: (v / byMethod.reduce((a, x) => a + x.v, 0)) * 100 + '%' }} />
                </div>
                <small>{fmt(v)}</small>
              </div>
            ))}
            {!byMethod.length && <Empty text={isSw ? 'Hakuna malipo yaliyothibitishwa bado' : 'No confirmed payments yet'} />}
          </div>
        </div>
      )}

      {/* ── Sheets ── */}
      {sheet?.type === 'new'    && <InvoiceSheet SS={SS} SA={SA} toast={toast} onClose={() => setSheet(null)} />}
      {sheet?.type === 'view'   && <InvoiceView  SS={SS} inv={sheet.i} onClose={() => setSheet(null)} />}
      {sheet?.type === 'pay'    && <PaySheet      SS={SS} SA={SA} inv={sheet.i} toast={toast} isSw={isSw} onClose={() => setSheet(null)} />}
      {sheet?.type === 'void'   && (
        <Confirm
          danger
          title={isSw ? 'Futa ankara?' : 'Void invoice?'}
          yes={isSw ? 'Futa' : 'Void'}
          msg={isSw ? `${sheet.i.no} (${fmt(sheet.i.total)}) itafutwa.` : `${sheet.i.no} (${fmt(sheet.i.total)}) will be cancelled.`}
          onNo={() => setSheet(null)}
          onYes={() => { SA.voidInvoice(sheet.i.id); toast(isSw ? 'Ankara imefutwa' : 'Invoice voided'); setSheet(null); }}
        />
      )}
      {sheet?.type === 'refund' && (
        <Confirm
          danger
          title={isSw ? 'Rudisha malipo?' : 'Refund payment?'}
          yes={isSw ? 'Rudisha' : 'Refund'}
          msg={isSw
            ? `Weka alama ya kurudishwa kwa ${fmt(sheet.p.amount)} kutoka ${tn(SS, sheet.p.tenantId)}.`
            : `Mark ${fmt(sheet.p.amount)} from ${tn(SS, sheet.p.tenantId)} as refunded.`}
          onNo={() => setSheet(null)}
          onYes={() => { SA.refundPayment(sheet.p.id); toast(isSw ? 'Malipo yamewekwa alama ya kurudishwa' : 'Payment marked refunded'); setSheet(null); }}
        />
      )}
      {sheet?.type === 'reject' && (
        <Sheet
          title={isSw ? 'Kataa malipo' : 'Reject payment'}
          subtitle={tn(SS, sheet.p.tenantId) + ' · ' + sheet.p.ref}
          onClose={() => setSheet(null)}
          maxWidth={420}
        >
          <Field label={isSw ? 'Sababu' : 'Reason'}>
            <select className="inp" value={rej} onChange={e => setRej(e.target.value)}>
              {[
                ['Payment not received', isSw ? 'Malipo hayajapokelewa' : 'Payment not received'],
                ['Wrong amount', isSw ? 'Kiasi si sahihi' : 'Wrong amount'],
                ['Reference not found', isSw ? 'Kumbukumbu haijapatikana' : 'Reference not found'],
                ['Duplicate submission', isSw ? 'Imetumwa mara mbili' : 'Duplicate submission']
              ].map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </Field>
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={() => setSheet(null)}>
              {isSw ? 'Ghairi' : 'Cancel'}
            </button>
            <button className="btn sm" style={{ background: '#dc2626' }} onClick={() => {
              SA.rejectPayment(sheet.p.id, rej);
              toast(isSw ? 'Malipo yamekataliwa' : 'Payment rejected'); setSheet(null);
            }}>
              {isSw ? 'Kataa' : 'Reject'}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
