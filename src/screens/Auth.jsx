import React, { useState, useContext, useMemo } from 'react';
import { Ctx } from '../store';
import { SaaS } from '../saasStore';
import { fmt, USERS } from '../data';
import { BIZ_TYPES, REGIONS, MODULE_CATALOG, PAY_METHODS, planOf, calcInvoice, slugify, limitTxt } from '../data_saas';
import { LanguageToggle } from '../components/ui';

const STEPS_EN = [
  ['Your account',  'Owner details & password'],
  ['Your business', 'Name, location & web address'],
  ['Operations',    'Outlets, tables & order types'],
  ['Package',       'Choose the plan that fits'],
  ['Payment',       'Trial or pay now'],
  ['Review',        'Confirm & create'],
];

const STEPS_SW = [
  ['Akaunti Yako',  'Taarifa za mmiliki na nenosiri'],
  ['Biashara Yako', 'Jina, eneo na anwani ya tovuti'],
  ['Uendeshaji',    'Matawi, meza na aina za oda'],
  ['Kifurushi',     'Chagua mpango unaokufaa'],
  ['Malipo',        'Jaribio la bure au lipa sasa'],
  ['Hakiki',        'Thibitisha na ufungue'],
];

const ORDER_TYPES_EN = [
  ['dine-in',  '🍽️', 'Dine-in'],
  ['takeaway', '🥡', 'Takeaway'],
  ['delivery', '🛵', 'Delivery'],
];

const ORDER_TYPES_SW = [
  ['dine-in',  '🍽️', 'Kula Mezani'],
  ['takeaway', '🥡', 'Kuchukua Nje'],
  ['delivery', '🛵', 'Usafirishaji'],
];

const normPhone = p => p.replace(/[\s\-]/g, '').replace(/^\+?255/, '0');
const PHONE_RE  = /^0[67]\d{8}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function pwStrength(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 9) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]|[A-Z]/.test(pw)) s++;
  return s;
}

/* ─────────────────────────────────────────────────────────
   6-step registration wizard
   ───────────────────────────────────────────────────────── */
