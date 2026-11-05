import React, { useState, useContext } from 'react';
import { USERS, fmt } from '../data';
import { Install, Sheet, LanguageToggle } from '../components/ui';
import { SaaS } from '../saasStore';
import { Ctx } from '../store';
import { MODULE_CATALOG, limitTxt } from '../data_saas';

const FEATURES_EN = [
  ['📱', 'QR ordering & customer portal',    'Every restaurant gets its own branded ordering site, created automatically. Guests scan, order and pay from their phone.'],
  ['🧑‍🍳', 'Waiter app with commissions',     'Take orders at the table on a phone or tablet. Track each waiter\'s sales and commission in real time.'],
  ['🍳', 'Kitchen display (KDS)',             'Orders flow straight to the kitchen screen with timers, 86-ing and ready alerts.'],
  ['📦', 'Stock, recipes & purchasing',       'Sales deplete ingredients through recipes. Raise purchase orders, receive goods and see what is left, live.'],
  ['🏭', 'Central kitchen & production',      'Mix raw materials into finished goods with bills of materials, batches and costing.'],
  ['💲', 'Accounting with VAT',               'Sales, expenses, P&L and VAT ready for your accountant — no double entry.'],
  ['👤', 'HR & payroll',                       'Staff records, shifts, attendance and payroll in the same system as sales.'],
  ['🌍', 'Multi-site head office',            'See every branch side by side: revenue, food cost and performance for the owner.'],
];

const FEATURES_SW = [
  ['📱', 'Kuagiza kwa QR & Tovuti ya Mteja',  'Kila mgahawa unapata tovuti yake ya kuagiza kiotomatiki. Wageni wanachanganua QR, wanaagiza na kulipa kupitia simu zao.'],
  ['🧑‍🍳', 'App ya Mhudumu & Kamisheni',      'Chukua oda mezani kwa simu au tableti. Fuatilia mauzo na kamisheni ya kila mhudumu papo hapo.'],
  ['🍳', 'Skrini ya Jikoni (KDS)',             'Oda zinaenda moja kwa moja jikoni zikiwa na muda wa kupika, kufunga vyakula vilivyoisha (86) na arifa za utayari.'],
  ['📦', 'Stoo, Mapishi & Manunuzi',           'Mauzo yanapunguza viungo kulingana na mapishi. Tengeneza LPO, pokea mzigo na uone salio la stoo mubashara.'],
  ['🏭', 'Jiko Kuu & Uzalishaji',              'Changanya malighafi kutengeneza bidhaa kamili kwa kutumia BOM, bachi na gharama halisi.'],
  ['💲', 'Uhasibu na Kodi ya VAT',             'Mauzo, matumizi, ripoti ya faida (P&L) na VAT tayari kwa mhasibu wako — bila kurudia kuingiza.'],
  ['👤', 'Wafanyakazi (HR) & Mishahara',       'Kumbukumbu za wafanyakazi, zamu, mahudhurio na mishahara katika mfumo mmoja na mauzo.'],
  ['🌍', 'Makao Makuu (Matawi Mengi)',         'Linganisha matawi yote kwa pamoja: mapato, gharama ya chakula na ufanisi kwa mmiliki.'],
];

const STEPS_EN = [
  ['1', 'Register',       'Create your account with our 6-step wizard in about 3 minutes.'],
  ['2', 'Choose a package', 'Start a free trial or pay with M-Pesa, Mixx by Yas, Airtel Money or bank.'],
  ['3', 'Set up',         'Add your menu, tables and staff. Your customer portal is live instantly.'],
  ['4', 'Go live',        'Take orders, run the kitchen and watch your numbers from any device.'],
];

const STEPS_SW = [
  ['1', 'Jisajili',         'Fungua akaunti yako kwa hatua 6 rahisi ndani ya dakika 3 tu.'],
  ['2', 'Chagua Kifurushi', 'Anza jaribio la bure au lipa kwa M-Pesa, Mixx by Yas, Airtel Money au benki.'],
  ['3', 'Weka Mipangilio',  'Ongeza menyu, meza na wafanyakazi. Tovuti yako ya wateja inaanza kufanya kazi papo hapo.'],
  ['4', 'Anza Kazi',        'Pokea oda, endesha jiko na fuatilia hesabu zako kutoka kifaa chochote.'],
];

