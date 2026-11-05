import React, { useState, useContext, useEffect } from 'react';
import { Sheet } from '../components/ui';
import { fmt } from '../data';
import { SaaS } from '../saasStore';
import { Badge, PayBadge, Field, Empty, dShort, dTime, daysLeft, invStatus } from '../components/saasui';
import { InvoiceView } from './SABilling';
import { MODULE_CATALOG, PAY_METHODS, methodLabel, planOf, limitTxt, effStatus, calcInvoice } from '../data_saas';

export default function TenantBilling({ sess, out }) {
  const { SS, SA } = useContext(SaaS);
  const t = SS.tenants.find(x => x.id === (sess.tenantId || 't1'));

  const [tab,    setTab]    = useState('plan');
  const [pay,    setPay]    = useState(null);
  const [view,   setView]   = useState(null);
  const [method, setMethod] = useState('mpesa');
  const [ref,    setRef]    = useState('');
  const [msg,    setMsg]    = useState(null);
  const [tk,     setTk]     = useState(null);
  const [cycle,  setCycle]  = useState(t ? t.cycle : 'monthly');

  useEffect(() => { SA.setActor(sess.name); }, [sess.name]); // eslint-disable-line

  if (!t) {
    return (
      <div className="sa" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Empty text="Business account not found." />
          <button className="btn sm" style={{ marginTop: 12 }} onClick={out}>Back</button>
        </div>
      </div>
    );
  }

  const plan      = planOf(SS.plans, t.plan);
  const st        = effStatus(t);
  const invs      = SS.invoices.filter(i => i.tenantId === t.id);
  const pays      = SS.payments.filter(p => p.tenantId === t.id);
  const tickets   = SS.tickets.filter(k => k.tenantId === t.id);
  const pendingFor = id => pays.find(p => p.invoiceId === id && p.status === 'pending');
  const toast      = m => { setMsg(m); setTimeout(() => setMsg(null), 2800); };
  const bar        = (u, m) => (m === -1 ? 8 : Math.min(100, Math.round((u / m) * 100)));

  return (
    <div className="sa tb-app">
      {msg && <div className="toast">{msg}</div>}
      <main className="sa-main" style={{ marginLeft: 0 }}>
        <header className="sa-top" style={{ background: '#0E5A47', color: '#fff' }}>
          <button className="sa-burger" style={{ color: '#fff' }} onClick={out}>‹ Back</button>
          <div>
            <small style={{ color: '#cfe8df' }}>{t.name}</small>
            <h2 style={{ color: '#fff' }}>💳 Subscription &amp; Billing</h2>
          </div>
        </header>

        <div className="sa-body" style={{ maxWidth: 980, margin: '0 auto' }}>
          <div className="sa-tabs">
            {[
              ['plan',   'My plan'],
              ['inv',    `Invoices (${invs.length})`],
              ['change', 'Change package'],
              ['help',   `Support (${tickets.length})`],
            ].map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {/* ── My Plan ── */}
          {tab === 'plan' && (
            <>
              <div className="card">
                <div className="row">
                  <div>
                    <small>Current package</small>
                    <h2 style={{ margin: '2px 0' }}>{plan ? plan.name : t.plan} <small>· {t.cycle}</small></h2>
                  </div>
                  <Badge s={st} />
                </div>
                <div className="sa-kv" style={{ marginTop: 10 }}>
                  <div><small>Price</small><b>{plan ? fmt(t.cycle === 'yearly' ? plan.priceY : plan.priceM) : '—'}</b></div>
                  {t.trialEnds
                    ? <div><small>Free trial ends</small><b>{dShort(t.trialEnds)} ({Math.max(0, daysLeft(t.trialEnds))} days left)</b></div>
                    : <div><small>Next billing date</small><b>{dShort(t.nextBilling)}</b></div>}
                </div>
                {st === 'pending'  && <p className="sa-alert" style={{ background: '#fef9c3', color: '#854d0e' }}>We are waiting for your first payment to be confirmed. Submit the transaction reference under Invoices.</p>}
                {st === 'past_due' && <p className="sa-alert">Payment is overdue. Please pay the outstanding invoice to avoid suspension.</p>}
                {st === 'expired'  && <p className="sa-alert">Your free trial has ended. Choose a package and pay to continue.</p>}
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <div className="sa-sec">Usage</div>
                {plan && [['Outlets', t.outlets, plan.outlets], ['Staff users', t.users, plan.users], ['Tables', t.tables, plan.tables]].map(([l, u, m]) => (
                  <div key={l} className="sa-usage">
                    <span>{l}</span>
                    <div className="bar"><i style={{ width: bar(u, m) + '%', background: bar(u, m) > 90 ? '#dc2626' : undefined }} /></div>
                    <small>{u} / {limitTxt(m)}</small>
                  </div>
                ))}
                <div className="sa-sep">Modules in your package</div>
                <div className="sa-chips">
                  {MODULE_CATALOG.map(m => (
                    <span key={m.id} className={'sa-chip' + (t.modules.includes(m.id) ? ' on' : '')}>
                      {m.icon} {m.label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Invoices ── */}
          {tab === 'inv' && (
            <div className="card sa-scroll" style={{ padding: 0 }}>
              <table className="sa-table">
                <thead>
                  <tr><th>Invoice</th><th>Date</th><th>Total</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                </thead>
                <tbody>
                  {invs.map(i => {
                    const pp = pendingFor(i.id);
                    return (
                      <tr key={i.id}>
                        <td><b>{i.no}</b><br /><small>{i.planId} · {i.cycle}</small></td>
                        <td>{dShort(i.issuedAt)}</td>
                        <td>{fmt(i.total)}</td>
                        <td>{pp ? <PayBadge s="pending" /> : <Badge s={invStatus(i)} />}</td>
                        <td>
                          <div className="sa-rowacts">
                            <button title="View" onClick={() => setView(i)}>👁</button>
                            {i.status === 'unpaid' && !pp && (
                              <button className="btn sm" style={{ padding: '5px 10px' }} onClick={() => { setPay(i); setRef(''); }}>
                                Pay now
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!invs.length && <tr><td colSpan="5"><Empty text="No invoices yet" /></td></tr>}
                </tbody>
              </table>

              {pays.length > 0 && (
                <div style={{ padding: 14 }}>
                  <div className="sa-sec">Payment history</div>
                  {pays.map(p => (
                    <div key={p.id} className="sa-log">
                      <b>{fmt(p.amount)} · {methodLabel(p.method)}</b> <PayBadge s={p.status} />
                      <small>Ref {p.ref || '—'} · {dTime(p.at)}{p.reason ? ' · ' + p.reason : ''}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Change Package ── */}
          {tab === 'change' && (
            <>
              <div className="sa-toolbar">
                <small style={{ flex: 1 }}>
                  Choose a new package. An invoice is created; the change applies once your payment is confirmed.
                </small>
                <div className="seg" style={{ margin: 0 }}>
                  {['monthly', 'yearly'].map(c => (
                    <button key={c} className={cycle === c ? 'on' : ''} onClick={() => setCycle(c)}>
                      {c === 'yearly' ? 'Yearly (save 2 months)' : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sa-cards">
                {SS.plans.filter(p => p.active).map(p => {
                  const cur = p.id === t.plan && cycle === t.cycle;
                  return (
                    <div key={p.id} className={'card sa-plan' + (cur ? ' cur' : '')}>
                      <div className="row">
                        <b style={{ fontSize: 18 }}>{p.name}</b>
                        {p.popular && <Badge s="active" label="Popular" />}
                      </div>
                      <div className="sa-price">
                        {fmt(cycle === 'yearly' ? p.priceY : p.priceM)}
                        <small> / {cycle === 'yearly' ? 'year' : 'month'}</small>
                      </div>
                      <ul>{p.features.map(x => <li key={x}>{x}</li>)}</ul>
                      <button className="btn sm" disabled={cur} onClick={() => {
                        const inv = SA.createInvoice({ tenantId: t.id, planId: p.id, cycle, kind: 'plan-change' });
                        setTab('inv');
                        toast('Invoice ' + (inv ? inv.no : '') + ' created. Pay it to switch to ' + p.name + '.');
                      }}>
                        {cur ? 'Current package' : 'Switch to ' + p.name}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Support ── */}
          {tab === 'help' && (
            <>
              <div className="sa-toolbar">
                <small style={{ flex: 1 }}>Need help? Call {SS.settings.supportPhone} or open a ticket.</small>
                <button className="btn sm" onClick={() => setTk({ subject: '', text: '', priority: 'normal' })}>＋ New ticket</button>
              </div>
              {tickets.map(k => (
                <div key={k.id} className="card" style={{ marginBottom: 8 }}>
                  <div className="row"><b>{k.subject}</b><Badge s={k.status} /></div>
                  {k.msgs.map((m, i) => (
                    <div key={i} className={'sa-msg ' + m.from}>
                      <small>{m.name} · {dTime(m.at)}</small>
                      <p>{m.text}</p>
                    </div>
                  ))}
                  {k.status !== 'closed' && (
                    <ReplyBox onSend={txt => { SA.replyTicket(k.id, 'tenant', sess.name, txt); toast('Reply sent'); }} />
                  )}
                </div>
              ))}
              {!tickets.length && <Empty icon="🎧" text="No tickets yet" />}
            </>
          )}
        </div>
      </main>

      {/* ── Pay Now Sheet ── */}
      {pay && (() => {
        const c = pay;
        return (
          <Sheet title={'Pay ' + c.no} subtitle={fmt(c.total) + ' incl. VAT'} onClose={() => setPay(null)} maxWidth={480}>
            <div className="tags" style={{ marginTop: 0 }}>
              {PAY_METHODS.slice(0, 5).map(m => (
                <button key={m.id} className={method === m.id ? 'on' : ''} onClick={() => setMethod(m.id)}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
            <div className="sa-payinfo">
              <small>Send {fmt(c.total)} to</small>
              <b>{SS.settings.payInfo[method]}</b>
              <small>Use <b>{c.no}</b> as the payment reference.</small>
            </div>
            <Field label="Transaction ID / reference from your receipt">
              <input className="inp" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. QK7H2P9LM1" />
            </Field>
            <p className="sa-note">
              After you submit, our team verifies the payment (usually within a few hours) and activates your account.
            </p>
            <div className="sa-actions">
              <button className="btn ghost sm" onClick={() => setPay(null)}>Cancel</button>
              <button className="btn sm" disabled={!ref.trim()} onClick={() => {
                SA.submitPayment(c.id, { method, ref: ref.trim() });
                toast('Payment submitted — awaiting confirmation');
                setPay(null);
              }}>I have paid</button>
            </div>
          </Sheet>
        );
      })()}

      {view && <InvoiceView SS={SS} inv={view} onClose={() => setView(null)} />}

      {/* ── New Ticket Sheet ── */}
      {tk && (
        <Sheet title="New support ticket" onClose={() => setTk(null)} maxWidth={480}>
          <Field label="Subject">
            <input className="inp" value={tk.subject} onChange={e => setTk({ ...tk, subject: e.target.value })} />
          </Field>
          <Field label="How can we help?">
            <textarea className="inp" rows={4} value={tk.text} onChange={e => setTk({ ...tk, text: e.target.value })} />
          </Field>
          <Field label="Priority">
            <select className="inp" value={tk.priority} onChange={e => setTk({ ...tk, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High — business stopped</option>
            </select>
          </Field>
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={() => setTk(null)}>Cancel</button>
            <button className="btn sm"
              disabled={!tk.subject.trim() || !tk.text.trim()}
              onClick={() => {
                SA.createTicket(t.id, tk.subject.trim(), tk.text.trim(), sess.name, tk.priority);
                toast('Ticket sent'); setTk(null);
              }}>Submit</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function ReplyBox({ onSend }) {
  const [v, setV] = useState('');
  return (
    <div className="sa-toolbar" style={{ marginTop: 8 }}>
      <input className="inp" placeholder="Write a reply…" value={v} onChange={e => setV(e.target.value)} />
      <button className="btn ghost sm" disabled={!v.trim()} onClick={() => { onSend(v.trim()); setV(''); }}>Send</button>
    </div>
  );
}
