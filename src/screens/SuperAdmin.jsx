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
function Overview({ SS, SA, can, toast, go }) {
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
      label: m.toLocaleString('en', { month: 'short' }),
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
        <Stat icon="💵" label="Monthly recurring revenue" value={fmt(mrr)}                         sub={'ARR ' + fmt(mrr * 12)}           color="#0E5A47" />
        <Stat icon="🏪" label="Active tenants"            value={cnt('active')}                    sub={`${SS.tenants.length} total`}     color="#15803d" />
        <Stat icon="⏳" label="On free trial"             value={cnt('trial')}                     sub={trialsEnding.length + ' ending soon'} color="#1d4ed8" />
        <Stat icon="⚠️" label="Past due / suspended"     value={cnt('past_due') + cnt('suspended')} sub={overdue.length + ' overdue invoices'} color="#b91c1c" />
      </div>

      <div className="sa-grid2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="sa-sec">Revenue collected (6 months)</div>
          <Bars data={months} fmtV={v => Math.round(v / 1000) + 'k'} />
        </div>
        <div className="card">
          <div className="sa-sec">Tenants per package</div>
          {dist.map(({ p, n }) => (
            <div key={p.id} className="sa-usage">
              <span>{p.name}</span>
              <div className="bar"><i style={{ width: (n / Math.max(1, SS.tenants.length)) * 100 + '%' }} /></div>
              <small>{n}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="sa-sec" style={{ marginTop: 16 }}>Needs your attention</div>
      <div className="card">
        {!pend.length && !trialsEnding.length && !overdue.length && !openTk
          ? <Empty icon="🎉" text="All clear — nothing needs action." />
          : null}

        {pend.map(p => (
          <div key={p.id} className="sa-prow">
            <div>
              <b>💳 Payment to confirm</b><br />
              <small>{tn(p.tenantId)} · {methodLabel(p.method)} · ref {p.ref || 'none'}</small>
            </div>
            <div className="sa-prow-r">
              <b>{fmt(p.amount)}</b>
              {can('billing') && (
                <button className="btn sm" onClick={() => { SA.confirmPayment(p.id); toast('Payment confirmed'); }}>
                  ✓ Confirm
                </button>
              )}
            </div>
          </div>
        ))}

        {trialsEnding.map(t => (
          <div key={t.id} className="sa-prow">
            <div>
              <b>⏳ Trial ending</b><br />
              <small>{t.name} · {daysLeft(t.trialEnds)} day(s) left</small>
            </div>
            <div className="sa-prow-r">
              {can('tenants') && (
                <button className="btn ghost sm" onClick={() => { SA.extendTrial(t.id, 7); toast('Trial extended 7 days'); }}>
                  +7 days
                </button>
              )}
            </div>
          </div>
        ))}

        {overdue.map(i => (
          <div key={i.id} className="sa-prow">
            <div>
              <b>🚨 Overdue invoice {i.no}</b><br />
              <small>{tn(i.tenantId)} · due {dShort(i.dueAt)}</small>
            </div>
            <div className="sa-prow-r">
              <b>{fmt(i.total)}</b>
              {can('billing') && (
                <button className="btn ghost sm" onClick={() => { SA.remind(i.id); toast('Reminder sent'); }}>
                  🔔 Remind
                </button>
              )}
            </div>
          </div>
        ))}

        {openTk > 0 && (
          <div className="sa-prow">
            <div><b>🎧 {openTk} open support ticket(s)</b></div>
            {can('support') && <button className="btn ghost sm" onClick={() => go('support')}>Open inbox</button>}
          </div>
        )}
      </div>

      <div className="sa-sec" style={{ marginTop: 16 }}>Latest sign-ups</div>
      <div className="card sa-scroll" style={{ padding: 0 }}>
        <table className="sa-table">
          <tbody>
            {recent.map(t => (
              <tr key={t.id}>
                <td><b>{t.name}</b><br /><small>{t.city}</small></td>
                <td>{planOf(SS.plans, t.plan)?.name}</td>
                <td><Badge s={effStatus(t)} /></td>
                <td><small>{dShort(t.createdAt)} · {t.source === 'wizard' ? 'self-registered' : 'admin'}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─── Plans ─────────────────────────────────────────────── */
function PlanForm({ SS, SA, p, onClose, toast }) {
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
    if (!f.name.trim()) return setErr('Package name is required.');
    const id = isNew ? f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : f.id;
    if (isNew && SS.plans.some(x => x.id === id)) return setErr('A package with this name already exists.');
    const { featuresTxt, ...rest } = f;
    SA.savePlan({ ...rest, id, features: featuresTxt.split('\n').map(x => x.trim()).filter(Boolean) });
    toast('Package saved'); onClose();
  };

  return (
    <Sheet title={isNew ? 'New package' : 'Edit ' + p.name} onClose={onClose} maxWidth={680}>
      <div className="sa-grid2">
        <Field label="Package name"><input className="inp" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Tagline"><input className="inp" value={f.tag} onChange={e => set('tag', e.target.value)} /></Field>
        <Field label="Monthly price (TSh, excl. VAT)">{num('priceM')}</Field>
        <Field label="Yearly price (TSh, excl. VAT)">{num('priceY')}</Field>
        <Field label="Outlets" hint="-1 = unlimited">{num('outlets')}</Field>
        <Field label="Staff users" hint="-1 = unlimited">{num('users')}</Field>
        <Field label="Tables" hint="-1 = unlimited">{num('tables')}</Field>
        <Field label="Free trial (days)">{num('trialDays')}</Field>
      </div>
      <div className="sa-sep">Modules included</div>
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
      <Field label="Features (one per line)">
        <textarea className="inp" rows={4} value={f.featuresTxt} onChange={e => set('featuresTxt', e.target.value)} />
      </Field>
      <label className="sa-check"><input type="checkbox" checked={f.popular} onChange={e => set('popular', e.target.checked)} /> Highlight as "Most popular"</label>
      <label className="sa-check"><input type="checkbox" checked={f.active}  onChange={e => set('active',  e.target.checked)} /> Available for new sign-ups</label>
      {err && <p className="err">{err}</p>}
      <div className="sa-actions">
        <button className="btn ghost sm" onClick={onClose}>Cancel</button>
        <button className="btn sm" onClick={save}>Save package</button>
      </div>
    </Sheet>
  );
}

function Plans({ SS, SA, can, toast }) {
  const [form, setForm] = useState(null);
  const [del,  setDel]  = useState(null);
  return (
    <>
      <div className="sa-toolbar">
        <span style={{ flex: 1 }}>
          <small>Packages you publish here appear on the public pricing page and in the sign-up wizard.</small>
        </span>
        {can('plans') && <button className="btn sm" onClick={() => setForm({})}>＋ New package</button>}
      </div>
      <div className="sa-cards">
        {SS.plans.map(p => {
          const used = SS.tenants.filter(t => t.plan === p.id && t.status !== 'cancelled').length;
          return (
            <div key={p.id} className="card sa-plan">
              <div className="row">
                <b style={{ fontSize: 19 }}>{p.name}</b>
                <span>{p.popular && <Badge s="active" label="Popular" />} {!p.active && <Badge s="void" label="Hidden" />}</span>
              </div>
              <small>{p.tag}</small>
              <div className="sa-price">{fmt(p.priceM)}<small> / month</small></div>
              <small>{fmt(p.priceY)} / year</small>
              <ul>{[`${limitTxt(p.outlets)} outlets`, `${limitTxt(p.users)} users`, `${limitTxt(p.tables)} tables`, `${p.modules.length} modules`, `${p.trialDays}-day free trial`].map(x => <li key={x}>{x}</li>)}</ul>
              <small>{used} tenant(s) subscribed</small>
              {can('plans') && (
                <div className="sa-actions" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
                  <button className="btn ghost sm" onClick={() => setForm({ p })}>✏️ Edit</button>
                  <button className="btn ghost sm" onClick={() => { SA.savePlan({ ...p, active: !p.active }); toast(p.active ? 'Package hidden' : 'Package published'); }}>
                    {p.active ? '🙈 Hide' : '👁 Publish'}
                  </button>
                  <button className="btn ghost sm" disabled={used > 0} title={used ? 'Has active subscribers' : ''} onClick={() => setDel(p)}>🗑</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {form && <PlanForm SS={SS} SA={SA} p={form.p} toast={toast} onClose={() => setForm(null)} />}
      {del  && <Confirm danger title="Delete package?" yes="Delete" msg={`Remove the ${del.name} package permanently?`} onNo={() => setDel(null)} onYes={() => { SA.deletePlan(del.id); toast('Package deleted'); setDel(null); }} />}
    </>
  );
}

/* ─── Support ────────────────────────────────────────────── */
function Support({ SS, SA, sess, can, toast }) {
  const [open, setOpen] = useState(null);
  const [fs,   setFs]   = useState('all');
  const [txt,  setTxt]  = useState('');
  const k  = SS.tickets.find(x => x.id === open);
  const tn = id => (SS.tenants.find(t => t.id === id) || {}).name || '(deleted)';
  const rows = SS.tickets.filter(x => fs === 'all' || x.status === fs);

  return (
    <>
      <div className="sa-pills">
        {['all', 'open', 'pending', 'resolved', 'closed'].map(s => (
          <button key={s} className={fs === s ? 'on' : ''} onClick={() => setFs(s)}>
            {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}{' '}
            <b>{s === 'all' ? SS.tickets.length : SS.tickets.filter(x => x.status === s).length}</b>
          </button>
        ))}
      </div>
      <div className="card sa-scroll" style={{ padding: 0 }}>
        <table className="sa-table">
          <thead><tr><th>Ticket</th><th>Tenant</th><th>Priority</th><th>Status</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {rows.map(x => (
              <tr key={x.id}>
                <td>
                  <b style={{ cursor: 'pointer', color: 'var(--g)' }} onClick={() => setOpen(x.id)}>{x.subject}</b>
                  <br /><small>{x.msgs.length} message(s)</small>
                </td>
                <td>{tn(x.tenantId)}</td>
                <td><Badge s={x.priority} /></td>
                <td><Badge s={x.status} /></td>
                <td><small>{dTime(x.msgs[x.msgs.length - 1].at)}</small></td>
                <td><button className="sa-link" onClick={() => setOpen(x.id)}>Open</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="6"><Empty icon="🎧" text="No tickets" /></td></tr>}
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
              <textarea className="inp" rows={3} placeholder="Write a reply…" value={txt} onChange={e => setTxt(e.target.value)} />
              <div className="sa-actions">
                <select className="inp" style={{ width: 'auto' }} value={k.priority} onChange={e => SA.setTicket(k.id, { priority: e.target.value })}>
                  {['low', 'normal', 'high'].map(p => <option key={p}>{p}</option>)}
                </select>
                {k.status !== 'resolved' && (
                  <button className="btn ghost sm" onClick={() => { SA.setTicket(k.id, { status: 'resolved' }); toast('Ticket resolved'); }}>✓ Resolve</button>
                )}
                {k.status === 'resolved' && (
                  <button className="btn ghost sm" onClick={() => SA.setTicket(k.id, { status: 'open' })}>Re-open</button>
                )}
                <button className="btn sm" disabled={!txt.trim()} onClick={() => {
                  SA.replyTicket(k.id, 'admin', sess.name, txt.trim());
                  setTxt(''); toast('Reply sent');
                }}>Send reply</button>
              </div>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

/* ─── Announcements ─────────────────────────────────────── */
function Announcements({ SS, SA, can, toast }) {
  const [f,   setF]   = useState(null);
  const [del, setDel] = useState(null);
  return (
    <>
      <div className="sa-toolbar">
        <span style={{ flex: 1 }}><small>Active announcements show as a banner to tenant owners and managers.</small></span>
        {can('announce') && (
          <button className="btn sm" onClick={() => setF({ id: uid('a'), title: '', body: '', type: 'info', audience: 'all', active: true })}>＋ New</button>
        )}
      </div>
      {SS.announcements.map(a => (
        <div key={a.id} className="card sa-prow" style={{ marginBottom: 8 }}>
          <div>
            <b>{a.type === 'warning' ? '⚠️' : a.type === 'success' ? '🎉' : 'ℹ️'} {a.title}</b>
            {!a.active && <Badge s="void" label="Off" />}
            <br /><small>{a.body}</small>
            <br /><small>To: {a.audience === 'all' ? 'all tenants' : a.audience + ' plan'} · {dShort(a.at)}</small>
          </div>
          {can('announce') && (
            <div className="sa-rowacts">
              <button title="Edit"   onClick={() => setF(a)}>✏️</button>
              <button title={a.active ? 'Turn off' : 'Turn on'} onClick={() => SA.saveAnnouncement({ ...a, active: !a.active })}>{a.active ? '⏸' : '▶️'}</button>
              <button title="Delete" onClick={() => setDel(a)}>🗑</button>
            </div>
          )}
        </div>
      ))}
      {!SS.announcements.length && <Empty icon="📣" text="No announcements" />}

      {f && (
        <Sheet title="Announcement" onClose={() => setF(null)} maxWidth={520}>
          <Field label="Title"><input className="inp" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Message"><textarea className="inp" rows={3} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} /></Field>
          <div className="sa-grid2">
            <Field label="Type">
              <select className="inp" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
                <option value="info">Information</option>
                <option value="warning">Warning</option>
                <option value="success">Good news</option>
              </select>
            </Field>
            <Field label="Audience">
              <select className="inp" value={f.audience} onChange={e => setF({ ...f, audience: e.target.value })}>
                <option value="all">All tenants</option>
                {SS.plans.map(p => <option key={p.id} value={p.id}>{p.name} plan only</option>)}
              </select>
            </Field>
          </div>
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={() => setF(null)}>Cancel</button>
            <button className="btn sm" disabled={!f.title.trim()} onClick={() => { SA.saveAnnouncement(f); toast('Announcement published'); setF(null); }}>Publish</button>
          </div>
        </Sheet>
      )}
      {del && <Confirm danger title="Delete announcement?" yes="Delete" msg={del.title} onNo={() => setDel(null)} onYes={() => { SA.deleteAnnouncement(del.id); setDel(null); }} />}
    </>
  );
}

/* ─── Team ──────────────────────────────────────────────── */
function Team({ SS, SA, sess, can, toast }) {
  const [f,   setF]   = useState(null);
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');

  const save = () => {
    if (!f.name.trim() || !/^0[67]\d{8}$/.test(f.ph) || f.pw.length < 4) {
      return setErr('Name, a valid phone (0712345678) and a 4+ character password are required.');
    }
    if (SS.admins.some(a => a.ph === f.ph && a.id !== f.id)) return setErr('That phone is already in use.');
    SA.saveAdmin({ ...f, title: { superadmin: 'Super Admin', billing: 'Billing & Collections', support: 'Customer Support' }[f.role] });
    toast('Team member saved'); setF(null); setErr('');
  };

  return (
    <>
      <div className="sa-toolbar">
        <span style={{ flex: 1 }}>
          <small><b>Super Admin</b> — everything · <b>Billing</b> — payments &amp; invoices · <b>Support</b> — tickets &amp; tenant view</small>
        </span>
        {can('team') && (
          <button className="btn sm" onClick={() => { setErr(''); setF({ id: uid('adm'), name: '', ph: '', email: '', pw: '', role: 'support', active: true }); }}>＋ Add member</button>
        )}
      </div>
      <div className="card sa-scroll" style={{ padding: 0 }}>
        <table className="sa-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Status</th><th /></tr></thead>
          <tbody>
            {SS.admins.map(a => (
              <tr key={a.id}>
                <td><b>{a.name}</b><br /><small>{a.email}</small></td>
                <td>{a.ph}</td>
                <td>{a.role}</td>
                <td><Badge s={a.active ? 'active' : 'suspended'} label={a.active ? 'Active' : 'Disabled'} /></td>
                <td>
                  {can('team') && (
                    <div className="sa-rowacts">
                      <button title="Edit" onClick={() => { setErr(''); setF(a); }}>✏️</button>
                      {a.id !== sess.id && <button title={a.active ? 'Disable' : 'Enable'} onClick={() => SA.saveAdmin({ ...a, active: !a.active })}>{a.active ? '⏸' : '▶️'}</button>}
                      {a.id !== sess.id && <button title="Remove" onClick={() => setDel(a)}>🗑</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {f && (
        <Sheet title="Team member" onClose={() => setF(null)} maxWidth={480}>
          <Field label="Full name"><input className="inp" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
          <div className="sa-grid2">
            <Field label="Phone (login)"><input className="inp" inputMode="tel" value={f.ph} onChange={e => setF({ ...f, ph: e.target.value.replace(/\s/g, '') })} /></Field>
            <Field label="Email"><input className="inp" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Password"><input className="inp" value={f.pw} onChange={e => setF({ ...f, pw: e.target.value })} /></Field>
            <Field label="Role">
              <select className="inp" value={f.role} disabled={f.id === sess.id} onChange={e => setF({ ...f, role: e.target.value })}>
                <option value="superadmin">Super Admin</option>
                <option value="billing">Billing</option>
                <option value="support">Support</option>
              </select>
            </Field>
          </div>
          {err && <p className="err">{err}</p>}
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={() => setF(null)}>Cancel</button>
            <button className="btn sm" onClick={save}>Save</button>
          </div>
        </Sheet>
      )}
      {del && <Confirm danger title="Remove team member?" yes="Remove" msg={del.name + ' will lose access to the console.'} onNo={() => setDel(null)} onYes={() => { SA.deleteAdmin(del.id); setDel(null); toast('Member removed'); }} />}
    </>
  );
}

/* ─── Audit ─────────────────────────────────────────────── */
function Audit({ SS }) {
  const [q, setQ] = useState('');
  const rows = SS.audit.filter(a => !q || (a.action + a.target + a.by).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="sa-toolbar">
        <input className="inp" placeholder="Filter by action, tenant or person…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="card">
        {rows.map(a => (
          <div key={a.id} className="sa-log">
            <b>{a.action}</b>{a.target && <span> · {a.target}</span>}
            <small>{a.by} · {dTime(a.at)}</small>
          </div>
        ))}
        {!rows.length && <Empty text="No entries" />}
      </div>
    </>
  );
}

/* ─── Settings ──────────────────────────────────────────── */
function Settings({ SS, SA, can, toast, onReset }) {
  const [f,     setF]     = useState({ ...SS.settings });
  const [promo, setPromo] = useState({ code: '', pct: 10 });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const ro  = !can('settings');

  return (
    <>
      <div className="card">
        <div className="sa-sec">Platform</div>
        <div className="sa-grid2">
          <Field label="Platform name"><input className="inp" disabled={ro} value={f.platformName} onChange={e => set('platformName', e.target.value)} /></Field>
          <Field label="Tenant domain" hint={`Tenant sites: name.${f.domain}`}><input className="inp" disabled={ro} value={f.domain} onChange={e => set('domain', e.target.value)} /></Field>
          <Field label="Support phone"><input className="inp" disabled={ro} value={f.supportPhone} onChange={e => set('supportPhone', e.target.value)} /></Field>
          <Field label="Support email"><input className="inp" disabled={ro} value={f.supportEmail} onChange={e => set('supportEmail', e.target.value)} /></Field>
          <Field label="VAT on subscriptions (%)"><input className="inp" type="number" disabled={ro} value={f.vatPct} onChange={e => set('vatPct', Number(e.target.value))} /></Field>
          <Field label="Invoice due after (days)"><input className="inp" type="number" disabled={ro} value={f.invoiceDueDays} onChange={e => set('invoiceDueDays', Number(e.target.value))} /></Field>
          <Field label="Grace period before auto-suspend (days)"><input className="inp" type="number" disabled={ro} value={f.graceDays} onChange={e => set('graceDays', Number(e.target.value))} /></Field>
        </div>
        <label className="sa-check"><input type="checkbox" disabled={ro} checked={f.autoSuspend}       onChange={e => set('autoSuspend',       e.target.checked)} /> Auto-suspend after grace period</label>
        <label className="sa-check"><input type="checkbox" disabled={ro} checked={f.registrationOpen} onChange={e => set('registrationOpen', e.target.checked)} /> Open registration (public sign-up)</label>
        <label className="sa-check"><input type="checkbox" disabled={ro} checked={f.maintenance}      onChange={e => set('maintenance',      e.target.checked)} /> Maintenance mode (only admins can sign in)</label>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="sa-sec">Where tenants pay you</div>
        {PAY_METHODS.map(m => (
          <Field key={m.id} label={m.icon + ' ' + m.label}>
            <input className="inp" disabled={ro} value={f.payInfo[m.id] || ''} onChange={e => set('payInfo', { ...f.payInfo, [m.id]: e.target.value })} />
          </Field>
        ))}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="sa-sec">Promo codes</div>
        {f.promos.map(p => (
          <div key={p.code} className="sa-prow">
            <div><b>{p.code}</b> — {p.pct}% off first invoice {!p.active && <Badge s="void" label="Off" />}</div>
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
            <input className="inp" placeholder="CODE" value={promo.code} onChange={e => setPromo({ ...promo, code: e.target.value.toUpperCase().replace(/\s/g, '') })} />
            <input className="inp" type="number" style={{ maxWidth: 90 }} value={promo.pct} onChange={e => setPromo({ ...promo, pct: Number(e.target.value) })} />
            <button className="btn ghost sm" disabled={!promo.code} onClick={() => {
              set('promos', [...f.promos, { code: promo.code, pct: promo.pct, active: true }]);
              setPromo({ code: '', pct: 10 });
            }}>Add code</button>
          </div>
        )}
      </div>

      {!ro && (
        <div className="sa-actions" style={{ marginTop: 14 }}>
          <button className="btn ghost sm" onClick={onReset}>Reset demo data</button>
          <button className="btn sm" onClick={() => { SA.saveSettings(f); toast('Settings saved'); }}>Save settings</button>
        </div>
      )}
    </>
  );
}

/* ─── NAV config ────────────────────────────────────────── */
const NAV = [
  ['overview',  '📊', 'Overview',         () => true],
  ['tenants',   '🏪', 'Tenants',           c => c('tenants') || c('tenants_view')],
  ['billing',   '💳', 'Billing & Payments', c => c('billing')],
  ['plans',     '📦', 'Packages',          c => c('plans')],
  ['support',   '🎧', 'Support',           c => c('support')],
  ['announce',  '📣', 'Announcements',     c => c('announce')],
  ['team',      '🛡️', 'Platform team',    c => c('team')],
  ['audit',     '📜', 'Audit log',         c => c('audit')],
  ['settings',  '⚙️', 'Settings',         () => true],
];

/* ─── Shell ─────────────────────────────────────────────── */
export function SuperAdmin({ sess, out, onImpersonate }) {
  const { A }      = useContext(Ctx);
  const { SS, SA } = useContext(SaaS);

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

  const items = NAV.filter(n => n[3](can));
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
          <div><b>{SS.settings.platformName}</b><small>Platform console</small></div>
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
        <button className="sa-out" onClick={out}>Sign out</button>
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
          {cur[0] === 'overview'  && <Overview     SS={SS} SA={SA} can={can} toast={toast} go={go} />}
          {cur[0] === 'tenants'   && <Tenants      SS={SS} SA={SA} A={A}    can={can} toast={toast} onImpersonate={onImpersonate} />}
          {cur[0] === 'billing'   && <Billing      SS={SS} SA={SA} can={can} toast={toast} />}
          {cur[0] === 'plans'     && <Plans        SS={SS} SA={SA} can={can} toast={toast} />}
          {cur[0] === 'support'   && <Support      SS={SS} SA={SA} sess={sess} can={can} toast={toast} />}
          {cur[0] === 'announce'  && <Announcements SS={SS} SA={SA} can={can} toast={toast} />}
          {cur[0] === 'team'      && <Team         SS={SS} SA={SA} sess={sess} can={can} toast={toast} />}
          {cur[0] === 'audit'     && <Audit        SS={SS} />}
          {cur[0] === 'settings'  && <Settings     SS={SS} SA={SA} can={can} toast={toast} onReset={() => setReset(true)} />}
        </div>
      </main>

      {reset && (
        <Confirm danger title="Reset platform demo data?" yes="Reset"
          msg="All tenants, invoices, payments and settings return to the original demo data."
          onNo={() => setReset(false)}
          onYes={() => { SA.reset(); setReset(false); toast('Demo data restored'); }}
        />
      )}
    </div>
  );
}