const FAQ_EN = [
  ['Do I need to pay to start?',             'No. Every package starts with a free trial and no card is needed. You only pay when you decide to continue.'],
  ['How do I pay for my subscription?',      'Pay with M-Pesa, Mixx by Yas (Tigo Pesa), Airtel Money, bank transfer or card. Submit your transaction reference inside the app and our team confirms it and activates your account.'],
  ['Can I change my package later?',         'Yes. Upgrade or downgrade any time from Subscription & Billing. Yearly billing gives you 2 months free.'],
  ['Does it work on a phone?',               'RestoERP installs as an app on Android and iPhone and works on tablets and computers too.'],
  ['Is my data separate from other restaurants?', 'Yes. Each business is its own tenant with its own users, menu, stock and reports.'],
  ['What happens if I stop paying?',         'You get reminders and a grace period first. After that the account is suspended. Nothing is deleted, and it is restored as soon as payment is confirmed.'],
];

const FAQ_SW = [
  ['Je, nahitaji kulipa ili kuanza?',        'Hapana. Kila kifurushi kinaanza na jaribio la bure bila kuhitaji kadi. Unalipa tu unapoamua kuendelea.'],
  ['Ninalipaje usajili wangu?',              'Lipa kwa M-Pesa, Mixx by Yas (Tigo Pesa), Airtel Money, benki au kadi. Weka namba ya muamala ndani ya app na timu yetu itathibitisha na kuwasha akaunti yako.'],
  ['Je, naweza kubadili kifurushi baadaye?', 'Ndiyo. Pandisha au shusha kifurushi wakati wowote kupitia Usajili & Malipo. Malipo ya mwaka yanakupa miezi 2 bure.'],
  ['Je, inafanya kazi kwenye simu?',         'RestoERP inasakinishwa kama app kwenye Android na iPhone na inafanya kazi kwenye tableti na kompyuta pia.'],
  ['Je, taarifa zangu zimetengwa na migahawa mingine?', 'Ndiyo. Kila biashara ina mazingira yake binafsi yenye watumiaji, menyu, stoo na ripoti zake.'],
  ['Nini kinatokea nikisitisha malipo?',      'Utapata vikumbusho na muda wa nyongeza kwanza. Baada ya hapo akaunti itasimamishwa kwa muda. Hakuna kinachofutwa, na inarejeshwa mara tu malipo yakithibitishwa.'],
];

const ROLES_EN = [
  ['🏢', 'Owner / HQ',    'Group P&L, sites, subscription'],
  ['👔', 'Manager',        'Daily analytics, approvals, staff'],
  ['🧑‍🍳', 'Waiter',      'Tablet ordering, tips, commission'],
  ['🍳', 'Chef',           'Kitchen tickets and prep'],
  ['💳', 'Cashier',        'Bills, split pay, cash-up'],
  ['📦', 'Storekeeper',    'Receiving, transfers, stock count'],
  ['🏭', 'Production',     'Recipes, batches, costing'],
  ['📱', 'Customers',      'QR menu, order, track, pay'],
];

const ROLES_SW = [
  ['🏢', 'Mmiliki / HQ',   'Faida ya kikundi, matawi, usajili'],
  ['👔', 'Meneja',         'Takwimu za kila siku, idhini, wafanyakazi'],
  ['🧑‍🍳', 'Mhudumu',     'Oda za tableti, bakshishi, kamisheni'],
  ['🍳', 'Mpishi',         'Tiketi za jikoni na maandalizi'],
  ['💳', 'Keshia',         'Bili, malipo mseto, kufunga hesabu'],
  ['📦', 'Mtunza Stoo',    'Kupokea mzigo, uhamisho, hesabu ya stoo'],
  ['🏭', 'Uzalishaji',     'Mapishi, bachi, gharama'],
  ['📱', 'Wateja',         'Menyu ya QR, agiza, fuatilia, lipa'],
];

