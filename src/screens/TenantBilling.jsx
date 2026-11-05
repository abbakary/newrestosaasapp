import React, { useState, useContext, useEffect } from 'react';
import { Sheet } from '../components/ui';
import { fmt } from '../data';
import { SaaS } from '../saasStore';
import { Ctx } from '../store';
import { Badge, PayBadge, Field, Empty, dShort, dTime, daysLeft, invStatus } from '../components/saasui';
import { InvoiceView } from './SABilling';
import { MODULE_CATALOG, PAY_METHODS, methodLabel, planOf, limitTxt, effStatus } from '../data_saas';

export default function TenantBilling({ sess, out }) {
  const { SS, SA } = useContext(SaaS);
  const { lang } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
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
          <Empty text={isSw ? 'Akaunti ya biashara haijapatikana.' : 'Business account not found.'} />
          <button className="btn sm" style={{ marginTop: 12 }} onClick={out}>
            {isSw ? 'Rudi' : 'Back'}
          </button>
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
          <button className="sa-burger" style={{ color: '#fff' }} onClick={out}>
            {isSw ? '‹ Rudi' : '‹ Back'}
          </button>
          <div>
            <small style={{ color: '#cfe8df' }}>{t.name}</small>
            <h2 style={{ color: '#fff' }}>💳 {isSw ? 'Usajili na Malipo' : 'Subscription & Billing'}</h2>
          </div>
        </header>

        <div className="sa-body" style={{ maxWidth: 980, margin: '0 auto' }}>
          <div className="sa-tabs">
            {[
              ['plan',   isSw ? 'Mpango wangu' : 'My plan'],
              ['inv',    isSw ? `Ankara (${invs.length})` : `Invoices (${invs.length})`],
              ['change', isSw ? 'Badilisha kifurushi' : 'Change package'],
              ['help',   isSw ? `Msaada (${tickets.length})` : `Support (${tickets.length})`],
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
                    <small>{isSw ? 'Kifurushi cha sasa' : 'Current package'}</small>
                    <h2 style={{ margin: '2px 0' }}>
                      {plan ? plan.name : t.plan}{' '}
                      <small>· {t.cycle === 'yearly' ? (isSw ? 'kila mwaka' : 'yearly') : (isSw ? 'kila mwezi' : 'monthly')}</small>
                    </h2>
                  </div>
                  <Badge s={st} />
                </div>
                <div className="sa-kv" style={{ marginTop: 10 }}>
                  <div>
                    <small>{isSw ? 'Bei' : 'Price'}</small>
                    <b>{plan ? fmt(t.cycle === 'yearly' ? plan.priceY : plan.priceM) : '—'}</b>
                  </div>
                  {t.trialEnds
                    ? (
                      <div>
                        <small>{isSw ? 'Majaribio ya bure yanaisha' : 'Free trial ends'}</small>
                        <b>{dShort(t.trialEnds)} ({Math.max(0, daysLeft(t.trialEnds))} {isSw ? 'siku zimebaki' : 'days left'})</b>
                      </div>
                    )
                    : (
                      <div>
                        <small>{isSw ? 'Tarehe ijayo ya malipo' : 'Next billing date'}</small>
                        <b>{dShort(t.nextBilling)}</b>
                      </div>
                    )}
                </div>
                {st === 'pending' && (
                  <p className="sa-alert" style={{ background: '#fef9c3', color: '#854d0e' }}>
                    {isSw
                      ? 'Tunasubiri malipo yako ya kwanza yathibitishwe. Wasilisha namba ya kumbukumbu ya muamala chini ya Ankara.'
                      : 'We are waiting for your first payment to be confirmed. Submit the transaction reference under Invoices.'}
                  </p>
                )}
                {st === 'past_due' && (
                  <p className="sa-alert">
                    {isSw
                      ? 'Malipo yamechelewa. Tafadhali lipa ankara iliyobaki ili kuepuka kusimamishwa kwa huduma.'
                      : 'Payment is overdue. Please pay the outstanding invoice to avoid suspension.'}
                  </p>
                )}
                {st === 'expired' && (
                  <p className="sa-alert">
                    {isSw
                      ? 'Muda wako wa majaribio ya bure umeisha. Chagua kifurushi na ulipe ili kuendelea.'
                      : 'Your free trial has ended. Choose a package and pay to continue.'}
                  </p>
                )}
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <div className="sa-sec">{isSw ? 'Matumizi' : 'Usage'}</div>
                {plan && [
                  [isSw ? 'Matawi' : 'Outlets', t.outlets, plan.outlets],
                  [isSw ? 'Watumiaji wa wafanyakazi' : 'Staff users', t.users, plan.users],
                  [isSw ? 'Meza' : 'Tables', t.tables, plan.tables]
                ].map(([l, u, m]) => (
                  <div key={l} className="sa-usage">
                    <span>{l}</span>
                    <div className="bar"><i style={{ width: bar(u, m) + '%', background: bar(u, m) > 90 ? '#dc2626' : undefined }} /></div>
                    <small>{u} / {limitTxt(m)}</small>
                  </div>
                ))}
                <div className="sa-sep">{isSw ? 'Moduli kwenye kifurushi chako' : 'Modules in your package'}</div>
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
                  <tr>
                    <th>{isSw ? 'Ankara' : 'Invoice'}</th>
                    <th>{isSw ? 'Tarehe' : 'Date'}</th>
                    <th>{isSw ? 'Jumla' : 'Total'}</th>
                    <th>{isSw ? 'Hali' : 'Status'}</th>
                    <th style={{ textAlign: 'right' }}>{isSw ? 'Vitendo' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {invs.map(i => {
                    const pp = pendingFor(i.id);
                    return (
                      <tr key={i.id}>
                        <td>
                          <b>{i.no}</b><br />
                          <small>{i.planId} · {i.cycle === 'yearly' ? (isSw ? 'mwaka' : 'yearly') : (isSw ? 'mwezi' : 'monthly')}</small>
                        </td>
                        <td>{dShort(i.issuedAt)}</td>
                        <td>{fmt(i.total)}</td>
                        <td>{pp ? <PayBadge s="pending" /> : <Badge s={invStatus(i)} />}</td>
                        <td>
                          <div className="sa-rowacts">
                            <button title={isSw ? 'Tazama' : 'View'} onClick={() => setView(i)}>👁</button>
                            {i.status === 'unpaid' && !pp && (
                              <button className="btn sm" style={{ padding: '5px 10px' }} onClick={() => { setPay(i); setRef(''); }}>
                                {isSw ? 'Lipa sasa' : 'Pay now'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!invs.length && <tr><td colSpan="5"><Empty text={isSw ? 'Hakuna ankara bado' : 'No invoices yet'} /></td></tr>}
                </tbody>
              </table>

              {pays.length > 0 && (
                <div style={{ padding: 14 }}>
                  <div className="sa-sec">{isSw ? 'Historia ya malipo' : 'Payment history'}</div>
                  {pays.map(p => (
                    <div key={p.id} className="sa-log">
                      <b>{fmt(p.amount)} · {methodLabel(p.method)}</b> <PayBadge s={p.status} />
                      <small>{isSw ? 'Kumb' : 'Ref'} {p.ref || '—'} · {dTime(p.at)}{p.reason ? ' · ' + p.reason : ''}</small>
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
                  {isSw
                    ? 'Chagua kifurushi kipya. Ankara itatengenezwa; mabadiliko yatatumika mara malipo yako yatakapothibitishwa.'
                    : 'Choose a new package. An invoice is created; the change applies once your payment is confirmed.'}
                </small>
                <div className="seg" style={{ margin: 0 }}>
                  {['monthly', 'yearly'].map(c => (
                    <button key={c} className={cycle === c ? 'on' : ''} onClick={() => setCycle(c)}>
                      {c === 'yearly'
                        ? (isSw ? 'Kila mwaka (okoa miezi 2)' : 'Yearly (save 2 months)')
                        : (isSw ? 'Kila mwezi' : 'Monthly')}
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
                        {p.popular && <Badge s="active" label={isSw ? 'Maarufu' : 'Popular'} />}
                      </div>
                      <div className="sa-price">
                        {fmt(cycle === 'yearly' ? p.priceY : p.priceM)}
                        <small> / {cycle === 'yearly' ? (isSw ? 'mwaka' : 'year') : (isSw ? 'mwezi' : 'month')}</small>
                      </div>
                      <ul>{p.features.map(x => <li key={x}>{x}</li>)}</ul>
                      <button className="btn sm" disabled={cur} onClick={() => {
                        const inv = SA.createInvoice({ tenantId: t.id, planId: p.id, cycle, kind: 'plan-change' });
                        setTab('inv');
                        toast(isSw
                          ? `Ankara ${inv ? inv.no : ''} imetengenezwa. Ilipe ili kuhamia ${p.name}.`
                          : `Invoice ${inv ? inv.no : ''} created. Pay it to switch to ${p.name}.`);
                      }}>
                        {cur
                          ? (isSw ? 'Kifurushi cha sasa' : 'Current package')
                          : (isSw ? `Hamia ${p.name}` : `Switch to ${p.name}`)}
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
                <small style={{ flex: 1 }}>
                  {isSw
                    ? `Unahitaji msaada? Piga simu ${SS.settings.supportPhone} au fungua tiketi.`
                    : `Need help? Call ${SS.settings.supportPhone} or open a ticket.`}
                </small>
                <button className="btn sm" onClick={() => setTk({ subject: '', text: '', priority: 'normal' })}>
                  {isSw ? '＋ Tiketi mpya' : '＋ New ticket'}
                </button>
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
                    <ReplyBox
                      isSw={isSw}
                      onSend={txt => {
                        SA.replyTicket(k.id, 'tenant', sess.name, txt);
                        toast(isSw ? 'Jibu limetumwa' : 'Reply sent');
                      }}
                    />
                  )}
                </div>
              ))}
              {!tickets.length && <Empty icon="🎧" text={isSw ? 'Hakuna tiketi bado' : 'No tickets yet'} />}
            </>
          )}
        </div>
      </main>

      {/* ── Pay Now Sheet ── */}
      {pay && (() => {
        const c = pay;
        return (
          <Sheet
            title={(isSw ? 'Lipa ' : 'Pay ') + c.no}
            subtitle={fmt(c.total) + (isSw ? ' pamoja na VAT' : ' incl. VAT')}
            onClose={() => setPay(null)}
            maxWidth={480}
          >
            <div className="tags" style={{ marginTop: 0 }}>
              {PAY_METHODS.slice(0, 5).map(m => (
                <button key={m.id} className={method === m.id ? 'on' : ''} onClick={() => setMethod(m.id)}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
            <div className="sa-payinfo">
              <small>{isSw ? `Tuma ${fmt(c.total)} kwenda` : `Send ${fmt(c.total)} to`}</small>
              <b>{SS.settings.payInfo[method]}</b>
              <small>
                {isSw
                  ? <>Tumia <b>{c.no}</b> kama kumbukumbu ya malipo.</>
                  : <>Use <b>{c.no}</b> as the payment reference.</>}
              </small>
            </div>
            <Field label={isSw ? 'Namba ya Muamala / kumbukumbu kutoka risiti yako' : 'Transaction ID / reference from your receipt'}>
              <input className="inp" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. QK7H2P9LM1" />
            </Field>
            <p className="sa-note">
              {isSw
                ? 'Baada ya kutuma, timu yetu inathibitisha malipo (kawaida ndani ya saa chache) na kuwezesha akaunti yako.'
                : 'After you submit, our team verifies the payment (usually within a few hours) and activates your account.'}
            </p>
            <div className="sa-actions">
              <button className="btn ghost sm" onClick={() => setPay(null)}>
                {isSw ? 'Ghairi' : 'Cancel'}
              </button>
              <button className="btn sm" disabled={!ref.trim()} onClick={() => {
                SA.submitPayment(c.id, { method, ref: ref.trim() });
                toast(isSw ? 'Malipo yametumwa — yanasubiri uthibitisho' : 'Payment submitted — awaiting confirmation');
                setPay(null);
              }}>
                {isSw ? 'Nimelipa' : 'I have paid'}
              </button>
            </div>
          </Sheet>
        );
      })()}

      {view && <InvoiceView SS={SS} inv={view} onClose={() => setView(null)} />}

      {/* ── New Ticket Sheet ── */}
      {tk && (
        <Sheet title={isSw ? 'Tiketi mpya ya msaada' : 'New support ticket'} onClose={() => setTk(null)} maxWidth={480}>
          <Field label={isSw ? 'Mada' : 'Subject'}>
            <input className="inp" value={tk.subject} onChange={e => setTk({ ...tk, subject: e.target.value })} />
          </Field>
          <Field label={isSw ? 'Tunawezaje kukusaidia?' : 'How can we help?'}>
            <textarea className="inp" rows={4} value={tk.text} onChange={e => setTk({ ...tk, text: e.target.value })} />
          </Field>
          <Field label={isSw ? 'Kipaumbele' : 'Priority'}>
            <select className="inp" value={tk.priority} onChange={e => setTk({ ...tk, priority: e.target.value })}>
              <option value="low">{isSw ? 'Chini' : 'Low'}</option>
              <option value="normal">{isSw ? 'Kawaida' : 'Normal'}</option>
              <option value="high">{isSw ? 'Juu — biashara imesimama' : 'High — business stopped'}</option>
            </select>
          </Field>
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={() => setTk(null)}>
              {isSw ? 'Ghairi' : 'Cancel'}
            </button>
            <button className="btn sm"
              disabled={!tk.subject.trim() || !tk.text.trim()}
              onClick={() => {
                SA.createTicket(t.id, tk.subject.trim(), tk.text.trim(), sess.name, tk.priority);
                toast(isSw ? 'Tiketi imetumwa' : 'Ticket sent'); setTk(null);
              }}>
              {isSw ? 'Tuma' : 'Submit'}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function ReplyBox({ onSend, isSw }) {
  const [v, setV] = useState('');
  return (
    <div className="sa-toolbar" style={{ marginTop: 8 }}>
      <input
        className="inp"
        placeholder={isSw ? 'Andika jibu…' : 'Write a reply…'}
        value={v}
        onChange={e => setV(e.target.value)}
      />
      <button className="btn ghost sm" disabled={!v.trim()} onClick={() => { onSend(v.trim()); setV(''); }}>
        {isSw ? 'Tuma' : 'Send'}
      </button>
    </div>
  );
}
