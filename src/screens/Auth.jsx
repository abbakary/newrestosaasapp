import React, { useState, useContext, useEffect } from 'react';
import { Ctx } from '../store';
import { USERS, PACKAGES, fmt } from '../data';
import { LanguageToggle } from '../components/ui';

export function Auth({ mode0, defaultPackageId, done, back }) {
  const { S, A, lang } = useContext(Ctx);
  const isSw = lang === 'sw';
  const [m, setM] = useState(mode0 || 'login'); // 'login' | 'register'
  const [regType, setRegType] = useState('tenant'); // 'tenant' (new restaurant owner) | 'staff' (employee joining existing)

  // Login form state
  const [loginPh, setLoginPh] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [err, setErr] = useState('');

  // ── Multi-Step Wizard State (for Tenant Registration) ──
  const [step, setStep] = useState(1);

  // Step 1: Admin Credentials
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Step 2: Restaurant Identity
  const [restoName, setRestoName] = useState('');
  const [slug, setSlug] = useState('');
  const [concept, setConcept] = useState('Dine-in Flame Grill & Lounge');
  const [city, setCity] = useState('Dar es Salaam');
  const [country, setCountry] = useState('Tanzania');
  const [currency, setCurrency] = useState('TSh');
  const [logoEmoji, setLogoEmoji] = useState('🍽️');

  // Step 3: Package & Plan Selection
  const [packageId, setPackageId] = useState(defaultPackageId || 'pkg_growth');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  // Step 4: Outlets & Operational Setup
  const [branchName, setBranchName] = useState('Main Branch');
  const [tablesCount, setTablesCount] = useState(16);
  const [staffCount, setStaffCount] = useState(10);
  const [seedDemoData, setSeedDemoData] = useState(true);

  // Step 5: Activation & Payment
  const [paymentChoice, setPaymentChoice] = useState('trial'); // 'trial' | 'mpesa' | 'card' | 'bank'
  const [paymentPhone, setPaymentPhone] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Staff Quick Registration state (for employee tab)
  const [staffRole, setStaffRole] = useState('waiter');
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('demo');

  useEffect(() => {
    if (defaultPackageId) {
      setPackageId(defaultPackageId);
    }
  }, [defaultPackageId]);

  const packages = S.packages || PACKAGES;
  const selectedPkg = packages.find(p => p.id === packageId) || packages[1];
  const pkgPrice = billingCycle === 'annual' ? selectedPkg.priceAnnual : selectedPkg.priceMonthly;

  const demoLogin = (roleKey) => {
    setErr('');
    const allUsers = S.users && S.users.length ? S.users : USERS;
    const u = allUsers.find(x => x.role === roleKey) || USERS.find(x => x.role === roleKey);
    if (u) {
      setM('login');
      setLoginPh(u.ph);
      setLoginPw(u.pw || 'demo');
    }
  };

  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault();
    setErr('');
    const cleanPh = loginPh.replace(/\s/g, '');

    const allUsers = S.users && S.users.length ? S.users : USERS;
    const u = allUsers.find(x => x.ph === cleanPh && (x.pw === loginPw || x.pw === 'demo' || loginPw === 'demo'));

    if (u) {
      done(u);
    } else {
      setErr('Invalid phone or password. Use demo passwords ("demo") or click a quick persona button below.');
    }
  };

  const handleRestoNameChange = (val) => {
    setRestoName(val);
    if (!slug || slug === restoName.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    }
    if (!branchName || branchName === 'Main Branch') {
      setBranchName(`${val} · Flagship`);
    }
  };

  // Step validation
  const nextStep = () => {
    setErr('');
    if (step === 1) {
      if (!adminName.trim()) return setErr('Please enter your full legal name');
      if (!adminPhone.trim()) return setErr('Please enter your mobile phone number');
      if (!adminPassword || adminPassword.length < 4) return setErr('Password must be at least 4 characters');
      setStep(2);
    } else if (step === 2) {
      if (!restoName.trim()) return setErr('Please enter your Restaurant / Business name');
      if (!slug.trim()) setSlug(restoName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const prevStep = () => {
    setErr('');
    if (step > 1) setStep(step - 1);
  };

  // Final Tenant Submission
  const handleWizardSubmit = (e) => {
    if (e) e.preventDefault();
    if (!agreedTerms) return setErr('You must agree to the Terms of Service to proceed.');

    const isTrial = paymentChoice === 'trial';
    const tenantPayload = {
      name: restoName,
      slug: slug || restoName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      concept,
      packageId,
      billingCycle,
      status: isTrial ? 'trial' : 'active',
      isTrial,
      city,
      country,
      currency,
      adminName,
      adminEmail: adminEmail || `${slug || 'admin'}@restoerp.tz`,
      adminPhone: adminPhone.replace(/\s/g, ''),
      adminPassword,
      branchesCount: 1,
      tablesCount: Number(tablesCount) || 16,
      staffCount: Number(staffCount) || 10,
      logoEmoji,
      paymentMethod: isTrial ? '14-Day Free Trial' : (paymentChoice === 'mpesa' ? 'M-Pesa Lipa Namba' : paymentChoice === 'card' ? 'Visa / Mastercard' : 'Bank Wire'),
      paymentRef: isTrial ? 'TRIAL-INIT' : (paymentChoice === 'mpesa' ? 'MPESA-' + Math.floor(100000 + Math.random() * 900000) : null),
      notes: `Registered via Self-Service Wizard. Flagship branch: ${branchName}`
    };

    A.createTenant(tenantPayload, 'Self-Service Wizard');

    const newUser = {
      id: 'u_' + Date.now(),
      role: 'owner',
      name: adminName,
      ph: adminPhone.replace(/\s/g, ''),
      pw: adminPassword,
      title: 'Restaurant Owner & CEO',
      email: adminEmail,
      tenantId: 'tenant_' + Date.now()
    };

    done(newUser);
  };

  // Staff Quick Registration
  const handleStaffRegister = (e) => {
    if (e) e.preventDefault();
    if (!staffName || !staffPhone) return setErr('Enter your full name and phone number');

    const u = {
      id: 'u_' + Date.now(),
      role: staffRole,
      name: staffName,
      ph: staffPhone.replace(/\s/g, ''),
      pw: staffPassword || 'demo',
      wid: staffRole === 'waiter' ? 'w_' + Date.now() : undefined,
      title: staffRole === 'waiter' ? 'Staff Waiter' : staffRole === 'cashier' ? 'Cashier' : staffRole === 'chef' ? 'Kitchen Cook' : 'Storekeeper'
    };

    A.addUser(u);
    done(u);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
      {/* Top back button and Language Toggle */}
      <div style={{ maxWidth: 640, width: '100%', margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={back}
          style={{
            background: 'none',
            border: 'none',
            color: '#38bdf8',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 0'
          }}
        >
          ‹ {isSw ? 'Rudi Mwanzo' : 'Back to Home'}
        </button>
        <LanguageToggle />
      </div>

      <div style={{
        maxWidth: 640,
        width: '100%',
        margin: '0 auto',
        background: '#1e293b',
        borderRadius: 20,
        border: '1px solid #334155',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Header Strip */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          padding: '24px 24px 18px',
          borderBottom: '1px solid #334155',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(124,58,237,0.2)',
            padding: '4px 12px',
            borderRadius: 99,
            border: '1px solid rgba(124,58,237,0.4)',
            color: '#c4b5fd',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 8
          }}>
            <span>🍽️</span> RestoERP Cloud Platform
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0', color: '#fff' }}>
            {m === 'login' ? (isSw ? 'Karibu Tena · Ingia Kwenye Mfumo' : 'Welcome Back · Sign In') : (isSw ? 'Fungua Akaunti ya Mgahawa' : 'Create Restaurant Cloud Account')}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
            {m === 'login'
              ? (isSw ? 'Ingia kwenye POS, KDS ya Jikoni, Stoo, au Dashibodi ya Usimamizi' : 'Access your restaurant POS, Kitchen KDS, Inventory, or System Provider Console')
              : (isSw ? 'Anza kutumia mfumo wa ERP wa migahawa na majaribio ya bure ya siku 14' : 'Launch your multi-branch restaurant ERP with 14-day free trial')}
          </p>

          {/* Toggle between Login and Register */}
          <div style={{
            display: 'flex',
            background: '#0f172a',
            padding: 3,
            borderRadius: 10,
            maxWidth: 340,
            margin: '18px auto 0',
            border: '1px solid #334155'
          }}>
            <button
              onClick={() => { setM('login'); setErr(''); }}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                background: m === 'login' ? '#7c3aed' : 'transparent',
                color: m === 'login' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all .15s'
              }}
            >
              {isSw ? 'Ingia' : 'Sign In'}
            </button>
            <button
              onClick={() => { setM('register'); setErr(''); }}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                background: m === 'register' ? '#7c3aed' : 'transparent',
                color: m === 'register' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all .15s'
              }}
            >
              {isSw ? 'Sajili Mgahawa' : 'Register New Tenant'}
            </button>
          </div>
        </div>

        {/* ================= LOGIN FORM ================= */}
        {m === 'login' && (
          <div style={{ padding: 24 }}>
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  {isSw ? 'Nambari ya Simu' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0713000222 or 0700000000"
                  value={loginPh}
                  onChange={e => setLoginPh(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  {isSw ? 'Nenosiri' : 'Password'}
                </label>
                <input
                  type="password"
                  placeholder={isSw ? 'Weka nenosiri (kwa majaribio: demo)' : 'Enter password (demo accounts use: demo)'}
                  value={loginPw}
                  onChange={e => setLoginPw(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {err && (
                <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13 }}>
                  ⚠️ {err}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  marginTop: 6
                }}
              >
                {isSw ? 'Ingia Kwenye Mfumo' : 'Sign In to Workspace'}
              </button>
            </form>

            {/* Quick Demo Logins Section */}
            <div style={{ marginTop: 24, borderTop: '1px solid #334155', paddingTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
                ⚡ {isSw ? 'Akaunti za Kujaribu Haraka (Bofya Kuingia Moja kwa Moja)' : 'Fast Demo Accounts (Click to Fill & Enter)'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { role: 'superadmin', icon: '👑', label: isSw ? 'Msimamizi Mkuu' : 'SuperAdmin (Provider)', ph: '0700000000', color: '#7c3aed' },
                  { role: 'owner', icon: '🏢', label: isSw ? 'Mmiliki wa Mgahawa' : 'Group Owner & CEO', ph: '0718000777', color: '#0E5A47' },
                  { role: 'manager', icon: '👔', label: isSw ? 'Meneja wa Tawi' : 'Site General Manager', ph: '0715000444', color: '#c0392b' },
                  { role: 'cashier', icon: '💳', label: isSw ? 'Keshia Mkuu' : 'Head Cashier', ph: '0714000333', color: '#e67e22' },
                  { role: 'waiter', icon: '🧑‍🍳', label: isSw ? 'Mhudumu wa Meza' : 'Senior Waiter', ph: '0713000222', color: '#2980b9' },
                  { role: 'chef', icon: '🍳', label: isSw ? 'Mpishi Mkuu (Jikoni)' : 'Head Chef (KDS)', ph: '0716000555', color: '#8e44ad' }
                ].map(item => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => demoLogin(item.role)}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Ph: {item.ph}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= MULTI-STEP REGISTRATION WIZARD ================= */}
        {m === 'register' && (
          <div style={{ padding: 24 }}>
            {/* Account Registration Type Sub-Toggle */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setRegType('tenant')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  border: `2px solid ${regType === 'tenant' ? '#7c3aed' : '#334155'}`,
                  background: regType === 'tenant' ? '#7c3aed20' : '#0f172a',
                  color: regType === 'tenant' ? '#fff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                🏢 New Restaurant Tenant (Wizard)
              </button>
              <button
                type="button"
                onClick={() => setRegType('staff')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  border: `2px solid ${regType === 'staff' ? '#7c3aed' : '#334155'}`,
                  background: regType === 'staff' ? '#7c3aed20' : '#0f172a',
                  color: regType === 'staff' ? '#fff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                👤 Employee / Staff Signup
              </button>
            </div>

            {/* TENANT 5-STEP WIZARD */}
            {regType === 'tenant' ? (
              <div>
                {/* Stepper Progress Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 14, left: 20, right: 20, height: 2, background: '#334155', zIndex: 0 }} />
                  <div style={{
                    position: 'absolute',
                    top: 14,
                    left: 20,
                    width: `${((step - 1) / 4) * 100}%`,
                    height: 2,
                    background: '#10b981',
                    zIndex: 0,
                    transition: 'width .3s'
                  }} />

                  {[
                    { s: 1, label: 'Admin' },
                    { s: 2, label: 'Restaurant' },
                    { s: 3, label: 'Plan' },
                    { s: 4, label: 'Setup' },
                    { s: 5, label: 'Launch' }
                  ].map(item => (
                    <div key={item.s} style={{ zIndex: 1, textAlign: 'center' }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: step >= item.s ? '#10b981' : '#1e293b',
                        border: `2px solid ${step >= item.s ? '#10b981' : '#475569'}`,
                        color: step >= item.s ? '#fff' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        margin: '0 auto 4px',
                        transition: 'all .2s'
                      }}>
                        {step > item.s ? '✓' : item.s}
                      </div>
                      <span style={{ fontSize: 11, color: step >= item.s ? '#fff' : '#64748b', fontWeight: step === item.s ? 700 : 500 }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* STEP 1: ADMIN CREDENTIALS */}
                {step === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>
                      Step 1 of 5: Organization Owner Credentials
                    </div>
                    <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 4px' }}>
                      You will use these credentials to sign in as the Master Administrator of your restaurant.
                    </p>

                    <div>
                      <label style={{ fontSize: 12, color: '#cbd5e1' }}>Your Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. David Kimani"
                        value={adminName}
                        onChange={e => setAdminName(e.target.value)}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Mobile Phone Number *</label>
                        <input
                          type="tel"
                          placeholder="e.g. 0718000777"
                          value={adminPhone}
                          onChange={e => setAdminPhone(e.target.value)}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Work Email Address</label>
                        <input
                          type="email"
                          placeholder="e.g. david@safariholding.tz"
                          value={adminEmail}
                          onChange={e => setAdminEmail(e.target.value)}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: '#cbd5e1' }}>Create Password *</label>
                      <input
                        type="password"
                        placeholder="At least 4 characters"
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: RESTAURANT PROFILE */}
                {step === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>
                      Step 2 of 5: Restaurant Brand & Concept
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Icon</label>
                        <input
                          type="text"
                          value={logoEmoji}
                          onChange={e => setLogoEmoji(e.target.value)}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 10, color: '#fff', textAlign: 'center', fontSize: 20, marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Restaurant / Business Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Safari Grill & Lounge"
                          value={restoName}
                          onChange={e => handleRestoNameChange(e.target.value)}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: '#cbd5e1' }}>Custom Subdomain URL</label>
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                        <input
                          type="text"
                          placeholder="safari-grill"
                          value={slug}
                          onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '10px 0 0 10px', padding: 12, color: '#38bdf8', fontWeight: 700 }}
                        />
                        <span style={{ background: '#334155', color: '#94a3b8', padding: '12px 14px', borderRadius: '0 10px 10px 0', fontSize: 13 }}>
                          .restoerp.io
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Hospitality Concept</label>
                        <select
                          value={concept}
                          onChange={e => setConcept(e.target.value)}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                        >
                          <option value="Dine-in Flame Grill & Lounge">Dine-in Flame Grill & Lounge</option>
                          <option value="Fast Food / Quick Service (QSR)">Fast Food / Quick Service (QSR)</option>
                          <option value="Fine Dining & Steakhouse">Fine Dining & Steakhouse</option>
                          <option value="Cocktail Bar & Nightclub">Cocktail Bar & Nightclub</option>
                          <option value="Artisan Bakery & Cafe">Artisan Bakery & Cafe</option>
                          <option value="Multi-Site Hospitality Chain">Multi-Site Hospitality Chain</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>City & Country</label>
                        <input
                          type="text"
                          placeholder="e.g. Dar es Salaam, Tanzania"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: PLAN SELECTION */}
                {step === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>
                      Step 3 of 5: Choose SaaS Package Tier
                    </div>

                    {/* Monthly vs Annual Toggle */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      background: '#0f172a',
                      padding: 8,
                      borderRadius: 12,
                      border: '1px solid #334155'
                    }}>
                      <span style={{ fontSize: 13, fontWeight: billingCycle === 'monthly' ? 700 : 400, color: billingCycle === 'monthly' ? '#fff' : '#94a3b8' }}>
                        Monthly
                      </span>
                      <button
                        type="button"
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                        style={{
                          width: 44,
                          height: 24,
                          borderRadius: 99,
                          background: billingCycle === 'annual' ? '#10b981' : '#475569',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all .2s'
                        }}
                      >
                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: '#fff',
                          position: 'absolute',
                          top: 3,
                          left: billingCycle === 'annual' ? 23 : 3,
                          transition: 'all .2s'
                        }} />
                      </button>
                      <span style={{ fontSize: 13, fontWeight: billingCycle === 'annual' ? 700 : 400, color: billingCycle === 'annual' ? '#10b981' : '#94a3b8' }}>
                        Annual <span style={{ background: '#10b98125', color: '#34d399', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>20% OFF</span>
                      </span>
                    </div>

                    {/* Packages Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {packages.map(p => {
                        const isSelected = packageId === p.id;
                        const price = billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly;

                        return (
                          <div
                            key={p.id}
                            onClick={() => setPackageId(p.id)}
                            style={{
                              border: `2px solid ${isSelected ? p.color : '#334155'}`,
                              background: isSelected ? p.color + '15' : '#0f172a',
                              borderRadius: 12,
                              padding: '14px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all .15s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ fontSize: 28 }}>{p.icon}</div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <strong style={{ fontSize: 15, color: '#fff' }}>{p.name}</strong>
                                  {p.popular && (
                                    <span style={{ background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99 }}>
                                      RECOMMENDED
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{p.tagline}</div>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: '#10b981', fontSize: 16 }}>
                                {fmt(price)}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                /{billingCycle === 'annual' ? 'year' : 'month'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 4: OPERATIONAL SETUP */}
                {step === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>
                      Step 4 of 5: Outlets, Tables & Capacity
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: '#cbd5e1' }}>Flagship Location / Outlet Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Masaki Flagship"
                        value={branchName}
                        onChange={e => setBranchName(e.target.value)}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Estimated Tables Count</label>
                        <input
                          type="number"
                          min="1"
                          value={tablesCount}
                          onChange={e => setTablesCount(e.target.value)}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Staff & Terminal Seats</label>
                        <input
                          type="number"
                          min="1"
                          value={staffCount}
                          onChange={e => setStaffCount(e.target.value)}
                          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12, color: '#fff', marginTop: 4 }}
                        />
                      </div>
                    </div>

                    {/* Preload Demo Menu & Stock */}
                    <div style={{
                      background: '#0f172a',
                      borderRadius: 12,
                      padding: 14,
                      border: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <input
                        type="checkbox"
                        checked={seedDemoData}
                        onChange={e => setSeedDemoData(e.target.checked)}
                        style={{ width: 20, height: 20, accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>
                          Pre-load Demo Menu, Recipes & Inventory
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          Seeds authentic grill, burger, cocktail recipes and bar stock so your team can test right away.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: ACTIVATION & PAYMENT */}
                {step === 5 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>
                      Step 5 of 5: Review & Instant Activation
                    </div>

                    {/* Summary Card */}
                    <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 24 }}>{logoEmoji}</span>
                          <div>
                            <div style={{ fontWeight: 800, color: '#fff' }}>{restoName}</div>
                            <div style={{ fontSize: 11, color: '#38bdf8' }}>{slug}.restoerp.io</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: '#10b981' }}>{selectedPkg.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{billingCycle} plan</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 12, color: '#cbd5e1', marginTop: 10 }}>
                        <div>Admin: <strong>{adminName}</strong></div>
                        <div>Phone: <strong>{adminPhone}</strong></div>
                        <div>Location: <strong>{city}, {country}</strong></div>
                        <div>Capacity: <strong>{tablesCount} Tables · {staffCount} Staff</strong></div>
                      </div>
                    </div>

                    {/* Payment Choice */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 }}>
                        Select Subscription Activation Option:
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: paymentChoice === 'trial' ? '#10b98115' : '#0f172a',
                          border: `1.5px solid ${paymentChoice === 'trial' ? '#10b981' : '#334155'}`,
                          borderRadius: 10,
                          padding: 12,
                          cursor: 'pointer'
                        }}>
                          <input
                            type="radio"
                            name="pay"
                            checked={paymentChoice === 'trial'}
                            onChange={() => setPaymentChoice('trial')}
                            style={{ accentColor: '#10b981' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>
                              🎁 14-Day Free Evaluation (No Card Required)
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                              Instant full access to all ERP modules with zero upfront payment.
                            </div>
                          </div>
                          <strong style={{ color: '#10b981', fontSize: 13 }}>TSh 0</strong>
                        </label>

                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: paymentChoice === 'mpesa' ? '#10b98115' : '#0f172a',
                          border: `1.5px solid ${paymentChoice === 'mpesa' ? '#10b981' : '#334155'}`,
                          borderRadius: 10,
                          padding: 12,
                          cursor: 'pointer'
                        }}>
                          <input
                            type="radio"
                            name="pay"
                            checked={paymentChoice === 'mpesa'}
                            onChange={() => setPaymentChoice('mpesa')}
                            style={{ accentColor: '#10b981' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>
                              📱 Vodacom M-Pesa / Tigo Pesa Mobile Money
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                              Pay official subscription via Lipa Namba and activate immediately.
                            </div>
                          </div>
                          <strong style={{ color: '#fff', fontSize: 13 }}>{fmt(pkgPrice)}</strong>
                        </label>

                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: paymentChoice === 'card' ? '#10b98115' : '#0f172a',
                          border: `1.5px solid ${paymentChoice === 'card' ? '#10b981' : '#334155'}`,
                          borderRadius: 10,
                          padding: 12,
                          cursor: 'pointer'
                        }}>
                          <input
                            type="radio"
                            name="pay"
                            checked={paymentChoice === 'card'}
                            onChange={() => setPaymentChoice('card')}
                            style={{ accentColor: '#10b981' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>
                              💳 Visa / Mastercard Credit or Debit Card
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                              Secure recurring subscription processing.
                            </div>
                          </div>
                          <strong style={{ color: '#fff', fontSize: 13 }}>{fmt(pkgPrice)}</strong>
                        </label>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={e => setAgreedTerms(e.target.checked)}
                        style={{ accentColor: '#10b981' }}
                      />
                      I agree to the RestoERP SaaS Service Terms, SLA & Privacy Policy.
                    </label>
                  </div>
                )}

                {/* Wizard Navigation Buttons */}
                {err && (
                  <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13 }}>
                    ⚠️ {err}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20 }}>
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      style={{
                        background: '#334155',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 10,
                        padding: '12px 20px',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      ‹ Previous Step
                    </button>
                  ) : <div />}

                  {step < 5 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 10,
                        padding: '12px 24px',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      Next Step ›
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleWizardSubmit}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 10,
                        padding: '12px 28px',
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(16,185,129,0.4)'
                      }}
                    >
                      🚀 Launch Restaurant ERP
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* STAFF QUICK REGISTRATION FORM */
              <form onSubmit={handleStaffRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 4px' }}>
                  Joining an existing restaurant team? Register your staff credentials below:
                </p>

                <div>
                  <label style={{ fontSize: 12, color: '#cbd5e1' }}>Workspace Role</label>
                  <select
                    value={staffRole}
                    onChange={e => setStaffRole(e.target.value)}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#fff', marginTop: 4 }}
                  >
                    <option value="waiter">🧑‍🍳 Waiter / Service Staff</option>
                    <option value="cashier">💳 Cashier / Front Desk</option>
                    <option value="chef">🍳 Head Chef / Kitchen Cook</option>
                    <option value="storekeeper">📦 Storekeeper / Inventory</option>
                    <option value="production">🏭 Central Kitchen / Production</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#cbd5e1' }}>Your Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Baraka Hassan"
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#fff', marginTop: 4 }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#cbd5e1' }}>Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0713000999"
                    value={staffPhone}
                    onChange={e => setStaffPhone(e.target.value)}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#fff', marginTop: 4 }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#cbd5e1' }}>Password</label>
                  <input
                    type="password"
                    placeholder="demo"
                    value={staffPassword}
                    onChange={e => setStaffPassword(e.target.value)}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#fff', marginTop: 4 }}
                    required
                  />
                </div>

                {err && (
                  <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: 10, color: '#fca5a5', fontSize: 13 }}>
                    ⚠️ {err}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    background: '#7c3aed',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: 6
                  }}
                >
                  Join Restaurant Staff
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