function Wizard({ done, back, goLogin }) {
  const { S, A, lang } = useContext(Ctx);
  const { SS, SA } = useContext(SaaS);
  const isSw = (lang || 'sw') === 'sw';
  const STEPS = isSw ? STEPS_SW : STEPS_EN;
  const ORDER_TYPES = isSw ? ORDER_TYPES_SW : ORDER_TYPES_EN;

  const pick = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('resto_plan_pick')) || {}; } catch { return {}; }
  }, []);

  const plans = SS.plans.filter(p => p.active);
  const [step, setStep]       = useState(0);
  const [err,  setErr]        = useState('');
  const [created, setCreated] = useState(null);

  const [f, setF] = useState({
    // step 0
    ownerName: '', phone: '', email: '', pw: '', pw2: '', showPw: false,
    // step 1
    name: '', bizType: 'Restaurant', city: 'Dar es Salaam', address: '', tin: '', vat: false, slug: '', slugEdited: false,
    // step 2
    outlets: 1, tables: 10, staff: 5, orderTypes: ['dine-in', 'takeaway'], modules: ['pos', 'waiter', 'kitchen', 'portal'],
    // step 3
    plan: pick.plan || (plans.find(p => p.popular) || plans[0] || {}).id, cycle: pick.cycle || 'monthly', promo: '',
    // step 4
    trial: true, method: 'mpesa', ref: '',
    // step 5
    terms: false,
  });

  const set    = (k, v) => { setErr(''); setF(x => ({ ...x, [k]: v })); };
  const toggle = (k, v) => set(k, f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v]);

  const phone    = normPhone(f.phone);
  const plan     = planOf(SS.plans, f.plan);
  const promoObj = SS.settings.promos.find(p => p.active && p.code === f.promo.trim().toUpperCase());
  const price    = calcInvoice(plan, f.cycle, SS.settings.vatPct, promoObj ? promoObj.pct : 0);

  const slugTaken  = SS.tenants.some(t => t.slug === f.slug);
  const phoneTaken = SS.tenants.some(t => t.phone === phone)
                  || (S.users || []).some(u => u.ph === phone)
                  || SS.admins.some(a => a.ph === phone);

  const exceeds    = p => (p.outlets !== -1 && f.outlets > p.outlets) || (p.tables !== -1 && f.tables > p.tables) || (p.users !== -1 && f.staff > p.users);
  const missingMods = p => f.modules.filter(m => !p.modules.includes(m));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recommended = useMemo(() => plans.find(p => !exceeds(p) && missingMods(p).length === 0), [f.outlets, f.tables, f.staff, f.modules]);

  const validate = n => {
    if (n === 0) {
      if (f.ownerName.trim().split(/\s+/).length < 2) return isSw ? 'Ingiza majina yako kamili (jina la kwanza na la mwisho).' : 'Enter your full name (first and last name).';
      if (!PHONE_RE.test(phone))  return isSw ? 'Ingiza namba sahihi ya simu, mf. 0712 345 678.' : 'Enter a valid mobile number, e.g. 0712 345 678.';
      if (phoneTaken)              return isSw ? 'Namba hii ya simu tayari imesajiliwa. Ingia badala yake.' : 'This phone number is already registered. Log in instead.';
      if (!EMAIL_RE.test(f.email)) return isSw ? 'Ingiza barua pepe sahihi.' : 'Enter a valid email address.';
      if (f.pw.length < 6)        return isSw ? 'Nenosiri lazima liwe na angalau herufi 6.' : 'Password must be at least 6 characters.';
      if (f.pw !== f.pw2)         return isSw ? 'Manenosiri hayafanani.' : 'Passwords do not match.';
    }
    if (n === 1) {
      if (f.name.trim().length < 3) return isSw ? 'Ingiza jina la biashara yako.' : 'Enter your business name.';
      if (!f.address.trim())        return isSw ? 'Ingiza anwani au eneo la biashara.' : 'Enter the business address or area.';
      if (f.slug.length < 3)        return isSw ? 'Anwani ya tovuti lazima iwe na angalau herufi 3.' : 'Web address must be at least 3 characters.';
      if (slugTaken)                return isSw ? 'Anwani hiyo tayari inatumika. Tafadhali chagua nyingine.' : 'That web address is taken. Please choose another.';
    }
    if (n === 2 && !f.orderTypes.length) return isSw ? 'Chagua angalau aina moja ya oda.' : 'Select at least one order type.';
    if (n === 3 && !plan)                return isSw ? 'Chagua kifurushi.' : 'Choose a package.';
    if (n === 4 && !f.trial && !f.ref.trim()) return isSw ? 'Ingiza namba ya muamala, au chagua jaribio la bure.' : 'Enter the transaction reference, or choose the free trial.';
    if (n === 5 && !f.terms) return isSw ? 'Tafadhali kubali vigezo na masharti ili kuendelea.' : 'Please accept the terms to continue.';
    return '';
  };

  const next = () => {
    const e = validate(step);
    if (e) return setErr(e);
    setErr('');
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const prev = () => { setErr(''); setStep(s => s - 1); };

  const submit = () => {
    const e = validate(5);
    if (e) return setErr(e);

    const payNow = !f.trial;
    const t = SA.createTenant({
      name: f.name.trim(), slug: f.slug, ownerName: f.ownerName.trim(), phone,
      email: f.email.trim(), city: f.city, address: f.address.trim(), tin: f.tin.trim(),
      bizType: f.bizType, outlets: f.outlets, tables: f.tables,
      orderTypes: f.orderTypes, plan: f.plan, cycle: f.cycle, source: 'wizard',
      status: payNow ? 'pending' : 'trial', invoice: payNow, payNow, markPaid: false,
      method: f.method, ref: f.ref.trim(),
      promoPct: promoObj ? promoObj.pct : 0, promo: promoObj ? promoObj.code : '',
    });

    const user = {
      id: 'own_' + t.id, role: 'owner', name: f.ownerName.trim(),
      ph: phone, pw: f.pw, email: f.email.trim(),
      title: 'Owner · ' + t.name, tenantId: t.id, tenantName: t.name,
    };
    A.upsertUser(user);

    try { sessionStorage.removeItem('resto_plan_pick'); } catch { /* ignore */ }
    setCreated({ t, user, payNow });
  };

  /* Registration closed */
  if (!SS.settings.registrationOpen) {
    return (
      <div className="au-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>🚧</div>
        <h2>{isSw ? 'Usajili umesitishwa kwa muda' : 'Sign-ups are paused'}</h2>
        <p>{isSw ? `Tafadhali wasiliana nasi kupitia ${SS.settings.supportPhone}.` : `Please contact us on ${SS.settings.supportPhone}.`}</p>
        <button className="btn" onClick={back}>{isSw ? 'Rudi mwanzo' : 'Back to home'}</button>
      </div>
    );
  }

  /* Success screen */
  if (created) {
    const { t, user, payNow } = created;
    return (
      <div className="au-card au-done">
        <div className="au-tick">✓</div>
        <h2>{isSw ? `Karibu, ${user.name.split(' ')[0]}! 🎉` : `Welcome, ${user.name.split(' ')[0]}! 🎉`}</h2>
        <p>{isSw ? <>Akaunti yako ya mgahawa <b>{t.name}</b> iko tayari.</> : <>Your restaurant account <b>{t.name}</b> is ready.</>}</p>
        <div className="au-box">
          <div><small>{isSw ? 'Tovuti ya wateja kuagiza' : 'Customer ordering portal'}</small><b>{t.slug}.{SS.settings.domain}</b></div>
          <div><small>{isSw ? 'Namba yako ya kuingia' : 'Your login'}</small><b>{user.ph}</b></div>
          <div><small>{isSw ? 'Kifurushi' : 'Package'}</small><b>{plan?.name} · {f.cycle}</b></div>
          <div><small>{isSw ? 'Hali' : 'Status'}</small><b>{payNow ? (isSw ? 'Inasubiri uthibitisho wa malipo' : 'Awaiting payment confirmation') : (isSw ? `Jaribio la bure · siku ${plan?.trialDays}` : `Free trial · ${plan?.trialDays} days`)}</b></div>
        </div>
        {payNow && (
          <p className="au-note">
            {isSw
              ? <>Tumepokea namba yako ya muamala <b>{f.ref}</b>. Timu yetu itathibitisha hivi punde. Unaweza kuanza kutumia mfumo wako sasa.</>
              : <>We received your payment reference <b>{f.ref}</b>. Our team will confirm it shortly. You can already explore your workspace.</>}
          </p>
        )}
        <div className="au-todo">
          <b>{isSw ? 'Hatua zinazofuata' : 'Next steps'}</b>
          <ol>
            <li>{isSw ? 'Fungua dashibodi yako na uongeze menyu na meza zako.' : 'Open your dashboard and add your menu and tables.'}</li>
            <li>{isSw ? 'Ongeza wafanyakazi wako: wahudumu, keshia, mpishi na mtunza stoo.' : 'Add your staff: waiters, cashier, chef and storekeeper.'}</li>
            <li>{isSw ? 'Chapisha misimbo ya QR ya meza ili wageni waagize kutoka kwenye simu zao.' : 'Print the table QR codes so guests can order from their phones.'}</li>
          </ol>
        </div>
        <button className="btn" onClick={() => done(user)}>{isSw ? 'Ingia kwenye dashibodi yangu →' : 'Enter my dashboard →'}</button>
      </div>
    );
  }

  const si = STEPS[step];

  return (
    <div className="au-wiz">
      {/* left rail */}
      <aside className="au-rail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button className="au-back" onClick={back}>‹ {isSw ? 'Mwanzo' : 'Home'}</button>
          <LanguageToggle isLight={true} />
        </div>
        <h3>{isSw ? 'Fungua akaunti ya mgahawa wako' : 'Create your restaurant account'}</h3>
        <ol>
          {STEPS.map(([t, d], i) => (
            <li key={t} className={i === step ? 'on' : i < step ? 'ok' : ''}>
              <i>{i < step ? '✓' : i + 1}</i>
              <div><b>{t}</b><small>{d}</small></div>
            </li>
          ))}
        </ol>
        <div className="au-rail-foot">
          {isSw ? 'Tayari una akaunti?' : 'Already have an account?'} <button onClick={goLogin}>{isSw ? 'Ingia' : 'Log in'}</button>
        </div>
      </aside>

      {/* main pane */}
      <section className="au-pane">
        <div className="au-prog"><i style={{ width: ((step + 1) / STEPS.length) * 100 + '%' }} /></div>
        <small className="au-stepno">{isSw ? `Hatua ya ${step + 1} kati ya ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`}</small>
        <h2>{si[0]}</h2>

        {/* ── Step 0: Account ── */}
        {step === 0 && (
          <div className="au-fields">
            <label>{isSw ? 'Jina kamili' : 'Full name'}
              <input className="inp" autoFocus value={f.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder={isSw ? 'mf. Amina Juma' : 'e.g. Amina Juma'} />
            </label>
            <label>{isSw ? 'Namba ya simu' : 'Mobile number'} <small>({isSw ? 'hii ndiyo namba ya kuingia' : 'this is your login'})</small>
              <input className="inp" inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="0712 345 678" />
            </label>
            <label>{isSw ? 'Barua pepe' : 'Email address'}
              <input className="inp" type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="you@business.co.tz" />
            </label>
            <label>{isSw ? 'Nenosiri' : 'Password'}
              <div className="au-pw">
                <input className="inp" type={f.showPw ? 'text' : 'password'} value={f.pw} onChange={e => set('pw', e.target.value)} placeholder={isSw ? 'Angalau herufi 6' : 'At least 6 characters'} />
                <button type="button" onClick={() => set('showPw', !f.showPw)}>{f.showPw ? (isSw ? 'Ficha' : 'Hide') : (isSw ? 'Onyesha' : 'Show')}</button>
              </div>
              <div className="au-meter">
                <i style={{ width: pwStrength(f.pw) * 25 + '%', background: ['#dc2626','#dc2626','#f59e0b','#16a34a','#15803d'][pwStrength(f.pw)] }} />
              </div>
            </label>
            <label>{isSw ? 'Thibitisha nenosiri' : 'Confirm password'}
              <input className="inp" type={f.showPw ? 'text' : 'password'} value={f.pw2} onChange={e => set('pw2', e.target.value)} />
            </label>
          </div>
        )}

        {/* ── Step 1: Business ── */}
        {step === 1 && (
          <div className="au-fields">
            <label>{isSw ? 'Jina la biashara' : 'Business name'}
              <input className="inp" autoFocus value={f.name}
                onChange={e => {
                  const v = e.target.value;
                  setF(x => ({ ...x, name: v, slug: x.slugEdited ? x.slug : slugify(v) }));
                  setErr('');
                }}
                placeholder={isSw ? 'mf. Safari Grill & Lounge' : 'e.g. Safari Grill & Lounge'}
              />
            </label>
            <div className="au-2">
              <label>{isSw ? 'Aina ya biashara' : 'Business type'}
                <select className="inp" value={f.bizType} onChange={e => set('bizType', e.target.value)}>
                  {BIZ_TYPES.map(b => <option key={b}>{b}</option>)}
                </select>
              </label>
              <label>{isSw ? 'Mji / Mkoa' : 'City / region'}
                <select className="inp" value={f.city} onChange={e => set('city', e.target.value)}>
                  {REGIONS.map(b => <option key={b}>{b}</option>)}
                </select>
              </label>
            </div>
            <label>{isSw ? 'Anwani / Eneo' : 'Address / area'}
              <input className="inp" value={f.address} onChange={e => set('address', e.target.value)} placeholder={isSw ? 'mf. Masaki, Toure Drive' : 'e.g. Masaki, Toure Drive'} />
            </label>
            <div className="au-2">
              <label>TIN <small>({isSw ? 'si lazima' : 'optional'})</small>
                <input className="inp" value={f.tin} onChange={e => set('tin', e.target.value)} placeholder="123-456-789" />
              </label>
              <label className="au-check">
                <input type="checkbox" checked={f.vat} onChange={e => set('vat', e.target.checked)} /> {isSw ? 'Tumesajiliwa na VAT' : 'We are VAT registered'}
              </label>
            </div>
            <label>{isSw ? 'Anwani yako ya tovuti' : 'Your web address'}
              <div className="au-slug">
                <input className="inp" value={f.slug}
                  onChange={e => { setF(x => ({ ...x, slug: slugify(e.target.value), slugEdited: true })); setErr(''); }}
                />
                <span>.{SS.settings.domain}</span>
              </div>
              <small className={f.slug.length >= 3 ? (slugTaken ? 'au-bad' : 'au-good') : ''}>
                {f.slug.length < 3 ? (isSw ? 'Inatumika kwa tovuti yako ya wateja kuagiza.' : 'Used for your customer ordering portal.')
                  : slugTaken ? (isSw ? '✕ Tayari imechukuliwa' : '✕ Already taken')
                  : (isSw ? '✓ Inapatikana — wateja wataagiza kupitia ' : '✓ Available — customers will order at ') + f.slug + '.' + SS.settings.domain}
              </small>
            </label>
          </div>
        )}

        {/* ── Step 2: Operations ── */}
        {step === 2 && (
          <div className="au-fields">
            <div className="au-3">
              {[['outlets', isSw ? 'Matawi' : 'Outlets',1,50], ['tables', isSw ? 'Meza' : 'Tables',0,500], ['staff', isSw ? 'Wafanyakazi' : 'Staff users',1,500]].map(([k,l,mn,mx]) => (
                <div key={k} className="au-stepper">
                  <small>{l}</small>
                  <div>
                    <button onClick={() => set(k, Math.max(mn, f[k] - (k === 'outlets' ? 1 : 5)))}>−</button>
                    <b>{f[k]}</b>
                    <button onClick={() => set(k, Math.min(mx, f[k] + (k === 'outlets' ? 1 : 5)))}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <b className="au-lbl">{isSw ? 'Wateja wanaagiza vipi?' : 'How do customers order?'}</b>
              <div className="au-tiles">
                {ORDER_TYPES.map(([k, ic, l]) => (
                  <button key={k} className={f.orderTypes.includes(k) ? 'on' : ''} onClick={() => toggle('orderTypes', k)}>
                    <span>{ic}</span>{l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <b className="au-lbl">{isSw ? 'Unahitaji moduli zipi?' : 'Which modules do you need?'}</b>
              <div className="au-mods">
                {MODULE_CATALOG.map(m => (
                  <label key={m.id} className={f.modules.includes(m.id) ? 'on' : ''}>
                    <input type="checkbox" checked={f.modules.includes(m.id)} onChange={() => toggle('modules', m.id)} />
                    {m.icon} {isSw && m.labelSw ? m.labelSw : m.label}
                  </label>
                ))}
              </div>
              <small>{isSw ? 'Tunatumia hii kukupendekezea kifurushi bora katika hatua inayofuata. Unaweza kubadilisha baadaye.' : 'We use this to recommend the right package in the next step. You can change it later.'}</small>
            </div>
          </div>
        )}

        {/* ── Step 3: Package ── */}
        {step === 3 && (
          <div className="au-fields">
            <div className="seg" style={{ margin: 0 }}>
              {['monthly','yearly'].map(c => (
                <button key={c} className={f.cycle === c ? 'on' : ''} onClick={() => set('cycle', c)}>
                  {c === 'yearly' ? (isSw ? 'Kwa Mwaka · miezi 2 bure' : 'Yearly · 2 months free') : (isSw ? 'Kwa Mwezi' : 'Monthly')}
                </button>
              ))}
            </div>

            <div className="au-plans">
              {plans.map(p => {
                const bad  = exceeds(p);
                const miss = missingMods(p);
                return (
                  <button key={p.id} className={'au-plan' + (f.plan === p.id ? ' on' : '')} onClick={() => set('plan', p.id)}>
                    {recommended?.id === p.id && <em>{isSw ? 'Inapendekezwa kwako' : 'Recommended for you'}</em>}
                    <b>{p.name}</b><small>{p.tag}</small>
                    <strong>{fmt(f.cycle === 'yearly' ? p.priceY : p.priceM)}<small> / {f.cycle === 'yearly' ? (isSw ? 'mwk' : 'yr') : (isSw ? 'mwz' : 'mo')}</small></strong>
                    <ul>
                      <li>{limitTxt(p.outlets)} {isSw ? 'matawi' : 'outlets'} · {limitTxt(p.users)} {isSw ? 'watumiaji' : 'users'} · {limitTxt(p.tables)} {isSw ? 'meza' : 'tables'}</li>
                      <li>{isSw ? `Moduli ${p.modules.length} · Jaribio siku ${p.trialDays}` : `${p.modules.length} modules · ${p.trialDays}-day trial`}</li>
                    </ul>
                    {(bad || miss.length > 0) && (
                      <span className="au-warn">{bad ? (isSw ? 'Chini ya mahitaji yako' : 'Below your size needs') : (isSw ? `Moduli ${miss.length} hazipo` : miss.length + ' wanted module(s) not included')}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <label>{isSw ? 'Msimbo wa punguzo' : 'Promo code'} <small>({isSw ? 'si lazima' : 'optional'})</small>
              <input className="inp" value={f.promo} onChange={e => set('promo', e.target.value.toUpperCase())} placeholder="WELCOME10" />
              {f.promo && (
                <small className={promoObj ? 'au-good' : 'au-bad'}>
                  {promoObj ? (isSw ? `✓ Punguzo la ${promoObj.pct}% kwenye ankara yako ya kwanza` : `✓ ${promoObj.pct}% off your first invoice`) : (isSw ? '✕ Msimbo si sahihi' : '✕ Code not valid')}
                </small>
              )}
            </label>
          </div>
        )}

        {/* ── Step 4: Payment ── */}
        {step === 4 && (
          <div className="au-fields">
            <div className="au-opts">
              <button className={f.trial ? 'on' : ''} onClick={() => set('trial', true)}>
                <b>🎁 {isSw ? 'Anza jaribio la bure' : 'Start free trial'}</b>
                <small>{isSw ? `Siku ${plan?.trialDays}, bila malipo sasa. Lipa ukiwa tayari.` : `${plan?.trialDays} days, no payment now. Pay when you are ready.`}</small>
              </button>
              <button className={!f.trial ? 'on' : ''} onClick={() => set('trial', false)}>
                <b>💳 {isSw ? 'Lipa sasa' : 'Pay now'}</b>
                <small>{isSw ? 'Washa akaunti mara moja baada ya kuthibitisha malipo.' : 'Activate immediately after we confirm your payment.'}</small>
              </button>
            </div>

            {!f.trial && (
              <>
                <div className="au-sum">
                  <span>{plan?.name} · {f.cycle}</span><b>{fmt(price.base)}</b>
                  {price.disc > 0 && <><span>{isSw ? 'Punguzo' : 'Promo'} {promoObj.code}</span><b>− {fmt(price.disc)}</b></>}
                  <span>VAT {SS.settings.vatPct}%</span><b>{fmt(price.vat)}</b>
                  <span><b>{isSw ? 'Jumla ya kulipa' : 'Total to pay'}</b></span><b style={{ fontSize: 18 }}>{fmt(price.total)}</b>
                </div>
                <div className="tags" style={{ marginTop: 0 }}>
                  {PAY_METHODS.slice(0, 5).map(m => (
                    <button key={m.id} className={f.method === m.id ? 'on' : ''} onClick={() => set('method', m.id)}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
                <div className="au-box">
                  <div><small>{isSw ? `Tuma ${fmt(price.total)} kwenda` : `Send ${fmt(price.total)} to`}</small><b>{SS.settings.payInfo[f.method]}</b></div>
                </div>
                <label>{isSw ? 'Namba ya Muamala / Kumbukumbu' : 'Transaction ID / reference'}
                  <input className="inp" value={f.ref} onChange={e => set('ref', e.target.value)} placeholder="e.g. QK7H2P9LM1" />
                </label>
              </>
            )}
            {f.trial && (
              <p className="au-note">{isSw ? 'Hakuna kadi wala malipo yanayohitajika. Tutakukumbusha kabla jaribio halijaisha.' : 'No card or payment needed. We will remind you before the trial ends.'}</p>
            )}
          </div>
        )}

        {/* ── Step 5: Review ── */}
        {step === 5 && (
          <div className="au-fields">
            {[
              [0, isSw ? 'Mmiliki' : 'Owner',      [f.ownerName, f.phone, f.email]],
              [1, isSw ? 'Biashara' : 'Business',  [f.name + ' · ' + f.bizType, f.address + ', ' + f.city, f.slug + '.' + SS.settings.domain]],
              [2, isSw ? 'Uendeshaji' : 'Operations', [isSw ? `Matawi ${f.outlets} · Meza ${f.tables} · Wafanyakazi ${f.staff}` : `${f.outlets} outlet(s) · ${f.tables} tables · ${f.staff} staff`, f.orderTypes.join(', '), isSw ? `Moduli ${f.modules.length} zimeombwa` : f.modules.length + ' module(s) requested']],
              [3, isSw ? 'Kifurushi' : 'Package',  [plan?.name + ' · ' + f.cycle + ' · ' + fmt(price.base), promoObj ? (isSw ? 'Punguzo ' : 'Promo ') + promoObj.code : (isSw ? 'Hakuna msimbo wa punguzo' : 'No promo code')]],
              [4, isSw ? 'Malipo' : 'Payment',     [f.trial ? (isSw ? `Jaribio la bure siku ${plan?.trialDays}` : `Free ${plan?.trialDays}-day trial`) : (isSw ? 'Lipa sasa · ' : 'Pay now · ') + fmt(price.total) + (isSw ? ' kupitia ' : ' via ') + (PAY_METHODS.find(m => m.id === f.method)?.label || f.method)]],
            ].map(([i, t, lines]) => (
              <div key={t} className="au-rev">
                <div><b>{t}</b>{lines.filter(Boolean).map(l => <small key={l}>{l}</small>)}</div>
                <button onClick={() => setStep(i)}>{isSw ? 'Hariri' : 'Edit'}</button>
              </div>
            ))}
            <label className="au-check">
              <input type="checkbox" checked={f.terms} onChange={e => set('terms', e.target.checked)} />
              {' '}{isSw ? `Nakubaliana na Vigezo vya Huduma na Sera ya Faragha ya ${SS.settings.platformName}.` : `I agree to the Terms of Service and Privacy Policy of ${SS.settings.platformName}.`}
            </label>
          </div>
        )}

        {err && <p className="err" role="alert">{err}</p>}

        <div className="au-nav">
          {step > 0 ? <button className="btn ghost" onClick={prev}>‹ {isSw ? 'Rudi' : 'Back'}</button> : <span />}
          {step < STEPS.length - 1
            ? <button className="btn" onClick={next}>{isSw ? 'Endelea ›' : 'Continue ›'}</button>
            : <button className="btn o" onClick={submit}>{isSw ? 'Fungua akaunti yangu' : 'Create my account'}</button>}
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main Auth screen (login / wizard / customer sign-up)
   ───────────────────────────────────────────────────────── */
export function Auth({ mode0, done, back }) {
  const { S, A, lang } = useContext(Ctx);
  const { SS }         = useContext(SaaS);
  const isSw = (lang || 'sw') === 'sw';

  const [m,   setM]   = useState(mode0 === 'login' ? 'login' : mode0 === 'customer' ? 'customer' : 'register');
  const [name, setName] = useState('');
  const [ph,   setPh]   = useState('');
  const [pw,   setPw]   = useState('');
  const [err,  setErr]  = useState('');

  /* Pre-fill with demo credentials */
  const demo = key => {
    const adm = SS.admins.find(a => a.role === key);
    const u   = adm || (S.users || USERS).find(x => x.role === key) || USERS.find(x => x.role === key);
    if (u) { setM('login'); setPh(u.ph); setPw(u.pw || 'demo'); setErr(''); }
  };

  const login = () => {
    setErr('');
    const p = normPhone(ph);

    /* Platform admin check */
    const adm = SS.admins.find(a => a.ph === p && a.pw === pw);
    if (adm) {
      return adm.active
        ? done({ id: adm.id, role: 'superadmin', platformRole: adm.role, name: adm.name, title: adm.title })
        : setErr(isSw ? 'Akaunti hii ya msimamizi imezimwa.' : 'This platform account is disabled.');
    }

    /* Tenant user check */
    const u = (S.users || USERS).find(x => x.ph === p && (x.pw === pw || pw === 'demo'));
    if (!u) return setErr(isSw ? 'Namba ya simu au nenosiri si sahihi. Gusa akaunti ya mfano hapa chini.' : 'Phone or password is wrong. Tap a demo account below to try.');

    if (SS.settings.maintenance) return setErr(isSw ? 'Mfumo upo kwenye matengenezo. Tafadhali jaribu tena baada ya muda mfupi.' : 'The platform is under maintenance. Please try again shortly.');

    const tid = u.tenantId || (u.role !== 'customer' ? 't1' : null);
    const t   = tid && SS.tenants.find(x => x.id === tid);
    if (t && (t.status === 'suspended' || t.status === 'cancelled')) {
      return setErr(isSw
        ? `Akaunti hii ya biashara imesitishwa (${t.status})${t.suspendReason ? ' (' + t.suspendReason + ')' : ''}. Wasiliana na msaada kupitia ${SS.settings.supportPhone}.`
        : `This business account is ${t.status}${t.suspendReason ? ' (' + t.suspendReason + ')' : ''}. Contact support on ${SS.settings.supportPhone}.`);
    }
    return done(t ? { ...u, tenantId: t.id, tenantName: t.name } : u);
  };

  const joinCustomer = () => {
    setErr('');
    const p = normPhone(ph);
    if (!name.trim() || !PHONE_RE.test(p) || pw.length < 4) {
      return setErr(isSw ? 'Ingiza jina lako kamili, namba sahihi ya simu na nenosiri la angalau herufi 4.' : 'Enter your full name, a valid phone number and a password of 4+ characters.');
    }
    if ((S.users || []).some(u => u.ph === p)) return setErr(isSw ? 'Namba hii ya simu tayari imesajiliwa. Ingia badala yake.' : 'This phone number is already registered. Log in instead.');
    const u = { id: 'u' + Date.now(), role: 'customer', name: name.trim(), ph: p, pw, title: 'Guest Member' };
    A.addUser(u);
    done(u);
  };

  if (m === 'register') return <div className="au"><Wizard done={done} back={back} goLogin={() => setM('login')} /></div>;

  return (
    <div className="au">
      <div className="au-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="au-back" onClick={back}>‹ {isSw ? 'Rudi mwanzo' : 'Back to home'}</button>
          <LanguageToggle />
        </div>
        <div className="au-logo">🍽️ {SS.settings.platformName}</div>
        <h2>{m === 'login' ? (isSw ? 'Karibu tena' : 'Welcome back') : (isSw ? 'Usajili wa Mteja' : 'Customer sign-up')}</h2>
        <p className="au-sub">
          {m === 'login'
            ? (isSw ? 'Ingia kwenye mfumo wa mgahawa wako.' : 'Log in to your restaurant workspace.')
            : (isSw ? 'Fungua akaunti ya mteja ili kuagiza na kufuatilia chakula chako.' : 'Create a customer account to order and track your meals.')}
        </p>

        <div className="seg">
          {[['login', isSw ? 'Ingia' : 'Log in'], ['customer', isSw ? 'Mimi ni mteja' : 'I\'m a customer']].map(([k, l]) => (
            <button key={k} className={m === k ? 'on' : ''} onClick={() => { setM(k); setErr(''); }}>{l}</button>
          ))}
        </div>

        {m === 'customer' && (
          <input className="inp" placeholder={isSw ? 'Jina kamili' : 'Full name'} value={name} onChange={e => setName(e.target.value)} />
        )}
        <input className="inp" placeholder={isSw ? 'Namba ya simu (mf. 0713 000 222)' : 'Phone number (e.g. 0713 000 222)'} inputMode="tel" value={ph} onChange={e => setPh(e.target.value)} />
        <input className="inp" placeholder={isSw ? 'Nenosiri' : 'Password'} type="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (m === 'login' ? login() : joinCustomer())}
        />

        {err && <p className="err" role="alert">{err}</p>}

        <button className="btn" style={{ marginTop: 10 }} onClick={m === 'login' ? login : joinCustomer}>
          {m === 'login' ? (isSw ? 'Ingia' : 'Log in') : (isSw ? 'Fungua akaunti' : 'Create account')}
        </button>

        {m === 'login' && SS.settings.registrationOpen && (
          <p className="au-sub" style={{ textAlign: 'center', marginTop: 14 }}>
            {isSw ? 'Mgahawa mpya?' : 'New restaurant?'} <button className="au-linkb" onClick={() => setM('register')}>{isSw ? 'Fungua akaunti ya biashara' : 'Create a business account'}</button>
          </p>
        )}

        {m === 'login' && (
          <div style={{ marginTop: 16 }}>
            <small style={{ fontWeight: 600, color: 'var(--mut)', display: 'block', marginBottom: 6 }}>
              {isSw ? 'Akaunti za mfano kwa kubonyeza mara moja (nenosiri "demo"):' : '1-tap demo accounts (password "demo"):'}
            </small>
            <div className="tags">
              {[
                ['superadmin', isSw ? '🛡️ Msimamizi Mkuu' : '🛡️ Super Admin'],
                ['billing',    isSw ? '💰 Malipo' : '💰 Billing'],
                ['support',    isSw ? '🎧 Msaada' : '🎧 Support'],
                ['owner',      isSw ? '🏢 Mmiliki' : '🏢 Owner'],
                ['manager',    isSw ? '👔 Meneja' : '👔 Manager'],
                ['cashier',    isSw ? '💳 Keshia' : '💳 Cashier'],
                ['waiter',     isSw ? '🧑‍🍳 Mhudumu' : '🧑‍🍳 Waiter'],
                ['chef',       isSw ? '🍳 Mpishi' : '🍳 Chef'],
                ['storekeeper',isSw ? '📦 Stoo' : '📦 Store'],
                ['production', isSw ? '🏭 Uzalishaji' : '🏭 CK'],
                ['customer',   isSw ? '🍽️ Mteja' : '🍽️ Customer'],
              ].map(([r, l]) => (
                <button key={r} onClick={() => demo(r)}>{l}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