const ROLE_ICON = { customer: '🍽️', waiter: '🧑‍🍳', chef: '🍳', production: '🏭', cashier: '💳', storekeeper: '📦', manager: '👔' };

export function Landing({ go, onDirectRole }) {
  const { SS } = useContext(SaaS);
  const { lang } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  const FEATURES = isSw ? FEATURES_SW : FEATURES_EN;
  const STEPS = isSw ? STEPS_SW : STEPS_EN;
  const FAQ = isSw ? FAQ_SW : FAQ_EN;
  const ROLES = isSw ? ROLES_SW : ROLES_EN;
  const [cycle, setCycle]   = useState('monthly');
  const [demo,  setDemo]    = useState(false);
  const [faq,   setFaq]     = useState(-1);
  const [menu,  setMenu]    = useState(false);

  const plans = SS.plans.filter(p => p.active);
  const open  = SS.settings.registrationOpen;

  const scroll = id => {
    setMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const start = planId => {
    try { sessionStorage.setItem('resto_plan_pick', JSON.stringify({ plan: planId, cycle })); } catch { /* ignore */ }
    go('auth:register');
  };

  const admins    = ['superadmin', 'billing', 'support']
    .map(r => SS.admins.find(a => a.role === r && a.active))
    .filter(Boolean);
  const adminSess = a => ({ id: a.id, role: 'superadmin', platformRole: a.role, name: a.name, title: a.title, ph: a.ph, pw: a.pw });

  return (
    <div className="lp">
      {/* ── NAV ── */}
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <div className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span>🍽️</span> {SS.settings.platformName}
          </div>
          <nav className={menu ? 'open' : ''}>
            <button onClick={() => scroll('features')}>{isSw ? 'Sifa' : 'Features'}</button>
            <button onClick={() => scroll('modules')}>{isSw ? 'Moduli' : 'Modules'}</button>
            <button onClick={() => scroll('pricing')}>{isSw ? 'Bei' : 'Pricing'}</button>
            <button onClick={() => scroll('faq')}>{isSw ? 'Maswali' : 'FAQ'}</button>
            <button className="lp-only-m" onClick={() => go('auth:login')}>{isSw ? 'Ingia' : 'Log in'}</button>
          </nav>
          <div className="lp-nav-cta">
            <LanguageToggle />
            <button className="lp-btn ghost sm lp-hide-m" onClick={() => go('auth:login')}>{isSw ? 'Ingia' : 'Log in'}</button>
            {open && <button className="lp-btn sm" onClick={() => start('')}>{isSw ? 'Anza Jaribio la Bure' : 'Start free trial'}</button>}
            <button className="lp-burger" onClick={() => setMenu(!menu)} aria-label="Menu">☰</button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-in">
          <div>
            <span className="lp-eyebrow">{isSw ? 'Mfumo wa ERP Mtandaoni kwa Migahawa · Imetengenezwa Tanzania' : 'Cloud ERP for restaurants · Made in Tanzania'}</span>
            <h1>{isSw ? <>Endesha mgahawa wako wote katika <em>jukwaa moja</em></> : <>Run your whole restaurant from <em>one platform</em></>}</h1>
            <p>{isSw ? 'Oda, jiko, stoo, uzalishaji, uhasibu na wafanyakazi — vyote vimeunganishwa. Wateja wako wanapata tovuti ya kuagiza mara tu unapojisajili.' : 'Orders, kitchen, stock, production, accounting and staff — all connected. Your customers get a branded ordering site the moment you sign up.'}</p>
            <div className="lp-cta">
              {open
                ? <button className="lp-btn big" onClick={() => start('')}>{isSw ? 'Anza jaribio lako la bure' : 'Start your free trial'}</button>
                : <button className="lp-btn big" disabled>{isSw ? 'Usajili umesitishwa kwa muda' : 'Sign-ups paused'}</button>}
              <button className="lp-btn ghost big" onClick={() => setDemo(true)}>▶ {isSw ? 'Jaribu mfumo mubashara' : 'Try the live demo'}</button>
            </div>
            <ul className="lp-trust">
              <li>✓ {isSw ? 'Jaribio la bure, bila kadi' : 'Free trial, no card'}</li>
              <li>✓ M-Pesa · Mixx · Airtel Money</li>
              <li>✓ {isSw ? 'Inafanya kazi kwenye simu & tableti' : 'Works on phone & tablet'}</li>
            </ul>
          </div>

          {/* Mock dashboard */}
          <div className="lp-mock" aria-hidden="true">
            <div className="lp-mock-top"><i /><i /><i /><span>Safari Grill · {isSw ? 'Leo' : 'Today'}</span></div>
            <div className="lp-mock-kpis">
              {[[isSw ? 'Mauzo' : 'Sales', 'TSh 1.84M'], [isSw ? 'Oda' : 'Orders', '48'], [isSw ? 'Gharama Chakula' : 'Food cost', '29%']].map(([a, b]) => (
                <div key={a}><small>{a}</small><b>{b}</b></div>
              ))}
            </div>
            <div className="lp-mock-chart">
              {[40, 62, 48, 80, 66, 92, 74].map((h, i) => <i key={i} style={{ height: h + '%' }} />)}
            </div>
            <div className="lp-mock-rows">
              {[[isSw ? '#1042 · Meza 5' : '#1042 · Table 5', isSw ? 'Inapikwa' : 'Cooking', '#f59e0b'], [isSw ? '#1043 · Usafirishaji' : '#1043 · Delivery', isSw ? 'Tayari' : 'Ready', '#16a34a'], [isSw ? '#1044 · Meza 2' : '#1044 · Table 2', isSw ? 'Mpya' : 'New', '#2563eb']].map(([a, b, c]) => (
                <div key={a}><span>{a}</span><u style={{ background: c + '22', color: c }}>{b}</u></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="lp-strip">
        <div className="lp-wrap">
          {[
            ['10', isSw ? 'moduli zilizounganishwa' : 'connected modules'],
            ['3', isSw ? 'aina za oda: mezani, kuchukua, usafirishaji' : 'order types: dine-in, takeaway, delivery'],
            [isSw ? 'Dakika 10' : '10 min', isSw ? 'kutoka kujisajili hadi oda ya kwanza' : 'from sign-up to first order'],
            ['24/7', isSw ? 'ufikiaji mtandaoni kwenye kifaa chochote' : 'cloud access on any device']
          ].map(([a, b]) => (
            <div key={b}><b>{a}</b><span>{b}</span></div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-sec">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow dark">{isSw ? 'Kila kitu mahali pamoja' : 'Everything in one place'}</span>
            <h2>{isSw ? 'Imejengwa kwa jinsi migahawa inavyofanya kazi' : 'Built for how restaurants really work'}</h2>
            <p>{isSw ? 'Acha kuhangaika na POS, majedwali na madaftari. Mfumo mmoja wa oda unaendesha kila skrini.' : 'Stop juggling a POS, spreadsheets and notebooks. One order engine powers every screen.'}</p>
          </div>
          <div className="lp-feat">
            {FEATURES.map(([ic, t, d]) => (
              <div key={t} className="lp-card">
                <div className="lp-ic">{ic}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES / ROLES ── */}
      <section id="modules" className="lp-sec alt">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow dark">{isSw ? 'Skrini kwa kila jukumu' : 'A screen for every role'}</span>
            <h2>{isSw ? 'Mmiliki, meneja, mhudumu, mpishi, keshia, mtunza stoo' : 'Owner, manager, waiter, chef, cashier, storekeeper'}</h2>
            <p>{isSw ? 'Kila mfanyakazi anaingia na kuona zana anazohitaji pekee.' : 'Each team member signs in and sees only the tools they need.'}</p>
          </div>
          <div className="lp-roles">
            {ROLES.map(([ic, t, d]) => (
              <div key={t}><span>{ic}</span><b>{t}</b><small>{d}</small></div>
            ))}
          </div>
          <div className="lp-mods">
            {MODULE_CATALOG.map(m => <span key={m.id}>{m.icon} {isSw && m.labelSw ? m.labelSw : m.label}</span>)}
          </div>
        </div>
      </section>

      {/* ── STEPS ── */}
      <section className="lp-sec">
        <div className="lp-wrap">
          <div className="lp-head"><h2>{isSw ? 'Anza kutumia kwa hatua nne' : 'Up and running in four steps'}</h2></div>
          <div className="lp-steps">
            {STEPS.map(([n, t, d]) => (
              <div key={n}><i>{n}</i><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="lp-sec alt">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-eyebrow dark">{isSw ? 'Bei rahisi' : 'Simple pricing'}</span>
            <h2>{isSw ? 'Chagua kifurushi kinachofaa biashara yako' : 'Pick a package that fits your business'}</h2>
            <p>{isSw ? `Bei ni kwa Shilingi ya Tanzania (TSh), bila kujumuisha VAT ${SS.settings.vatPct}%. Kila kifurushi kinaanza na jaribio la bure.` : `Prices in Tanzanian shillings, excluding ${SS.settings.vatPct}% VAT. Every package starts with a free trial.`}</p>
            <div className="lp-toggle">
              <button className={cycle === 'monthly' ? 'on' : ''} onClick={() => setCycle('monthly')}>{isSw ? 'Kwa Mwezi' : 'Monthly'}</button>
              <button className={cycle === 'yearly'  ? 'on' : ''} onClick={() => setCycle('yearly')}>{isSw ? <>Kwa Mwaka <em>miezi 2 bure</em></> : <>Yearly <em>2 months free</em></>}</button>
            </div>
          </div>

          <div className="lp-plans">
            {plans.map(p => (
              <div key={p.id} className={'lp-plan' + (p.popular ? ' pop' : '')}>
                {p.popular && <span className="lp-pop">{isSw ? 'Kinachopendwa Zaidi' : 'Most popular'}</span>}
                <h3>{p.name}</h3>
                <p className="lp-tag">{p.tag}</p>
                <div className="lp-amt">
                  {fmt(cycle === 'yearly' ? p.priceY : p.priceM)}
                  <small>/{cycle === 'yearly' ? (isSw ? 'mwaka' : 'year') : (isSw ? 'mwezi' : 'month')}</small>
                </div>
                <ul>
                  {p.features.map(f => <li key={f}>{f}</li>)}
                  <li>{isSw ? `Moduli ${p.modules.length} kati ya ${MODULE_CATALOG.length}` : `${p.modules.length} of ${MODULE_CATALOG.length} modules`}</li>
                  <li>{isSw ? `Jaribio la bure siku ${p.trialDays}` : `${p.trialDays}-day free trial`}</li>
                </ul>
                <button
                  className={'lp-btn' + (p.popular ? '' : ' ghost')}
                  disabled={!open}
                  onClick={() => start(p.id)}
                >
                  {open ? (isSw ? 'Anza Jaribio la Bure' : 'Start free trial') : (isSw ? 'Usajili umesitishwa' : 'Sign-ups paused')}
                </button>
              </div>
            ))}
          </div>

          <p className="lp-center">
            {isSw
              ? <>Unahitaji matawi zaidi ya {limitTxt((plans[plans.length - 2] || plans[0] || {}).outlets ?? 5)}? <a href={'tel:' + SS.settings.supportPhone}>Piga {SS.settings.supportPhone}</a> kupata bei maalum.</>
              : <>Need more than {limitTxt((plans[plans.length - 2] || plans[0] || {}).outlets ?? 5)} outlets? <a href={'tel:' + SS.settings.supportPhone}>Call {SS.settings.supportPhone}</a> for a custom quote.</>}
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="lp-sec">
        <div className="lp-wrap lp-faq">
          <div className="lp-head"><h2>{isSw ? 'Maswali Yanayoulizwa Mara kwa Mara' : 'Questions, answered'}</h2></div>
          {FAQ.map(([q, a], i) => (
            <div key={q} className={'lp-q' + (faq === i ? ' on' : '')}>
              <button onClick={() => setFaq(faq === i ? -1 : i)}>
                {q}<span>{faq === i ? '−' : '+'}</span>
              </button>
              {faq === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="lp-band">
        <div className="lp-wrap">
          <h2>{isSw ? 'Uko tayari kuendesha mgahawa wako kisasa?' : 'Ready to put your restaurant on autopilot?'}</h2>
          <p>{isSw ? 'Fungua akaunti yako kwa dakika chache. Bila kadi, bila mkataba.' : 'Create your account in minutes. No card, no contract.'}</p>
          <div className="lp-cta" style={{ justifyContent: 'center' }}>
            {open && <button className="lp-btn big light" onClick={() => start('')}>{isSw ? 'Fungua akaunti yangu' : 'Create my account'}</button>}
            <button className="lp-btn ghost big light" onClick={() => setDemo(true)}>{isSw ? 'Jaribu mfumo' : 'Explore the demo'}</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <div>
            <div className="lp-logo light"><span>🍽️</span> {SS.settings.platformName}</div>
            <p>{isSw ? <>Jukwaa la ERP &amp; SaaS kwa Migahawa.<br />Bidhaa ya FJB's Softtech Limited.</> : <>The restaurant ERP &amp; SaaS platform.<br />A product of FJB's Softtech Limited.</>}</p>
          </div>
          <div>
            <b>{isSw ? 'Mawasiliano' : 'Contact'}</b>
            <a href={'tel:' + SS.settings.supportPhone}>📞 {SS.settings.supportPhone}</a>
            <a href={'mailto:' + SS.settings.supportEmail}>✉️ {SS.settings.supportEmail}</a>
          </div>
          <div>
            <b>{isSw ? 'Ufikiaji' : 'Access'}</b>
            <button onClick={() => go('auth:login')}>{isSw ? 'Ingia' : 'Log in'}</button>
            {open && <button onClick={() => start('')}>{isSw ? 'Sajili mgahawa wako' : 'Register your restaurant'}</button>}
            <button onClick={() => setDemo(true)}>{isSw ? 'Mfumo wa Mfano' : 'Live demo'}</button>
            <Install cls="lp-foot-install" />
          </div>
        </div>
        <div className="lp-wrap lp-copy">
          © {new Date().getFullYear()} FJB's Softtech Limited. {isSw ? 'Haki zote zimehifadhiwa.' : 'All rights reserved.'}
        </div>
      </footer>

      {/* ── DEMO SHEET ── */}
      {demo && (
        <Sheet
          title={isSw ? 'Mfumo wa Mfano — chagua jukumu' : 'Live demo — choose a role'}
          subtitle={isSw ? 'Ingia moja kwa moja bila nenosiri. Taarifa za mfano zinahifadhiwa kwenye kivinjari hiki pekee.' : 'Instant access, no password. Demo data is saved only in this browser.'}
          onClose={() => setDemo(false)}
          maxWidth={620}
        >
          <div className="roles-list-grid">
            {admins.map(a => (
              <button
                key={a.id}
                className="role-select-card"
                onClick={() => { setDemo(false); onDirectRole(adminSess(a)); }}
              >
                <div className="role-icon">🛡️</div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <small style={{ color: 'var(--mut)' }}>
                    {a.role === 'superadmin' ? (isSw ? 'Msimamizi Mkuu — anasimamia wapangaji na malipo yote' : 'Platform Super Admin — manages all tenants & payments')
                      : a.role === 'billing'    ? (isSw ? 'Afisa wa Malipo ya Jukwaa' : 'Platform billing officer')
                      : (isSw ? 'Mhudumu wa Msaada kwa Wateja' : 'Platform support agent')}
                  </small>
                </div>
                <span style={{ color: 'var(--g)', fontSize: 13, fontWeight: 600 }}>{isSw ? 'Fungua ▸' : 'Launch ▸'}</span>
              </button>
            ))}
            {USERS.map(u => (
              <button
                key={u.id}
                className="role-select-card"
                onClick={() => { setDemo(false); onDirectRole(u); }}
              >
                <div className="role-icon">{ROLE_ICON[u.role] || '🏢'}</div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <small style={{ color: 'var(--mut)' }}>{u.title} ({u.role})</small>
                </div>
                <span style={{ color: 'var(--g)', fontSize: 13, fontWeight: 600 }}>{isSw ? 'Fungua ▸' : 'Launch ▸'}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
