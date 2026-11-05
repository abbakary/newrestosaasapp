import React, { useState, useContext, useEffect, useRef } from 'react';
import { Sheet } from '../components/ui';
import { fmt } from '../data';
import { Ctx } from '../store';
import { SaaS } from '../saasStore';
import { Badge, Field, Stat, Empty, Confirm, Bars, dShort, dTime, daysLeft, invStatus } from '../components/saasui';
import { MODULE_CATALOG, planOf, periodPrice, limitTxt, effStatus, methodLabel, PAY_METHODS, uid } from '../data_saas';
import { Tenants } from './SATenants';
import { Billing } from './SABilling';

const PERMS = {
  superadmin: ['tenants', 'tenants_view', 'billing', 'plans', 'support', 'announce', 'team', 'audit', 'settings'],
  billing:    ['billing', 'tenants_view'],
  support:    ['support', 'tenants_view'],
};

/* ─── Overview ─────────────────────────────────────────── */
function Overview({ SS, SA, can, toast, go, isSw }) {
  const live = SS.tenants.filter(t => ['active', 'past_due'].includes(t.status));
  const mrr  = live.reduce((a, t) => {
    const p = planOf(SS.plans, t.plan);
    return a + (p ? (t.cycle === 'yearly' ? p.priceY / 12 : p.priceM) : 0);
  }, 0);

  const cnt   = s => SS.tenants.filter(t => effStatus(t) === s).length;
  const conf  = SS.payments.filter(p => p.status === 'confirmed');
  const months = [5, 4, 3, 2, 1, 0].map(off => {
    const d = new Date();
    const m = new Date(d.getFullYear(), d.getMonth() - off, 1);
    const e = new Date(d.getFullYear(), d.getMonth() - off + 1, 1);
    return {
      label: m.toLocaleString(isSw ? 'sw' : 'en', { month: 'short' }),
      value: conf.filter(p => p.at >= m && p.at < e).reduce((a, p) => a + p.amount, 0),
    };
  });

  const pend         = SS.payments.filter(p => p.status === 'pending');
  const trialsEnding = SS.tenants.filter(t => t.status === 'trial' && t.trialEnds && daysLeft(t.trialEnds) <= 3);
  const overdue      = SS.invoices.filter(i => invStatus(i) === 'overdue');
  const openTk       = SS.tickets.filter(k => k.status === 'open').length;
  const tn           = id => (SS.tenants.find(t => t.id === id) || {}).name || '';
  const recent       = [...SS.tenants].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const dist         = SS.plans.map(p => ({ p, n: SS.tenants.filter(t => t.plan === p.id && t.status !== 'cancelled').length }));

  return (
    <>
      <div className="sa-statrow">
        <Stat icon="💵" label={isSw ? 'Mapato ya kila mwezi (MRR)' : 'Monthly recurring revenue'} value={fmt(mrr)}                         sub={'ARR ' + fmt(mrr * 12)}           color="#0E5A47" />
        <Stat icon="🏪" label={isSw ? 'Wapangaji hai' : 'Active tenants'}            value={cnt('active')}                    sub={`${SS.tenants.length} ${isSw ? 'jumla' : 'total'}`}     color="#15803d" />
        <Stat icon="⏳" label={isSw ? 'Kwenye majaribio ya bure' : 'On free trial'}             value={cnt('trial')}                     sub={trialsEnding.length + (isSw ? ' yanaisha karibuni' : ' ending soon')} color="#1d4ed8" />
        <Stat icon="⚠️" label={isSw ? 'Imechelewa / Imesimamishwa' : 'Past due / suspended'}     value={cnt('past_due') + cnt('suspended')} sub={overdue.length + (isSw ? ' ankara zilizochelewa' : ' overdue invoices')} color="#b91c1c" />
      </div>

      <div className="sa-grid2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="sa-sec">{isSw ? 'Mapato yaliyokusanywa (miezi 6)' : 'Revenue collected (6 months)'}</div>
          <Bars data={months} fmtV={v => Math.round(v / 1000) + 'k'} />
        </div>
        <div className="card">
          <div className="sa-sec">{isSw ? 'Wapangaji kwa kila kifurushi' : 'Tenants per package'}</div>
          {dist.map(({ p, n }) => (
            <div key={p.id} className="sa-usage">
              <span>{p.name}</span>
              <div className="bar"><i style={{ width: (n / Math.max(1, SS.tenants.length)) * 100 + '%' }} /></div>
              <small>{n}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="sa-sec" style={{ marginTop: 16 }}>{isSw ? 'Yanahitaji umakini wako' : 'Needs your attention'}</div>
      <div className="card">
        {!pend.length && !trialsEnding.length && !overdue.length && !openTk
          ? <Empty icon="🎉" text={isSw ? 'Kila kitu kiko sawa — hakuna kinachohitaji hatua.' : 'All clear — nothing needs action.'} />
          : null}

        {pend.map(p => (
          <div key={p.id} className="sa-prow">
            <div>
              <b>💳 {isSw ? 'Malipo ya kuthibitisha' : 'Payment to confirm'}</b><br />
              <small>{tn(p.tenantId)} · {methodLabel(p.method)} · {isSw ? 'kumb' : 'ref'} {p.ref || (isSw ? 'hakuna' : 'none')}</small>
            </div>
            <div className="sa-prow-r">
              <b>{fmt(p.amount)}</b>
              {can('billing') && (
                <button className="btn sm" onClick={() => { SA.confirmPayment(p.id); toast(isSw ? 'Malipo yamethibitishwa' : 'Payment confirmed'); }}>
                  {isSw ? '✓ Thibitisha' : '✓ Confirm'}
                </button>
              )}
            </div>
          </div>
        ))}

        {trialsEnding.map(t => (
          <div key={t.id} className="sa-prow">
            <div>
              <b>⏳ {isSw ? 'Majaribio yanaisha' : 'Trial ending'}</b><br />
              <small>{t.name} · {daysLeft(t.trialEnds)} {isSw ? 'siku zimebaki' : 'day(s) left'}</small>
            </div>
            <div className="sa-prow-r">
              {can('tenants') && (
                <button className="btn ghost sm" onClick={() => { SA.extendTrial(t.id, 7); toast(isSw ? 'Majaribio yameongezwa siku 7' : 'Trial extended 7 days'); }}>
                  {isSw ? '+7 siku' : '+7 days'}
                </button>
              )}
            </div>
          </div>
        ))}

        {overdue.map(i => (
          <div key={i.id} className="sa-prow">
            <div>
              <b>🚨 {isSw ? `Ankara iliyochelewa ${i.no}` : `Overdue invoice ${i.no}`}</b><br />
              <small>{tn(i.tenantId)} · {isSw ? 'mwisho' : 'due'} {dShort(i.dueAt)}</small>
            </div>
            <div className="sa-prow-r">
              <b>{fmt(i.total)}</b>
              {can('billing') && (
                <button className="btn ghost sm" onClick={() => { SA.remind(i.id); toast(isSw ? 'Ukumbusho umetumwa' : 'Reminder sent'); }}>
                  🔔 {isSw ? 'Kumbusha' : 'Remind'}
                </button>
              )}
            </div>
          </div>
        ))}

        {openTk > 0 && (
          <div className="sa-prow">
            <div><b>🎧 {isSw ? `Tiketi ${openTk} za msaada zilizo wazi` : `${openTk} open support ticket(s)`}</b></div>
            {can('support') && (
              <button className="btn ghost sm" onClick={() => go('support')}>
                {isSw ? 'Fungua kikasha' : 'Open inbox'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="sa-sec" style={{ marginTop: 16 }}>{isSw ? 'Waliojisajili hivi karibuni' : 'Latest sign-ups'}</div>
      <div className="card sa-scroll" style={{ padding: 0 }}>
        <table className="sa-table">
          <tbody>
            {recent.map(t => (
              <tr key={t.id}>
                <td><b>{t.name}</b><br /><small>{t.city}</small></td>
                <td>{planOf(SS.plans, t.plan)?.name}</td>
                <td><Badge s={effStatus(t)} /></td>
                <td><small>{dShort(t.createdAt)} · {t.source === 'wizard' ? (isSw ? 'alijisajili mwenyewe' : 'self-registered') : (isSw ? 'msimamizi' : 'admin')}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─── Plans ─────────────────────────────────────────────── */
function PlanForm({ SS, SA, p, onClose, toast, isSw }) {
  const isNew = !p;
  const [f, setF] = useState(
    p
      ? { ...p, featuresTxt: p.features.join('\n') }
      : { id: '', name: '', tag: '', priceM: 0, priceY: 0, outlets: 1, users: 5, tables: 10, trialDays: 14, popular: false, active: true, modules: ['pos'], featuresTxt: '' }
  );
  const [err, setErr] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const num = k => <input className="inp" type="number" value={f[k]} onChange={e => set(k, Number(e.target.value))} />;

  const save = () => {
    if (!f.name.trim()) return setErr(isSw ? 'Jina la kifurushi linahitajika.' : 'Package name is required.');
    const id = isNew ? f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : f.id;
    if (isNew && SS.plans.some(x => x.id === id)) return setErr(isSw ? 'Kifurushi chenye jina hili tayari kipo.' : 'A package with this name already exists.');
    const { featuresTxt, ...rest } = f;
    SA.savePlan({ ...rest, id, features: featuresTxt.split('\n').map(x => x.trim()).filter(Boolean) });
    toast(isSw ? 'Kifurushi kimehifadhiwa' : 'Package saved'); onClose();
  };

  return (
    <Sheet title={isNew ? (isSw ? 'Kifurushi kipya' : 'New package') : (isSw ? 'Hariri ' : 'Edit ') + p.name} onClose={onClose} maxWidth={680}>
      <div className="sa-grid2">
        <Field label={isSw ? 'Jina la kifurushi' : 'Package name'}><input className="inp" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label={isSw ? 'Kauli mbiu' : 'Tagline'}><input className="inp" value={f.tag} onChange={e => set('tag', e.target.value)} /></Field>
        <Field label={isSw ? 'Bei ya mwezi (TSh, bila VAT)' : 'Monthly price (TSh, excl. VAT)'}>{num('priceM')}</Field>
        <Field label={isSw ? 'Bei ya mwaka (TSh, bila VAT)' : 'Yearly price (TSh, excl. VAT)'}>{num('priceY')}</Field>
        <Field label={isSw ? 'Matawi' : 'Outlets'} hint={isSw ? '-1 = bila kikomo' : '-1 = unlimited'}>{num('outlets')}</Field>
        <Field label={isSw ? 'Watumiaji wa wafanyakazi' : 'Staff users'} hint={isSw ? '-1 = bila kikomo' : '-1 = unlimited'}>{num('users')}</Field>
        <Field label={isSw ? 'Meza' : 'Tables'} hint={isSw ? '-1 = bila kikomo' : '-1 = unlimited'}>{num('tables')}</Field>
        <Field label={isSw ? 'Majaribio ya bure (siku)' : 'Free trial (days)'}>{num('trialDays')}</Field>
      </div>
      <div className="sa-sep">{isSw ? 'Moduli zilizojumuishwa' : 'Modules included'}</div>
      <div className="sa-chips">
        {MODULE_CATALOG.map(m => (
          <button key={m.id}
            className={'sa-chip' + (f.modules.includes(m.id) ? ' on' : '')}
            onClick={() => set('modules', f.modules.includes(m.id) ? f.modules.filter(x => x !== m.id) : [...f.modules, m.id])}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>
      <Field label={isSw ? 'Vipengele (kimoja kwa kila mstari)' : 'Features (one per line)'}>
        <textarea className="inp" rows={4} value={f.featuresTxt} onChange={e => set('featuresTxt', e.target.value)} />
      </Field>
      <label className="sa-check">
        <input type="checkbox" checked={f.popular} onChange={e => set('popular', e.target.checked)} />{' '}
        {isSw ? 'Angazia kama "Maarufu zaidi"' : 'Highlight as "Most popular"'}
      </label>
      <label className="sa-check">
        <input type="checkbox" checked={f.active}  onChange={e => set('active',  e.target.checked)} />{' '}
        {isSw ? 'Inapatikana kwa usajili mpya' : 'Available for new sign-ups'}
      </label>
      {err && <p className="err">{err}</p>}
      <div className="sa-actions">
        <button className="btn ghost sm" onClick={onClose}>{isSw ? 'Ghairi' : 'Cancel'}</button>
        <button className="btn sm" onClick={save}>{isSw ? 'Hifadhi kifurushi' : 'Save package'}</button>
      </div>
    </Sheet>
  );
}

function Plans({ SS, SA, can, toast, isSw }) {
  const [form, setForm] = useState(null);
  const [del,  setDel]  = useState(null);
  return (
    <>
      <div className="sa-toolbar">
        <span style={{ flex: 1 }}>
          <small>
            {isSw
              ? 'Vifurushi unavyochapisha hapa vinaonekana kwenye ukurasa wa bei wa umma na kwenye usajili.'
              : 'Packages you publish here appear on the public pricing page and in the sign-up wizard.'}
          </small>
        </span>
        {can('plans') && (
          <button className="btn sm" onClick={() => setForm({})}>
            {isSw ? '＋ Kifurushi kipya' : '＋ New package'}
          </button>
        )}
      </div>
      <div className="sa-cards">
        {SS.plans.map(p => {
          const used = SS.tenants.filter(t => t.plan === p.id && t.status !== 'cancelled').length;
          return (
            <div key={p.id} className="card sa-plan">
              <div className="row">
                <b style={{ fontSize: 19 }}>{p.name}</b>
                <span>
                  {p.popular && <Badge s="active" label={isSw ? 'Maarufu' : 'Popular'} />}{' '}
                  {!p.active && <Badge s="void" label={isSw ? 'Imefichwa' : 'Hidden'} />}
                </span>
              </div>
              <small>{p.tag}</small>
              <div className="sa-price">{fmt(p.priceM)}<small> / {isSw ? 'mwezi' : 'month'}</small></div>
              <small>{fmt(p.priceY)} / {isSw ? 'mwaka' : 'year'}</small>
              <ul>
                {[
                  `${limitTxt(p.outlets)} ${isSw ? 'matawi' : 'outlets'}`,
                  `${limitTxt(p.users)} ${isSw ? 'watumiaji' : 'users'}`,
                  `${limitTxt(p.tables)} ${isSw ? 'meza' : 'tables'}`,
                  `${p.modules.length} ${isSw ? 'moduli' : 'modules'}`,
                  isSw ? `Majaribio ya bure ya siku ${p.trialDays}` : `${p.trialDays}-day free trial`
                ].map(x => <li key={x}>{x}</li>)}
              </ul>
              <small>{used} {isSw ? 'mpangaji/wapangaji wamejisajili' : 'tenant(s) subscribed'}</small>
              {can('plans') && (
                <div className="sa-actions" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
                  <button className="btn ghost sm" onClick={() => setForm({ p })}>✏️ {isSw ? 'Hariri' : 'Edit'}</button>
                  <button className="btn ghost sm" onClick={() => { SA.savePlan({ ...p, active: !p.active }); toast(p.active ? (isSw ? 'Kifurushi kimefichwa' : 'Package hidden') : (isSw ? 'Kifurushi kimechapishwa' : 'Package published')); }}>
                    {p.active ? (isSw ? '🙈 Ficha' : '🙈 Hide') : (isSw ? '👁 Chapisha' : '👁 Publish')}
                  </button>
                  <button className="btn ghost sm" disabled={used > 0} title={used ? (isSw ? 'Ina wateja hai' : 'Has active subscribers') : ''} onClick={() => setDel(p)}>🗑</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {form && <PlanForm SS={SS} SA={SA} p={form.p} toast={toast} isSw={isSw} onClose={() => setForm(null)} />}
      {del && (
        <Confirm
          danger
          title={isSw ? 'Futa kifurushi?' : 'Delete package?'}
          yes={isSw ? 'Futa' : 'Delete'}
          msg={isSw ? `Ondoa kifurushi cha ${del.name} kabisa?` : `Remove the ${del.name} package permanently?`}
          onNo={() => setDel(null)}
          onYes={() => { SA.deletePlan(del.id); toast(isSw ? 'Kifurushi kimefutwa' : 'Package deleted'); setDel(null); }}
        />
      )}
    </>
  );
}

/* ─── Support ────────────────────────────────────────────── */
function Support({ SS, SA, sess, can, toast, isSw }) {
  const [open, setOpen] = useState(null);
  const [fs,   setFs]   = useState('all');
  const [txt,  setTxt]  = useState('');
  const k  = SS.tickets.find(x => x.id === open);
  const tn = id => (SS.tenants.find(t => t.id === id) || {}).name || '(deleted)';
  const rows = SS.tickets.filter(x => fs === 'all' || x.status === fs);

  return (
    <>
      <div className="sa-pills">
        {[
          ['all', isSw ? 'Zote' : 'All'],
          ['open', isSw ? 'Wazi' : 'Open'],
          ['pending', isSw ? 'Inasubiri' : 'Pending'],
          ['resolved', isSw ? 'Imetatuliwa' : 'Resolved'],
          ['closed', isSw ? 'Imefungwa' : 'Closed']
        ].map(([s, lbl]) => (
          <button key={s} className={fs === s ? 'on' : ''} onClick={() => setFs(s)}>
            {lbl}{' '}
            <b>{s === 'all' ? SS.tickets.length : SS.tickets.filter(x => x.status === s).length}</b>
          </button>
        ))}
      </div>
      <div className="card sa-scroll" style={{ padding: 0 }}>
        <table className="sa-table">
          <thead>
            <tr>
              <th>{isSw ? 'Tiketi' : 'Ticket'}</th>
              <th>{isSw ? 'Mpangaji' : 'Tenant'}</th>
              <th>{isSw ? 'Kipaumbele' : 'Priority'}</th>
              <th>{isSw ? 'Hali' : 'Status'}</th>
              <th>{isSw ? 'Imesasishwa' : 'Updated'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(x => (
              <tr key={x.id}>
                <td>
                  <b style={{ cursor: 'pointer', color: 'var(--g)' }} onClick={() => setOpen(x.id)}>{x.subject}</b>
                  <br /><small>{x.msgs.length} {isSw ? 'ujumbe' : 'message(s)'}</small>
                </td>
                <td>{tn(x.tenantId)}</td>
                <td><Badge s={x.priority} /></td>
                <td><Badge s={x.status} /></td>
                <td><small>{dTime(x.msgs[x.msgs.length - 1].at)}</small></td>
                <td><button className="sa-link" onClick={() => setOpen(x.id)}>{isSw ? 'Fungua' : 'Open'}</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="6"><Empty icon="🎧" text={isSw ? 'Hakuna tiketi' : 'No tickets'} /></td></tr>}
          </tbody>
        </table>
      </div>

      {k && (
        <Sheet title={k.subject} subtitle={tn(k.tenantId)} onClose={() => setOpen(null)} maxWidth={620} extraHeader={<Badge s={k.status} />}>
          <div className="sa-thread">
            {k.msgs.map((m, i) => (
              <div key={i} className={'sa-msg ' + m.from}>
                <small>{m.name} · {dTime(m.at)}</small>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          {can('support') && (
            <>
              <textarea
                className="inp"
                rows={3}
                placeholder={isSw ? 'Andika jibu…' : 'Write a reply…'}
                value={txt}
                onChange={e => setTxt(e.target.value)}
              />
              <div className="sa-actions">
                <select className="inp" style={{ width: 'auto' }} value={k.priority} onChange={e => SA.setTicket(k.id, { priority: e.target.value })}>
                  {['low', 'normal', 'high'].map(p => <option key={p}>{p}</option>)}
                </select>
                {k.status !== 'resolved' && (
                  <button className="btn ghost sm" onClick={() => { SA.setTicket(k.id, { status: 'resolved' }); toast(isSw ? 'Tiketi imetatuliwa' : 'Ticket resolved'); }}>
                    {isSw ? '✓ Tatua' : '✓ Resolve'}
                  </button>
                )}
                {k.status === 'resolved' && (
                  <button className="btn ghost sm" onClick={() => SA.setTicket(k.id, { status: 'open' })}>
                    {isSw ? 'Fungua tena' : 'Re-open'}
                  </button>
                )}
                <button className="btn sm" disabled={!txt.trim()} onClick={() => {
                  SA.replyTicket(k.id, 'admin', sess.name, txt.trim());
                  setTxt(''); toast(isSw ? 'Jibu limetumwa' : 'Reply sent');
                }}>
                  {isSw ? 'Tuma jibu' : 'Send reply'}
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

/* ─── Announcements ─────────────────────────────────────── */
function Announcements({ SS, SA, can, toast, isSw }) {
  const [f,   setF]   = useState(null);
  const [del, setDel] = useState(null);
  return (
    <>
      <div className="sa-toolbar">
        <span style={{ flex: 1 }}>
          <small>
            {isSw
              ? 'Matangazo hai yanaonekana kama bango kwa wamiliki na mameneja wa wapangaji.'
              : 'Active announcements show as a banner to tenant owners and managers.'}
          </small>
        </span>
        {can('announce') && (
          <button className="btn sm" onClick={() => setF({ id: uid('a'), title: '', body: '', type: 'info', audience: 'all', active: true })}>
            {isSw ? '＋ Tangazo jipya' : '＋ New'}
          </button>
        )}
      </div>
      {SS.announcements.map(a => (
        <div key={a.id} className="card sa-prow" style={{ marginBottom: 8 }}>
          <div>
            <b>{a.type === 'warning' ? '⚠️' : a.type === 'success' ? '🎉' : 'ℹ️'} {a.title}</b>
            {!a.active && <Badge s="void" label={isSw ? 'Zima' : 'Off'} />}
            <br /><small>{a.body}</small>
            <br /><small>{isSw ? 'Kwa:' : 'To:'} {a.audience === 'all' ? (isSw ? 'wapangaji wote' : 'all tenants') : a.audience + (isSw ? ' kifurushi' : ' plan')} · {dShort(a.at)}</small>
          </div>
          {can('announce') && (
            <div className="sa-rowacts">
              <button title={isSw ? 'Hariri' : 'Edit'}   onClick={() => setF(a)}>✏️</button>
              <button title={a.active ? (isSw ? 'Zima' : 'Turn off') : (isSw ? 'Washa' : 'Turn on')} onClick={() => SA.saveAnnouncement({ ...a, active: !a.active })}>{a.active ? '⏸' : '▶️'}</button>
              <button title={isSw ? 'Futa' : 'Delete'} onClick={() => setDel(a)}>🗑</button>
            </div>
          )}
        </div>
      ))}
      {!SS.announcements.length && <Empty icon="📣" text={isSw ? 'Hakuna matangazo' : 'No announcements'} />}

      {f && (
        <Sheet title={isSw ? 'Tangazo' : 'Announcement'} onClose={() => setF(null)} maxWidth={520}>
          <Field label={isSw ? 'Kichwa' : 'Title'}><input className="inp" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
          <Field label={isSw ? 'Ujumbe' : 'Message'}><textarea className="inp" rows={3} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} /></Field>
          <div className="sa-grid2">
            <Field label={isSw ? 'Aina' : 'Type'}>
              <select className="inp" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
                <option value="info">{isSw ? 'Taarifa' : 'Information'}</option>
                <option value="warning">{isSw ? 'Onyo' : 'Warning'}</option>
                <option value="success">{isSw ? 'Habari njema' : 'Good news'}</option>
              </select>
            </Field>
            <Field label={isSw ? 'Walengwa' : 'Audience'}>
              <select className="inp" value={f.audience} onChange={e => setF({ ...f, audience: e.target.value })}>
                <option value="all">{isSw ? 'Wapangaji wote' : 'All tenants'}</option>
                {SS.plans.map(p => <option key={p.id} value={p.id}>{isSw ? `Kifurushi cha ${p.name} pekee` : `${p.name} plan only`}</option>)}
              </select>
            </Field>
          </div>
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={() => setF(null)}>{isSw ? 'Ghairi' : 'Cancel'}</button>
            <button className="btn sm" disabled={!f.title.trim()} onClick={() => { SA.saveAnnouncement(f); toast(isSw ? 'Tangazo limechapishwa' : 'Announcement published'); setF(null); }}>
              {isSw ? 'Chapisha' : 'Publish'}
            </button>
          </div>
        </Sheet>
      )}
      {del && <Confirm danger title={isSw ? 'Futa tangazo?' : 'Delete announcement?'} yes={isSw ? 'Futa' : 'Delete'} msg={del.title} onNo={() => setDel(null)} onYes={() => { SA.deleteAnnouncement(del.id); setDel(null); }} />}
    </>
  );
}

/* ─── Team ──────────────────────────────────────────────── */
function Team({ SS, SA, sess, can, toast, isSw }) {
  const [f,   setF]   = useState(null);
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');

  const save = () => {
    if (!f.name.trim() || !/^0[67]\d{8}$/.test(f.ph) || f.pw.length < 4) {
      return setErr(isSw ? 'Jina, namba sahihi ya simu (0712345678) na nenosiri la herufi 4+ vinahitajika.' : 'Name, a valid phone (0712345678) and a 4+ character password are required.');
    }
    if (SS.admins.some(a => a.ph === f.ph && a.id !== f.id)) return setErr(isSw ? 'Namba hiyo ya simu tayari inatumika.' : 'That phone is already in use.');
    SA.saveAdmin({ ...f, title: { superadmin: 'Super Admin', billing: 'Billing & Collections', support: 'Customer Support' }[f.role] });
    toast(isSw ? 'Mwanachama wa timu amehifadhiwa' : 'Team member saved'); setF(null); setErr('');
  };

  return (
    <>
      <div className="sa-toolbar">
        <span style={{ flex: 1 }}>
          <small>
            {isSw
              ? <><b>Super Admin</b> — kila kitu · <b>Malipo</b> — malipo na ankara · <b>Msaada</b> — tiketi na wapangaji</>
              : <><b>Super Admin</b> — everything · <b>Billing</b> — payments &amp; invoices · <b>Support</b> — tickets &amp; tenant view</>}
          </small>
        </span>
        {can('team') && (
          <button className="btn sm" onClick={() => { setErr(''); setF({ id: uid('adm'), name: '', ph: '', email: '', pw: '', role: 'support', active: true }); }}>
            {isSw ? '＋ Ongeza mwanachama' : '＋ Add member'}
          </button>
        )}
      </div>
      <div className="card sa-scroll" style={{ padding: 0 }}>
        <table className="sa-table">
          <thead>
            <tr>
              <th>{isSw ? 'Jina' : 'Name'}</th>
              <th>{isSw ? 'Simu' : 'Phone'}</th>
              <th>{isSw ? 'Wadhifa' : 'Role'}</th>
              <th>{isSw ? 'Hali' : 'Status'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {SS.admins.map(a => (
              <tr key={a.id}>
                <td><b>{a.name}</b><br /><small>{a.email}</small></td>
                <td>{a.ph}</td>
                <td>{a.role}</td>
                <td><Badge s={a.active ? 'active' : 'suspended'} label={a.active ? (isSw ? 'Hai' : 'Active') : (isSw ? 'Imezimwa' : 'Disabled')} /></td>
                <td>
                  {can('team') && (
                    <div className="sa-rowacts">
                      <button title={isSw ? 'Hariri' : 'Edit'} onClick={() => { setErr(''); setF(a); }}>✏️</button>
                      {a.id !== sess.id && <button title={a.active ? (isSw ? 'Zima' : 'Disable') : (isSw ? 'Washa' : 'Enable')} onClick={() => SA.saveAdmin({ ...a, active: !a.active })}>{a.active ? '⏸' : '▶️'}</button>}
                      {a.id !== sess.id && <button title={isSw ? 'Ondoa' : 'Remove'} onClick={() => setDel(a)}>🗑</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {f && (
        <Sheet title={isSw ? 'Mwanachama wa timu' : 'Team member'} onClose={() => setF(null)} maxWidth={480}>
          <Field label={isSw ? 'Jina kamili' : 'Full name'}><input className="inp" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
          <div className="sa-grid2">
            <Field label={isSw ? 'Simu (kuingia)' : 'Phone (login)'}><input className="inp" inputMode="tel" value={f.ph} onChange={e => setF({ ...f, ph: e.target.value.replace(/\s/g, '') })} /></Field>
            <Field label={isSw ? 'Barua pepe' : 'Email'}><input className="inp" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
            <Field label={isSw ? 'Nenosiri' : 'Password'}><input className="inp" value={f.pw} onChange={e => setF({ ...f, pw: e.target.value })} /></Field>
            <Field label={isSw ? 'Wadhifa' : 'Role'}>
              <select className="inp" value={f.role} disabled={f.id === sess.id} onChange={e => setF({ ...f, role: e.target.value })}>
                <option value="superadmin">Super Admin</option>
                <option value="billing">{isSw ? 'Malipo (Billing)' : 'Billing'}</option>
                <option value="support">{isSw ? 'Msaada (Support)' : 'Support'}</option>
              </select>
            </Field>
          </div>
          {err && <p className="err">{err}</p>}
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={ () => setF(null) }>{isSw ? 'Ghairi' : 'Cancel'}</button>
            <button className="btn sm" onClick={save}>{isSw ? 'Hifadhi' : 'Save'}</button>
          </div>
        </Sheet>
      )}
      {del && (
        <Confirm
          danger
          title={isSw ? 'Ondoa mwanachama wa timu?' : 'Remove team member?'}
          yes={isSw ? 'Ondoa' : 'Remove'}
          msg={isSw ? `${del.name} atapoteza uwezo wa kuingia kwenye dashibodi.` : `${del.name} will lose access to the console.`}
          onNo={() => setDel(null)}
          onYes={() => { SA.deleteAdmin(del.id); setDel(null); toast(isSw ? 'Mwanachama ameondolewa' : 'Member removed'); }}
        />
      )}
    </>
  );
}

/* ─── Audit ─────────────────────────────────────────────── */
function Audit({ SS, isSw }) {
  const [q, setQ] = useState('');
  const rows = SS.audit.filter(a => !q || (a.action + a.target + a.by).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="sa-toolbar">
        <input
          className="inp"
          placeholder={isSw ? 'Chuja kwa kitendo, mpangaji au mtu…' : 'Filter by action, tenant or person…'}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      <div className="card">
        {rows.map(a => (
          <div key={a.id} className="sa-log">
            <b>{a.action}</b>{a.target && <span> · {a.target}</span>}
            <small>{a.by} · {dTime(a.at)}</small>
          </div>
        ))}
        {!rows.length && <Empty text={isSw ? 'Hakuna maingizo' : 'No entries'} />}
      </div>
    </>
  );
}

/* ─── Settings ──────────────────────────────────────────── */
function Settings({ SS, SA, can, toast, onReset, isSw }) {
  const [f,     setF]     = useState({ ...SS.settings });
  const [promo, setPromo] = useState({ code: '', pct: 10 });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const ro  = !can('settings');

  return (
    <>
      <div className="card">
        <div className="sa-sec">{isSw ? 'Jukwaa' : 'Platform'}</div>
        <div className="sa-grid2">
          <Field label={isSw ? 'Jina la jukwaa' : 'Platform name'}><input className="inp" disabled={ro} value={f.platformName} onChange={e => set('platformName', e.target.value)} /></Field>
          <Field label={isSw ? 'Kikoa cha mpangaji' : 'Tenant domain'} hint={isSw ? `Tovuti za wapangaji: jina.${f.domain}` : `Tenant sites: name.${f.domain}`}><input className="inp" disabled={ro} value={f.domain} onChange={e => set('domain', e.target.value)} /></Field>
          <Field label={isSw ? 'Simu ya msaada' : 'Support phone'}><input className="inp" disabled={ro} value={f.supportPhone} onChange={e => set('supportPhone', e.target.value)} /></Field>
          <Field label={isSw ? 'Barua pepe ya msaada' : 'Support email'}><input className="inp" disabled={ro} value={f.supportEmail} onChange={e => set('supportEmail', e.target.value)} /></Field>
          <Field label={isSw ? 'VAT kwenye usajili (%)' : 'VAT on subscriptions (%)'}><input className="inp" type="number" disabled={ro} value={f.vatPct} onChange={e => set('vatPct', Number(e.target.value))} /></Field>
          <Field label={isSw ? 'Muda wa kulipa ankara (siku)' : 'Invoice due after (days)'}><input className="inp" type="number" disabled={ro} value={f.invoiceDueDays} onChange={e => set('invoiceDueDays', Number(e.target.value))} /></Field>
          <Field label={isSw ? 'Muda wa neema kabla ya kusimamisha (siku)' : 'Grace period before auto-suspend (days)'}><input className="inp" type="number" disabled={ro} value={f.graceDays} onChange={e => set('graceDays', Number(e.target.value))} /></Field>
        </div>
        <label className="sa-check">
          <input type="checkbox" disabled={ro} checked={f.autoSuspend} onChange={e => set('autoSuspend', e.target.checked)} />{' '}
          {isSw ? 'Simamisha kiotomatiki baada ya muda wa neema' : 'Auto-suspend after grace period'}
        </label>
        <label className="sa-check">
          <input type="checkbox" disabled={ro} checked={f.registrationOpen} onChange={e => set('registrationOpen', e.target.checked)} />{' '}
          {isSw ? 'Fungua usajili (usajili wa umma)' : 'Open registration (public sign-up)'}
        </label>
        <label className="sa-check">
          <input type="checkbox" disabled={ro} checked={f.maintenance} onChange={e => set('maintenance', e.target.checked)} />{' '}
          {isSw ? 'Hali ya matengenezo (wasimamizi pekee wanaweza kuingia)' : 'Maintenance mode (only admins can sign in)'}
        </label>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="sa-sec">{isSw ? 'Mahali wapangaji wanakulipa' : 'Where tenants pay you'}</div>
        {PAY_METHODS.map(m => (
          <Field key={m.id} label={m.icon + ' ' + m.label}>
            <input className="inp" disabled={ro} value={f.payInfo[m.id] || ''} onChange={e => set('payInfo', { ...f.payInfo, [m.id]: e.target.value })} />
          </Field>
        ))}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="sa-sec">{isSw ? 'Namba za ofa (Promo codes)' : 'Promo codes'}</div>
        {f.promos.map(p => (
          <div key={p.code} className="sa-prow">
            <div>
              <b>{p.code}</b> — {isSw ? `punguzo la ${p.pct}% kwenye ankara ya kwanza` : `${p.pct}% off first invoice`}{' '}
              {!p.active && <Badge s="void" label={isSw ? 'Zima' : 'Off'} />}
            </div>
            {!ro && (
              <div className="sa-rowacts">
                <button onClick={() => set('promos', f.promos.map(x => x.code === p.code ? { ...x, active: !x.active } : x))}>{p.active ? '⏸' : '▶️'}</button>
                <button onClick={() => set('promos', f.promos.filter(x => x.code !== p.code))}>🗑</button>
              </div>
            )}
          </div>
        ))}
        {!ro && (
          <div className="sa-toolbar" style={{ marginTop: 8 }}>
            <input className="inp" placeholder={isSw ? 'MSIMBO' : 'CODE'} value={promo.code} onChange={e => setPromo({ ...promo, code: e.target.value.toUpperCase().replace(/\s/g, '') })} />
            <input className="inp" type="number" style={{ maxWidth: 90 }} value={promo.pct} onChange={e => setPromo({ ...promo, pct: Number(e.target.value) })} />
            <button className="btn ghost sm" disabled={!promo.code} onClick={() => {
              set('promos', [...f.promos, { code: promo.code, pct: promo.pct, active: true }]);
              setPromo({ code: '', pct: 10 });
            }}>
              {isSw ? 'Ongeza msimbo' : 'Add code'}
            </button>
          </div>
        )}
      </div>

      {!ro && (
        <div className="sa-actions" style={{ marginTop: 14 }}>
          <button className="btn ghost sm" onClick={onReset}>{isSw ? 'Rejesha data ya mfano' : 'Reset demo data'}</button>
          <button className="btn sm" onClick={() => { SA.saveSettings(f); toast(isSw ? 'Mipangilio imehifadhiwa' : 'Settings saved'); }}>
            {isSw ? 'Hifadhi mipangilio' : 'Save settings'}
          </button>
        </div>
      )}
    </>
  );
}

/* ─── NAV config ────────────────────────────────────────── */
const getNav = isSw => [
  ['overview',  '📊', isSw ? 'Muhtasari' : 'Overview',         () => true],
  ['tenants',   '🏪', isSw ? 'Wapangaji' : 'Tenants',           c => c('tenants') || c('tenants_view')],
  ['billing',   '💳', isSw ? 'Malipo na Ankara' : 'Billing & Payments', c => c('billing')],
  ['plans',     '📦', isSw ? 'Vifurushi' : 'Packages',          c => c('plans')],
  ['support',   '🎧', isSw ? 'Msaada' : 'Support',           c => c('support')],
  ['announce',  '📣', isSw ? 'Matangazo' : 'Announcements',     c => c('announce')],
  ['team',      '🛡️', isSw ? 'Timu ya Jukwaa' : 'Platform team',    c => c('team')],
  ['audit',     '📜', isSw ? 'Kumbukumbu ya Ukaguzi' : 'Audit log',         c => c('audit')],
  ['settings',  '⚙️', isSw ? 'Mipangilio' : 'Settings',         () => true],
];

/* ─── Shell ─────────────────────────────────────────────── */
export function SuperAdmin({ sess, out, onImpersonate }) {
  const { A, lang } = useContext(Ctx);
  const isSw = (lang || 'sw') === 'sw';
  const { SS, SA }  = useContext(SaaS);

  const [tab,   setTab]   = useState(() => { try { return sessionStorage.getItem('sa_tab') || 'overview'; } catch { return 'overview'; } });
  const [nav,   setNav]   = useState(false);
  const [msg,   setMsg]   = useState(null);
  const [reset, setReset] = useState(false);
  const timer = useRef();

  const perms = PERMS[sess.platformRole || 'superadmin'] || [];
  const can   = p => perms.includes(p);

  useEffect(() => { SA.setActor(sess.name); }, [sess.name]); // eslint-disable-line
  useEffect(() => { try { sessionStorage.setItem('sa_tab', tab); } catch { /* ignore */ } }, [tab]);

  const toast = (t, ms = 2600) => {
    setMsg(t); clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), ms);
  };

  const items = getNav(isSw).filter(n => n[3](can));
  const cur   = items.find(n => n[0] === tab) || items[0];
  const go    = k => { setTab(k); setNav(false); };

  const pendN = SS.payments.filter(p => p.status === 'pending').length;
  const openN = SS.tickets.filter(k => k.status === 'open').length;

  return (
    <div className="sa">
      {msg && <div className="toast">{msg}</div>}

      {/* Sidebar */}
      <aside className={'sa-side' + (nav ? ' open' : '')}>
        <div className="sa-brand">
          <span>🍽️</span>
          <div><b>{SS.settings.platformName}</b><small>{isSw ? 'Dashibodi ya Jukwaa' : 'Platform console'}</small></div>
        </div>
        <nav>
          {items.map(([k, ic, l]) => (
            <button key={k} className={cur[0] === k ? 'on' : ''} onClick={() => go(k)}>
              <i>{ic}</i>{l}
              {k === 'billing' && pendN > 0 && <u>{pendN}</u>}
              {k === 'support' && openN > 0 && <u>{openN}</u>}
            </button>
          ))}
        </nav>
        <div className="sa-me">
          <div className="sa-av">{sess.name[0]}</div>
          <div><b>{sess.name}</b><small>{sess.title || sess.platformRole}</small></div>
        </div>
        <button className="sa-out" onClick={out}>{isSw ? 'Toka' : 'Sign out'}</button>
      </aside>

      {nav && <div className="sa-scrim" onClick={() => setNav(false)} />}

      {/* Main */}
      <main className="sa-main">
        <header className="sa-top">
          <button className="sa-burger" onClick={() => setNav(true)} aria-label="Menu">☰</button>
          <div>
            <small>{SS.settings.platformName}</small>
            <h2>{cur[1]} {cur[2]}</h2>
          </div>
        </header>

        <div className="sa-body">
          {cur[0] === 'overview'  && <Overview     SS={SS} SA={SA} can={can} toast={toast} go={go} isSw={isSw} />}
          {cur[0] === 'tenants'   && <Tenants      SS={SS} SA={SA} A={A}    can={can} toast={toast} onImpersonate={onImpersonate} />}
          {cur[0] === 'billing'   && <Billing      SS={SS} SA={SA} can={can} toast={toast} />}
          {cur[0] === 'plans'     && <Plans        SS={SS} SA={SA} can={can} toast={toast} isSw={isSw} />}
          {cur[0] === 'support'   && <Support      SS={SS} SA={SA} sess={sess} can={can} toast={toast} isSw={isSw} />}
          {cur[0] === 'announce'  && <Announcements SS={SS} SA={SA} can={can} toast={toast} isSw={isSw} />}
          {cur[0] === 'team'      && <Team         SS={SS} SA={SA} sess={sess} can={can} toast={toast} isSw={isSw} />}
          {cur[0] === 'audit'     && <Audit        SS={SS} isSw={isSw} />}
          {cur[0] === 'settings'  && <Settings     SS={SS} SA={SA} can={can} toast={toast} isSw={isSw} onReset={() => setReset(true)} />}
        </div>
      </main>

      {reset && (
        <Confirm
          danger
          title={isSw ? 'Rejesha data ya mfano ya jukwaa?' : 'Reset platform demo data?'}
          yes={isSw ? 'Rejesha' : 'Reset'}
          msg={isSw
            ? 'Wapangaji wote, ankara, malipo na mipangilio vitarudi kwenye data ya awali ya mfano.'
            : 'All tenants, invoices, payments and settings return to the original demo data.'}
          onNo={() => setReset(false)}
          onYes={() => { SA.reset(); setReset(false); toast(isSw ? 'Data ya mfano imerejeshwa' : 'Demo data restored'); }}
        />
      )}
    </div>
  );
}
