import React, { useState, useContext } from 'react';
import { Sheet } from '../components/ui';
import { fmt } from '../data';
import { Ctx } from '../store';
import { Badge, Field, Empty, Confirm, dShort, dTime, daysLeft, invStatus, PayBadge } from '../components/saasui';
import {
  BIZ_TYPES, REGIONS, MODULE_CATALOG, PAY_METHODS,
  methodLabel, planOf, periodPrice, calcInvoice, slugify,
  limitTxt, genPw, effStatus,
} from '../data_saas';

const ownerUser = (t, pw) => ({
  id: 'own_' + t.id, role: 'owner', name: t.ownerName,
  ph: t.phone, pw, email: t.email,
  title: 'Owner · ' + t.name, tenantId: t.id, tenantName: t.name,
});

/* ─── Create / Edit Tenant ─────────────────────────────────── */
function TenantForm({ SS, SA, A, t, onClose, toast, isSw }) {
  const isNew = !t;
  const plans = SS.plans.filter(p => p.active || (t && p.id === t.plan));
  const [f, setF] = useState(t ? { ...t } : {
    name: '', slug: '', ownerName: '', phone: '', email: '',
    city: 'Dar es Salaam', address: '', tin: '', bizType: 'Restaurant',
    outlets: 1, tables: 10,
    plan: plans[0]?.id, cycle: 'monthly', status: 'trial',
    trialDays: 14, markPaid: true, method: 'bank', ref: '', pw: genPw(), notes: '',
  });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const plan       = planOf(SS.plans, f.plan);
  const slugTaken  = SS.tenants.some(x => x.slug === f.slug && x.id !== (t && t.id));
  const phoneTaken = SS.tenants.some(x => x.phone === (f.phone || '').replace(/\s/g, '') && x.id !== (t && t.id));

  const save = () => {
    const phone = (f.phone || '').replace(/\s/g, '');
    if (!f.name.trim() || !f.ownerName.trim()) {
      return setErr(isSw ? 'Jina la biashara na jina la mmiliki vinahitajika.' : 'Business name and owner name are required.');
    }
    if (!/^(\+?255|0)[67]\d{8}$/.test(phone)) {
      return setErr(isSw ? 'Weka namba sahihi ya simu ya Tanzania, mf. 0712345678.' : 'Enter a valid Tanzanian mobile number, e.g. 0712345678.');
    }
    if (!f.slug || slugTaken) {
      return setErr(isSw ? 'Anwani hiyo ya wavuti tayari imechukuliwa. Chagua nyingine.' : 'That web address is already taken. Choose another.');
    }
    if (phoneTaken) {
      return setErr(isSw ? 'Mpangaji mwenye namba hii ya simu tayari yupo.' : 'A tenant with this phone number already exists.');
    }

    if (isNew) {
      const tn = SA.createTenant({
        ...f, phone,
        outlets: Number(f.outlets), tables: Number(f.tables), source: 'admin',
        invoice: f.status === 'active',
        payNow: f.status === 'active',
        markPaid: f.status === 'active' && f.markPaid,
      });
      A.upsertUser(ownerUser(tn, f.pw));
      toast(isSw ? `Mpangaji ameundwa. Kuingia kwa mmiliki: ${phone} / ${f.pw}` : `Tenant created. Owner login: ${phone} / ${f.pw}`, 7000);
    } else {
      SA.updateTenant(t.id, {
        name: f.name, slug: f.slug, ownerName: f.ownerName,
        phone: (f.phone || '').replace(/\s/g, ''), email: f.email,
        city: f.city, address: f.address, tin: f.tin, bizType: f.bizType,
        outlets: Number(f.outlets), tables: Number(f.tables), notes: f.notes,
      });
      toast(isSw ? 'Taarifa za mpangaji zimesasishwa' : 'Tenant updated');
    }
    onClose();
  };

  return (
    <Sheet
      title={isNew ? (isSw ? 'Unda akaunti ya mpangaji' : 'Create tenant account') : (isSw ? 'Hariri ' : 'Edit ') + t.name}
      subtitle={isNew ? (isSw ? 'Inaunda biashara, akaunti ya mmiliki na usajili' : 'Creates the business, owner login and subscription') : undefined}
      onClose={onClose} maxWidth={720}
    >
      <div className="sa-grid2">
        <Field label={isSw ? 'Jina la biashara *' : 'Business name *'}>
          <input className="inp" value={f.name}
            onChange={e => { set('name', e.target.value); if (isNew) set('slug', slugify(e.target.value)); }}
          />
        </Field>
        <Field label={isSw ? 'Anwani ya wavuti' : 'Web address'} hint={slugTaken ? (isSw ? '⚠ tayari imechukuliwa' : '⚠ already taken') : `${f.slug || 'name'}.${SS.settings.domain}`}>
          <input className="inp" value={f.slug} onChange={e => set('slug', slugify(e.target.value))} />
        </Field>
        <Field label={isSw ? 'Jina kamili la mmiliki *' : 'Owner full name *'}>
          <input className="inp" value={f.ownerName} onChange={e => set('ownerName', e.target.value)} />
        </Field>
        <Field label={isSw ? 'Simu ya mmiliki (kuingia) *' : 'Owner phone (login) *'}>
          <input className="inp" inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} />
        </Field>
        <Field label={isSw ? 'Barua pepe' : 'Email'}>
          <input className="inp" type="email" value={f.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label={isSw ? 'Aina ya biashara' : 'Business type'}>
          <select className="inp" value={f.bizType} onChange={e => set('bizType', e.target.value)}>
            {BIZ_TYPES.map(b => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <Field label={isSw ? 'Jiji / Mkoa' : 'City / region'}>
          <select className="inp" value={f.city} onChange={e => set('city', e.target.value)}>
            {REGIONS.map(b => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <Field label={isSw ? 'Anwani' : 'Address'}>
          <input className="inp" value={f.address} onChange={e => set('address', e.target.value)} />
        </Field>
        <Field label="TIN">
          <input className="inp" value={f.tin} onChange={e => set('tin', e.target.value)} />
        </Field>
        <div className="sa-grid2" style={{ gap: 8 }}>
          <Field label={isSw ? 'Matawi' : 'Outlets'}>
            <input className="inp" type="number" min="1" value={f.outlets} onChange={e => set('outlets', e.target.value)} />
          </Field>
          <Field label={isSw ? 'Meza' : 'Tables'}>
            <input className="inp" type="number" min="0" value={f.tables} onChange={e => set('tables', e.target.value)} />
          </Field>
        </div>
      </div>

      {isNew && (
        <>
          <div className="sa-sep">{isSw ? 'Usajili' : 'Subscription'}</div>
          <div className="sa-grid2">
            <Field label={isSw ? 'Kifurushi' : 'Package'}>
              <select className="inp" value={f.plan} onChange={e => set('plan', e.target.value)}>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.priceM)}/{isSw ? 'mwezi' : 'mo'}</option>)}
              </select>
            </Field>
            <Field label={isSw ? 'Mzunguko wa malipo' : 'Billing cycle'}>
              <select className="inp" value={f.cycle} onChange={e => set('cycle', e.target.value)}>
                <option value="monthly">{isSw ? 'Kila mwezi' : 'Monthly'}</option>
                <option value="yearly">{isSw ? 'Kila mwaka (miezi 2 bure)' : 'Yearly (2 months free)'}</option>
              </select>
            </Field>
            <Field label={isSw ? 'Anza kama' : 'Start as'}>
              <select className="inp" value={f.status} onChange={e => set('status', e.target.value)}>
                <option value="trial">{isSw ? 'Majaribio ya bure' : 'Free trial'}</option>
                <option value="active">{isSw ? 'Hai (amelipa)' : 'Active (paid)'}</option>
              </select>
            </Field>
            {f.status === 'trial'
              ? (
                <Field label={isSw ? 'Muda wa majaribio (siku)' : 'Trial length (days)'}>
                  <input className="inp" type="number" min="1" value={f.trialDays} onChange={e => set('trialDays', Number(e.target.value))} />
                </Field>
              ) : (
                <Field label={isSw ? 'Malipo ya kwanza' : 'First payment'}>
                  <select className="inp" value={f.markPaid ? 'paid' : 'unpaid'} onChange={e => set('markPaid', e.target.value === 'paid')}>
                    <option value="paid">{isSw ? 'Yamepokelewa — weka alama imelipwa' : 'Received — mark as paid'}</option>
                    <option value="unpaid">{isSw ? 'Bado — unda ankara isiyolipwa' : 'Not yet — create unpaid invoice'}</option>
                  </select>
                </Field>
              )}
            {f.status === 'active' && f.markPaid && (
              <Field label={isSw ? 'Njia ya malipo' : 'Payment method'}>
                <select className="inp" value={f.method} onChange={e => set('method', e.target.value)}>
                  {PAY_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </Field>
            )}
            {f.status === 'active' && f.markPaid && (
              <Field label={isSw ? 'Kumbukumbu ya malipo' : 'Payment reference'}>
                <input className="inp" value={f.ref} onChange={e => set('ref', e.target.value)} placeholder={isSw ? 'Namba ya muamala' : 'Transaction ID'} />
              </Field>
            )}
            <Field label={isSw ? 'Nenosiri la muda la mmiliki' : 'Owner temporary password'} hint={isSw ? 'Inaonyeshwa mara moja baada ya kuunda' : 'Shown once after creation'}>
              <input className="inp" value={f.pw} onChange={e => set('pw', e.target.value)} />
            </Field>
          </div>
          {plan && (
            <p className="sa-note">
              {isSw ? 'Inajumuisha:' : 'Includes:'} {plan.modules.map(m => MODULE_CATALOG.find(c => c.id === m)?.label).join(' · ')}
            </p>
          )}
        </>
      )}

      <Field label={isSw ? 'Maelezo ya ndani' : 'Internal notes'}>
        <textarea className="inp" rows={2} value={f.notes || ''} onChange={e => set('notes', e.target.value)} />
      </Field>
      {err && <p className="err">{err}</p>}
      <div className="sa-actions">
        <button className="btn ghost sm" onClick={onClose}>
          {isSw ? 'Ghairi' : 'Cancel'}
        </button>
        <button className="btn sm" onClick={save}>
          {isNew ? (isSw ? 'Unda akaunti' : 'Create account') : (isSw ? 'Hifadhi mabadiliko' : 'Save changes')}
        </button>
      </div>
    </Sheet>
  );
}

/* ─── Change Plan ───────────────────────────────────────── */
function PlanSheet({ SS, SA, t, onClose, toast, isSw }) {
  const [planId, setPlanId] = useState(t.plan);
  const [cycle,  setCycle]  = useState(t.cycle);
  const [inv,    setInv]    = useState(planId !== t.plan);
  const plan = planOf(SS.plans, planId);
  const c    = calcInvoice(plan, cycle, SS.settings.vatPct);

  return (
    <Sheet title={(isSw ? 'Badilisha kifurushi — ' : 'Change package — ') + t.name} onClose={onClose} maxWidth={560}>
      <div className="sa-plans-mini">
        {SS.plans.map(p => (
          <button
            key={p.id}
            className={'sa-plan-opt' + (planId === p.id ? ' on' : '')}
            onClick={() => { setPlanId(p.id); setInv(p.id !== t.plan); }}
          >
            <b>{p.name}{p.id === t.plan ? (isSw ? ' (cha sasa)' : ' (current)') : ''}</b>
            <span>{fmt(cycle === 'yearly' ? p.priceY : p.priceM)}/{cycle === 'yearly' ? (isSw ? 'mwaka' : 'yr') : (isSw ? 'mwezi' : 'mo')}</span>
            <small>{limitTxt(p.outlets)} {isSw ? 'matawi' : 'outlets'} · {limitTxt(p.users)} {isSw ? 'watumiaji' : 'users'}</small>
          </button>
        ))}
      </div>
      <Field label={isSw ? 'Mzunguko wa malipo' : 'Billing cycle'}>
        <select className="inp" value={cycle} onChange={e => setCycle(e.target.value)}>
          <option value="monthly">{isSw ? 'Kila mwezi' : 'Monthly'}</option>
          <option value="yearly">{isSw ? 'Kila mwaka' : 'Yearly'}</option>
        </select>
      </Field>
      <label className="sa-check">
        <input type="checkbox" checked={inv} onChange={e => setInv(e.target.checked)} />
        {' '}
        {isSw
          ? `Tengeneza ankara kwa mabadiliko haya (${fmt(c.total)} pamoja na VAT)`
          : `Generate an invoice for this change (${fmt(c.total)} incl. VAT)`}
      </label>
      <div className="sa-actions">
        <button className="btn ghost sm" onClick={onClose}>
          {isSw ? 'Ghairi' : 'Cancel'}
        </button>
        <button className="btn sm" onClick={() => { SA.changePlan(t.id, planId, cycle, { invoice: inv }); toast(isSw ? 'Kifurushi kimesasishwa' : 'Package updated'); onClose(); }}>
          {isSw ? 'Tekeleza mabadiliko' : 'Apply change'}
        </button>
      </div>
    </Sheet>
  );
}

/* ─── Invoice Sheet (exported for SABilling) ─────────────── */
export function InvoiceSheet({ SS, SA, t, onClose, toast }) {
  const { lang } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  const [tid,   setTid]   = useState(t ? t.id : SS.tenants[0]?.id);
  const ten               = SS.tenants.find(x => x.id === tid);
  const [planId, setPlanId] = useState(ten?.plan);
  const [cycle,  setCycle]  = useState(ten?.cycle || 'monthly');
  const [ov,     setOv]     = useState('');
  const [note,   setNote]   = useState('');
  const plan = planOf(SS.plans, planId);
  const c    = calcInvoice(plan, cycle, SS.settings.vatPct, 0, ov);

  const pick = id => {
    setTid(id);
    const x = SS.tenants.find(y => y.id === id);
    setPlanId(x.plan); setCycle(x.cycle);
  };

  return (
    <Sheet title={isSw ? 'Unda ankara' : 'Create invoice'} onClose={onClose} maxWidth={520}>
      <div className="sa-grid2">
        <Field label={isSw ? 'Mpangaji' : 'Tenant'}>
          <select className="inp" value={tid} onChange={e => pick(e.target.value)}>
            {SS.tenants.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label={isSw ? 'Kifurushi' : 'Package'}>
          <select className="inp" value={planId} onChange={e => setPlanId(e.target.value)}>
            {SS.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={isSw ? 'Mzunguko' : 'Cycle'}>
          <select className="inp" value={cycle} onChange={e => setCycle(e.target.value)}>
            <option value="monthly">{isSw ? 'Kila mwezi' : 'Monthly'}</option>
            <option value="yearly">{isSw ? 'Kila mwaka' : 'Yearly'}</option>
          </select>
        </Field>
        <Field label={isSw ? 'Kiasi maalum (bila VAT)' : 'Custom amount (before VAT)'} hint={isSw ? 'Acha wazi kutumia bei ya kifurushi' : 'Leave empty to use the package price'}>
          <input className="inp" type="number" value={ov}
            onChange={e => setOv(e.target.value)}
            placeholder={String(periodPrice(plan, cycle))}
          />
        </Field>
      </div>
      <Field label={isSw ? 'Maelezo kwenye ankara' : 'Note on invoice'}>
        <input className="inp" value={note} onChange={e => setNote(e.target.value)} />
      </Field>
      <div className="sa-sum">
        <span>{isSw ? 'Jumla ndogo' : 'Subtotal'}</span><b>{fmt(c.sub)}</b>
        <span>VAT {SS.settings.vatPct}%</span><b>{fmt(c.vat)}</b>
        <span>{isSw ? 'Jumla' : 'Total'}</span><b>{fmt(c.total)}</b>
      </div>
      <div className="sa-actions">
        <button className="btn ghost sm" onClick={onClose}>
          {isSw ? 'Ghairi' : 'Cancel'}
        </button>
        <button className="btn sm" onClick={() => {
          SA.createInvoice({ tenantId: tid, planId, cycle, kind: 'manual', override: ov, note });
          toast(isSw ? 'Ankara imeundwa' : 'Invoice created'); onClose();
        }}>
          {isSw ? 'Unda ankara' : 'Create invoice'}
        </button>
      </div>
    </Sheet>
  );
}

/* ─── Tenant Detail View ────────────────────────────────── */
function TenantView({ SS, id, onClose, act, can, isSw }) {
  const t = SS.tenants.find(x => x.id === id);
  const [tab, setTab] = useState('profile');
  if (!t) return null;

  const plan = planOf(SS.plans, t.plan);
  const st   = effStatus(t);
  const invs = SS.invoices.filter(i => i.tenantId === t.id);
  const pays = SS.payments.filter(p => p.tenantId === t.id);
  const acts = SS.audit.filter(a => (a.target || '').includes(t.name)).slice(0, 12);
  const bar  = (used, max) => (max === -1 ? 8 : Math.min(100, Math.round((used / max) * 100)));
  const M    = can('tenants');

  return (
    <Sheet title={t.name} subtitle={`${t.slug}.${SS.settings.domain}`} onClose={onClose} maxWidth={760}
      extraHeader={<Badge s={st} />}>
      <div className="sa-quick">
        {M && <button onClick={() => act('edit', t)}>✏️ {isSw ? 'Hariri' : 'Edit'}</button>}
        {M && <button onClick={() => act('plan', t)}>📦 {isSw ? 'Kifurushi' : 'Package'}</button>}
        {can('billing') && <button onClick={() => act('invoice', t)}>🧾 {isSw ? 'Ankara' : 'Invoice'}</button>}
        {M && (st === 'suspended' || st === 'cancelled' || st === 'expired'
          ? <button onClick={() => act('activate', t)}>✅ {isSw ? 'Washa' : 'Activate'}</button>
          : <button onClick={() => act('suspend', t)}>⛔ {isSw ? 'Simamisha' : 'Suspend'}</button>)}
        {M && <button onClick={() => act('trial', t)}>⏳ {isSw ? 'Ongeza majaribio' : 'Extend trial'}</button>}
        {M && <button onClick={() => act('login', t)}>🔑 {isSw ? 'Ingia kama mmiliki' : 'Login as owner'}</button>}
        {M && <button onClick={() => act('pw', t)}>🔒 {isSw ? 'Weka upya nenosiri' : 'Reset password'}</button>}
        {M && <button className="danger" onClick={() => act('delete', t)}>🗑 {isSw ? 'Futa' : 'Delete'}</button>}
      </div>

      {t.status === 'suspended' && t.suspendReason && (
        <p className="sa-alert">{isSw ? 'Imesimamishwa:' : 'Suspended:'} {t.suspendReason}</p>
      )}

      <div className="sa-tabs">
        {[
          ['profile', isSw ? 'Wasifu' : 'Profile'],
          ['sub', isSw ? 'Usajili' : 'Subscription'],
          ['bill', `${isSw ? 'Malipo' : 'Billing'} (${invs.length})`],
          ['act', isSw ? 'Shughuli' : 'Activity']
        ].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="sa-kv">
          {[
            [isSw ? 'Mmiliki' : 'Owner',         t.ownerName],
            [isSw ? 'Simu' : 'Phone',         t.phone],
            [isSw ? 'Barua pepe' : 'Email',         t.email || '—'],
            [isSw ? 'Aina ya biashara' : 'Business type', t.bizType],
            [isSw ? 'Jiji' : 'City',          t.city],
            [isSw ? 'Anwani' : 'Address',       t.address || '—'],
            ['TIN',           t.tin || '—'],
            [isSw ? 'Amesajiliwa' : 'Registered',    dShort(t.createdAt)],
            [isSw ? 'Chanzo' : 'Source',        t.source === 'wizard' ? (isSw ? 'Usajili binafsi' : 'Self-registration') : (isSw ? 'Imeundwa na msimamizi' : 'Created by admin')],
            [isSw ? 'Maelezo' : 'Notes',         t.notes || '—'],
          ].map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
        </div>
      )}

      {tab === 'sub' && (
        <>
          <div className="sa-kv">
            {[
              [isSw ? 'Kifurushi' : 'Package', plan ? plan.name : t.plan],
              [isSw ? 'Mzunguko' : 'Cycle', t.cycle === 'yearly' ? (isSw ? 'Kila mwaka' : 'yearly') : (isSw ? 'Kila mwezi' : 'monthly')],
              [isSw ? 'Bei' : 'Price', plan ? fmt(periodPrice(plan, t.cycle)) + (t.cycle === 'yearly' ? (isSw ? ' / mwaka' : ' / year') : (isSw ? ' / mwezi' : ' / month')) : '—'],
              t.trialEnds
                ? [isSw ? 'Majaribio yanaisha' : 'Trial ends', `${dShort(t.trialEnds)} (${daysLeft(t.trialEnds)} ${isSw ? 'siku' : 'days'})`]
                : [isSw ? 'Malipo yajayo' : 'Next billing', dShort(t.nextBilling)],
            ].map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
          </div>
          <div className="sa-sep">{isSw ? 'Matumizi dhidi ya mipaka ya kifurushi' : 'Usage vs package limits'}</div>
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
          <div className="sa-sep">{isSw ? 'Moduli zilizowezeshwa' : 'Modules enabled'}</div>
          <div className="sa-chips">
            {MODULE_CATALOG.map(m => (
              <span key={m.id} className={'sa-chip' + (t.modules.includes(m.id) ? ' on' : '')}>{m.icon} {m.label}</span>
            ))}
          </div>
        </>
      )}

      {tab === 'bill' && (
        <div className="sa-scroll">
          <table>
            <thead>
              <tr>
                <th>{isSw ? 'Ankara' : 'Invoice'}</th>
                <th>{isSw ? 'Imetolewa' : 'Issued'}</th>
                <th>{isSw ? 'Jumla' : 'Total'}</th>
                <th>{isSw ? 'Hali' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {invs.map(i => (
                <tr key={i.id}>
                  <td>{i.no}</td>
                  <td>{dShort(i.issuedAt)}</td>
                  <td>{fmt(i.total)}</td>
                  <td><Badge s={invStatus(i)} /></td>
                </tr>
              ))}
              {!invs.length && <tr><td colSpan="4"><Empty text={isSw ? 'Hakuna ankara bado' : 'No invoices yet'} /></td></tr>}
            </tbody>
          </table>
          {pays.length > 0 && (
            <>
              <div className="sa-sep">{isSw ? 'Malipo' : 'Payments'}</div>
              <table>
                <tbody>
                  {pays.map(p => (
                    <tr key={p.id}>
                      <td>{dShort(p.at)}</td>
                      <td>{methodLabel(p.method)}</td>
                      <td>{p.ref || '—'}</td>
                      <td>{fmt(p.amount)}</td>
                      <td><PayBadge s={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {tab === 'act' && (
        acts.length
          ? acts.map(a => (
            <div key={a.id} className="sa-log">
              <b>{a.action}</b><small>{a.by} · {dTime(a.at)}</small>
            </div>
          ))
          : <Empty text={isSw ? 'Hakuna shughuli iliyorekodiwa' : 'No recorded activity'} />
      )}
    </Sheet>
  );
}

/* ─── Main Tenants List ─────────────────────────────────── */
export function Tenants({ SS, SA, A, can, toast, onImpersonate }) {
  const { lang } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  const [q,       setQ]       = useState('');
  const [fs,      setFs]      = useState('all');
  const [fp,      setFp]      = useState('all');
  const [form,    setForm]    = useState(null);   // {t?}
  const [view,    setView]    = useState(null);   // tenant id
  const [sheet,   setSheet]   = useState(null);   // {type, t}
  const [reason,  setReason]  = useState('Non-payment');
  const [days,    setDays]    = useState(7);
  const [pwShown, setPwShown] = useState(null);
  const M = can('tenants');

  const rows = SS.tenants.filter(t => {
    const st = effStatus(t);
    const s  = q.toLowerCase();
    return (
      (fs === 'all' || st === fs) &&
      (fp === 'all' || t.plan === fp) &&
      (!s || [t.name, t.ownerName, t.phone, t.city, t.slug].some(x => (x || '').toLowerCase().includes(s)))
    );
  });

  const counts = SS.tenants.reduce((a, t) => {
    const s = effStatus(t); a[s] = (a[s] || 0) + 1; return a;
  }, {});

  const act = (type, t) => {
    if (type === 'edit')     return setForm({ t });
    if (type === 'login')    return onImpersonate(t);
    if (type === 'activate') { SA.setStatus(t.id, 'active'); return toast(t.name + (isSw ? ' imewezeshwa' : ' activated')); }
    if (type === 'pw') {
      const pw = SA.resetPassword(t.id);
      A.upsertUser(ownerUser(t, pw));
      return setPwShown({ t, pw });
    }
    setSheet({ type, t });
  };

  return (
    <>
      <div className="sa-toolbar">
        <input
          className="inp"
          placeholder={isSw ? 'Tafuta biashara, mmiliki, simu, jiji…' : 'Search business, owner, phone, city…'}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select className="inp" value={fp} onChange={e => setFp(e.target.value)}>
          <option value="all">{isSw ? 'Vifurushi vyote' : 'All packages'}</option>
          {SS.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {M && <button className="btn sm" onClick={() => setForm({})}>{isSw ? '＋ Mpangaji mpya' : '＋ New tenant'}</button>}
      </div>

      <div className="sa-pills">
        {[
          ['all',       isSw ? 'Zote' : 'All',              SS.tenants.length],
          ['active',    isSw ? 'Hai' : 'Active'],
          ['trial',     isSw ? 'Majaribio' : 'Trial'],
          ['pending',   isSw ? 'Inasubiri malipo' : 'Awaiting payment'],
          ['past_due',  isSw ? 'Imechelewa' : 'Past due'],
          ['suspended', isSw ? 'Imesimamishwa' : 'Suspended'],
          ['expired',   isSw ? 'Imeisha muda' : 'Expired'],
          ['cancelled', isSw ? 'Imefutwa' : 'Cancelled'],
        ].map(([k, l, n]) => (
          <button key={k} className={fs === k ? 'on' : ''} onClick={() => setFs(k)}>
            {l} <b>{n ?? counts[k] ?? 0}</b>
          </button>
        ))}
      </div>

      <div className="card sa-scroll" style={{ padding: 0 }}>
        <table className="sa-table">
          <thead>
            <tr>
              <th>{isSw ? 'Biashara' : 'Business'}</th>
              <th>{isSw ? 'Mmiliki' : 'Owner'}</th>
              <th>{isSw ? 'Kifurushi' : 'Package'}</th>
              <th>{isSw ? 'Hali' : 'Status'}</th>
              <th>{isSw ? 'Upyaishaji' : 'Renewal'}</th>
              <th>{isSw ? 'Matumizi' : 'Usage'}</th>
              <th style={{ textAlign: 'right' }}>{isSw ? 'Vitendo' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(t => {
              const st   = effStatus(t);
              const plan = planOf(SS.plans, t.plan);
              return (
                <tr key={t.id}>
                  <td>
                    <b style={{ cursor: 'pointer', color: 'var(--g)' }} onClick={() => setView(t.id)}>{t.name}</b>
                    <br /><small>{t.city} · {t.slug}</small>
                  </td>
                  <td>{t.ownerName}<br /><small>{t.phone}</small></td>
                  <td>{plan ? plan.name : t.plan}<br /><small>{t.cycle === 'yearly' ? (isSw ? 'mwaka' : 'yearly') : (isSw ? 'mwezi' : 'monthly')}</small></td>
                  <td><Badge s={st} /></td>
                  <td>
                    {t.trialEnds
                      ? <><small>{isSw ? 'Majaribio yanaisha' : 'Trial ends'}</small><br /><small>{dShort(t.trialEnds)}</small></>
                      : <small>{dShort(t.nextBilling)}</small>}
                  </td>
                  <td><small>{t.outlets} {isSw ? 'matawi' : 'outlets'} · {t.users} {isSw ? 'watumiaji' : 'users'}</small></td>
                  <td>
                    <div className="sa-rowacts">
                      <button title={isSw ? 'Tazama maelezo' : 'View details'}    onClick={() => setView(t.id)}>👁</button>
                      {M && <button title={isSw ? 'Hariri' : 'Edit'}           onClick={() => act('edit', t)}>✏️</button>}
                      {M && <button title={isSw ? 'Badilisha kifurushi' : 'Change package'} onClick={() => act('plan', t)}>📦</button>}
                      {can('billing') && <button title={isSw ? 'Unda ankara' : 'Create invoice'} onClick={() => act('invoice', t)}>🧾</button>}
                      {M && (st === 'suspended' || st === 'cancelled' || st === 'expired'
                        ? <button title={isSw ? 'Washa' : 'Activate'} onClick={() => act('activate', t)}>✅</button>
                        : <button title={isSw ? 'Simamisha' : 'Suspend'}  onClick={() => act('suspend', t)}>⛔</button>)}
                      {M && <button title={isSw ? 'Ongeza majaribio' : 'Extend trial'}     onClick={() => act('trial', t)}>⏳</button>}
                      {M && <button title={isSw ? 'Ingia kama mmiliki' : 'Login as owner'}   onClick={() => act('login', t)}>🔑</button>}
                      {M && <button title={isSw ? 'Weka upya nenosiri' : 'Reset password'}   onClick={() => act('pw', t)}>🔒</button>}
                      {M && <button title={isSw ? 'Futa' : 'Delete'}           onClick={() => act('delete', t)}>🗑</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan="7"><Empty icon="🔎" text={isSw ? 'Hakuna wapangaji wanaolingana na vichujio vyako' : 'No tenants match your filters'} /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {form && <TenantForm SS={SS} SA={SA} A={A} t={form.t} toast={toast} isSw={isSw} onClose={() => setForm(null)} />}
      {view && (
        <TenantView SS={SS} id={view} can={can} isSw={isSw} onClose={() => setView(null)}
          act={(type, t) => { setView(null); act(type, t); }}
        />
      )}
      {sheet?.type === 'plan' && <PlanSheet SS={SS} SA={SA} t={sheet.t} toast={toast} isSw={isSw} onClose={() => setSheet(null)} />}
      {sheet?.type === 'invoice' && <InvoiceSheet SS={SS} SA={SA} t={sheet.t} toast={toast} onClose={() => setSheet(null)} />}

      {sheet?.type === 'suspend' && (
        <Sheet title={(isSw ? 'Simamisha ' : 'Suspend ') + sheet.t.name} onClose={() => setSheet(null)} maxWidth={440}>
          <p style={{ marginTop: 0 }}>
            {isSw
              ? 'Mmiliki na wafanyakazi wote watazuiwa hadi utakapowasha akaunti tena.'
              : 'The owner and all staff will be blocked until you activate the account again.'}
          </p>
          <Field label={isSw ? 'Sababu (itaonyeshwa kwa mmiliki)' : 'Reason (shown to the owner)'}>
            <select className="inp" value={reason} onChange={e => setReason(e.target.value)}>
              {[
                ['Non-payment', isSw ? 'Kutokulipa' : 'Non-payment'],
                ['Trial ended', isSw ? 'Majaribio yameisha' : 'Trial ended'],
                ['Terms violation', isSw ? 'Ukiukaji wa masharti' : 'Terms violation'],
                ['Requested by owner', isSw ? 'Imeombwa na mmiliki' : 'Requested by owner'],
                ['Under investigation', isSw ? 'Chini ya uchunguzi' : 'Under investigation']
              ].map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
            </select>
          </Field>
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={() => setSheet(null)}>
              {isSw ? 'Ghairi' : 'Cancel'}
            </button>
            <button className="btn sm" style={{ background: '#dc2626' }} onClick={() => {
              SA.setStatus(sheet.t.id, 'suspended', reason);
              toast(sheet.t.name + (isSw ? ' imesimamishwa' : ' suspended')); setSheet(null);
            }}>
              {isSw ? 'Simamisha akaunti' : 'Suspend account'}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.type === 'trial' && (
        <Sheet title={(isSw ? 'Ongeza majaribio — ' : 'Extend trial — ') + sheet.t.name} onClose={() => setSheet(null)} maxWidth={400}>
          <Field label={isSw ? 'Ongeza siku' : 'Add days'}>
            <input className="inp" type="number" min="1" value={days} onChange={e => setDays(Number(e.target.value))} />
          </Field>
          <div className="sa-actions">
            <button className="btn ghost sm" onClick={() => setSheet(null)}>
              {isSw ? 'Ghairi' : 'Cancel'}
            </button>
            <button className="btn sm" onClick={() => {
              SA.extendTrial(sheet.t.id, days);
              toast(isSw ? `Majaribio yameongezwa kwa siku ${days}` : `Trial extended by ${days} days`); setSheet(null);
            }}>
              {isSw ? 'Ongeza' : 'Extend'}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.type === 'delete' && (
        <Confirm
          danger
          title={isSw ? 'Futa mpangaji?' : 'Delete tenant?'}
          yes={isSw ? 'Futa kabisa' : 'Delete permanently'}
          msg={isSw
            ? `Hii itaondoa ${sheet.t.name} pamoja na ankara, malipo na tiketi zake. Haiwezi kutenduliwa.`
            : `This removes ${sheet.t.name} with its invoices, payments and tickets. This cannot be undone.`}
          onNo={() => setSheet(null)}
          onYes={() => { SA.deleteTenant(sheet.t.id); setView(null); setSheet(null); toast(isSw ? 'Mpangaji amefutwa' : 'Tenant deleted'); }}
        />
      )}

      {pwShown && (
        <Sheet title={isSw ? 'Nenosiri limewekwa upya' : 'Password reset'} onClose={() => setPwShown(null)} maxWidth={420}>
          <p style={{ marginTop: 0 }}>
            {isSw
              ? <>Nenosiri jipya la muda kwa <b>{pwShown.t.ownerName}</b> ({pwShown.t.phone}):</>
              : <>New temporary password for <b>{pwShown.t.ownerName}</b> ({pwShown.t.phone}):</>}
          </p>
          <div className="sa-code">{pwShown.pw}</div>
          <p className="sa-note">
            {isSw
              ? 'Mtumie mmiliki kwa usalama. Anaweza kuingia mara moja.'
              : 'Send it to the owner securely. They can sign in immediately.'}
          </p>
          <div className="sa-actions">
            <button className="btn sm" onClick={() => setPwShown(null)}>
              {isSw ? 'Imekamilika' : 'Done'}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
