import React, { useState, useEffect, useContext } from 'react';
import { Landing } from './screens/Landing';
import { Auth } from './screens/Auth';
import { Customer } from './screens/Customer';
import { Waiter } from './screens/Waiter';
import { KDS } from './screens/KDS';
import { Cashier } from './screens/Cashier';
import { Inventory } from './screens/Inventory';
import { Manager } from './screens/Manager';
import { HQ } from './screens/HQ';
import { Production } from './screens/Production';
import Accounting from './screens/Accounting';
import HR from './screens/HR';
import SuperAdmin from './screens/SuperAdmin';
import { Ctx } from './store';
import { USERS, WAITERS } from './data';
import { LanguageToggle } from './components/ui';

/* ── Module launcher shown after login for manager/owner roles ── */
const MODULES = [
  { id: 'pos',        label: 'Point of Sale',   labelSw: 'Mauzo ya Kaunta (POS)',   icon: '🍽️',  color: '#e67e22', roles: ['cashier','waiter','manager','owner'] },
  { id: 'kitchen',    label: 'Kitchen Display',  labelSw: 'Skrini ya Jikoni (KDS)',  icon: '👨‍🍳',  color: '#8e44ad', roles: ['chef','manager','owner'] },
  { id: 'inventory',  label: 'Inventory',        labelSw: 'Stoo na Mzigo',          icon: '📦',  color: '#2980b9', roles: ['storekeeper','manager','owner'] },
  { id: 'production', label: 'Production',       labelSw: 'Uzalishaji Jikoni',      icon: '🏭',  color: '#16a085', roles: ['production','manager','owner'] },
  { id: 'accounting', label: 'Accounting',       labelSw: 'Uhasibu na Fedha',       icon: '💲',  color: '#1C7A4B', roles: ['manager','owner'] },
  { id: 'hr',         label: 'Human Resources',  labelSw: 'Wafanyakazi (HR)',       icon: '👤',  color: '#875A7B', roles: ['manager','owner'] },
  { id: 'manager',    label: 'Manager Controls', labelSw: 'Usimamizi wa Meneja',    icon: '📊',  color: '#c0392b', roles: ['manager','owner'] },
  { id: 'hq',         label: 'HQ / Multi-Branch',labelSw: 'Makao Makuu (HQ)',       icon: '🌍',  color: '#2c3e50', roles: ['owner'] },
];

function ModuleLauncher({ sess, onLaunch, onOut, tenant, onOpenSuperAdmin }) {
  const { lang, t } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  const visibleModules = MODULES.filter(m => m.roles.includes(sess?.role));

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: '#0E5A47', color: '#fff', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{tenant?.logoEmoji || '🍽️'}</span>
          <div>
            <span style={{ fontWeight: 800, fontSize: 17 }}>{tenant?.name || 'RestoERP Cloud'}</span>
            <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 8 }}>· {tenant?.city || 'Masaki'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageToggle isLight={true} />

          {onOpenSuperAdmin && (
            <button
              onClick={onOpenSuperAdmin}
              style={{
                background: 'rgba(124,58,237,0.3)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>👑</span> SuperAdmin
            </button>
          )}

          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
            {sess?.name?.[0] || 'U'}
          </div>
          <button onClick={onOut} style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>
            {isSw ? 'Ondoka' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '32px 40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
              {isSw ? `Karibu, ${sess?.name}` : `Welcome, ${sess?.name}`}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
              {sess?.title || `${isSw ? 'Jukumu' : 'Role'}: ${sess?.role}`} · {tenant?.name || 'Safari Grill & Lounge'} · {tenant?.domain || 'safari.restoerp.io'}
            </p>
          </div>

          {tenant?.status === 'trial' && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              color: '#92400e',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700
            }}>
              🎁 {isSw ? 'Siku 14 za Jaribio la Bure Zinaendelea' : '14-Day Free Evaluation Active'}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
          {visibleModules.map(mod => (
            <button key={mod.id} onClick={() => onLaunch(mod.id)}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px 16px', cursor: 'pointer', textAlign: 'center', transition: 'all .15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = mod.color; e.currentTarget.style.boxShadow = `0 6px 20px ${mod.color}25`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: mod.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                {mod.icon}
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1f2937', lineHeight: 1.3 }}>
                {isSw && mod.labelSw ? mod.labelSw : mod.label}
              </span>
            </button>
          ))}
        </div>

        {/* Quick stats strip */}
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: isSw ? 'Oda Zinazoendelea' : 'Open Table Orders', value: '3', icon: '🍽️', color: '#e67e22' },
            { label: isSw ? 'Bili Zisizolipwa' : 'Unsettled Bills', value: '2', icon: '📄', color: '#c0392b' },
            { label: isSw ? 'Wafanyakazi Kazini' : 'Active Shift Staff', value: '10', icon: '👤', color: '#1C7A4B' },
            { label: isSw ? 'Mauzo ya Leo' : 'Today Gross Revenue', value: 'TSh 284K', icon: '💰', color: '#875A7B' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { S, A } = useContext(Ctx);

  const [v, setV] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('resto_v')) || 'land'; }
    catch { return 'land'; }
  });
  const [sess, setSess] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('resto_sess')) || null; }
    catch { return null; }
  });

  const [via, setVia] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState(null);

  // SuperAdmin Impersonation state
  const [impersonatedTenant, setImpersonatedTenant] = useState(null);

  const currentTenant = (S.tenants || []).find(t => t.id === S.activeTenantId) || (S.tenants && S.tenants[0]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;
      let token = searchParams.get('w') || searchParams.get('token');
      const tableParam = searchParams.get('table') || searchParams.get('tb');
      if (token) {
        const matchingWaiter = (S.waiters || WAITERS).find(w => w.tok.toLowerCase() === token.toLowerCase());
        if (matchingWaiter) {
          setVia({ wid: matchingWaiter.id, token });
          if (!sess) {
            setSess({ id: 'guest_' + Date.now(), role: 'customer', name: 'Table Guest' });
            setV('customer');
          }
        }
      } else if (tableParam) {
        setVia(prev => ({ ...prev, tb: tableParam, qr: true }));
        if (!sess) {
          setSess({ id: 'guest_' + Date.now(), role: 'customer', name: `Guest (Table ${tableParam})` });
          setV('customer');
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('resto_v', JSON.stringify(v));
      sessionStorage.setItem('resto_sess', JSON.stringify(sess));
    } catch { /* ignore */ }
  }, [v, sess]);

  const done = user => {
    setSess(user);
    setV(user.role);
    setActiveModule(null);
  };

  const out = () => {
    setSess(null);
    setVia(null);
    setImpersonatedTenant(null);
    setV('land');
    setActiveModule(null);
  };

  const handleDirectRoleLaunch = user => {
    setSess(user);
    setV(user.role);
    setActiveModule(null);
  };

  const previewAsCustomer = wid => {
    setVia({ wid });
    setSess({ id: 'guest_' + Date.now(), role: 'customer', name: 'Preview Guest', backTo: sess });
    setV('customer');
  };

  const launchModule = (modId) => {
    setActiveModule(modId);
  };

  const exitModule = () => {
    setActiveModule(null);
  };

  // SuperAdmin enters a specific tenant
  const handleSuperAdminImpersonate = (tenant) => {
    A.setActiveTenant(tenant.id);
    setImpersonatedTenant(tenant);
    const virtualOwner = {
      id: 'impersonated_' + tenant.id,
      role: 'owner',
      name: tenant.adminName || 'Tenant Owner',
      originalSuperAdmin: sess || { id: 'u_super', role: 'superadmin', name: 'Amina Mwamba' }
    };
    setSess(virtualOwner);
    setV('owner');
    setActiveModule(null);
  };

  const exitImpersonation = () => {
    const orig = sess?.originalSuperAdmin || { id: 'u_super', role: 'superadmin', name: 'Amina Mwamba (System Provider)' };
    setImpersonatedTenant(null);
    setSess(orig);
    setV('superadmin');
    setActiveModule(null);
  };

  // Impersonation Banner Wrapper
  const renderWithBanner = (component) => {
    const isSw = (S.lang || 'sw') === 'sw';
    return (
      <>
        {impersonatedTenant && (
          <div style={{
            background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
            color: '#fff',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            fontWeight: 600,
            position: 'sticky',
            top: 0,
            zIndex: 9999,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>👑</span>
              <span>
                {isSw ? 'Hali ya Msimamizi Mkuu: Unatazama ' : 'SuperAdmin Mode: Viewing '}
                <strong>{impersonatedTenant.name}</strong> ({impersonatedTenant.concept || 'Restaurant Workspace'})
              </span>
            </div>
            <button
              onClick={exitImpersonation}
              style={{
                background: '#fff',
                color: '#7c3aed',
                border: 'none',
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {isSw ? 'Rudi Kwenye Dashibodi Kuu ›' : 'Exit to SuperAdmin Console ›'}
            </button>
          </div>
        )}
        {component}
      </>
    );
  };

  /* ── LANDING ── */
  if (v === 'land' || (!sess && !v.startsWith('auth'))) {
    return (
      <Landing
        go={setV}
        onDirectRole={handleDirectRoleLaunch}
        onSelectPackage={setSelectedPackageId}
      />
    );
  }

  /* ── AUTH ── */
  if (v.startsWith('auth')) {
    return (
      <Auth
        mode0={v.split(':')[1] || 'register'}
        defaultPackageId={selectedPackageId}
        done={done}
        back={() => setV('land')}
      />
    );
  }

  /* ── SUPERADMIN / SYSTEM PROVIDER ── */
  if (v === 'superadmin' || sess?.role === 'superadmin') {
    return (
      <SuperAdmin
        sess={sess}
        out={out}
        onImpersonate={handleSuperAdminImpersonate}
      />
    );
  }

  /* ── CUSTOMER / TABLE QR ── */
  if (v === 'customer' || v === 'preview') {
    return renderWithBanner(
      <Customer sess={sess} out={out} via={via} setVia={setVia} setSess={setSess} setV={setV} />
    );
  }

  /* ── WAITER ── */
  if (v === 'waiter') {
    return renderWithBanner(
      <Waiter sess={sess} out={out} preview={previewAsCustomer} setSess={setSess} setV={setV} />
    );
  }

  /* ── CHEF / KDS ── */
  if (v === 'chef') {
    return renderWithBanner(
      <KDS sess={sess} out={out} setSess={setSess} setV={setV} />
    );
  }

  /* ── CASHIER ── */
  if (v === 'cashier') {
    return renderWithBanner(
      <Cashier sess={sess} out={out} setSess={setSess} setV={setV} />
    );
  }

  /* ── STOREKEEPER ── */
  if (v === 'storekeeper') {
    return renderWithBanner(
      <Inventory sess={sess} out={out} setSess={setSess} setV={setV} />
    );
  }

  /* ── PRODUCTION ── */
  if (v === 'production') {
    return renderWithBanner(
      <Production sess={sess} out={out} setSess={setSess} setV={setV} />
    );
  }

  /* ── MANAGER / OWNER — Module Launcher ── */
  if (v === 'manager' || v === 'owner') {
    if (activeModule === 'accounting') {
      return renderWithBanner(<Accounting sess={sess} out={exitModule} />);
    }
    if (activeModule === 'hr') {
      return renderWithBanner(<HR sess={sess} out={exitModule} />);
    }
    if (activeModule === 'manager') {
      return renderWithBanner(<Manager sess={sess} out={exitModule} setSess={setSess} setV={setV} />);
    }
    if (activeModule === 'hq') {
      return renderWithBanner(<HQ sess={sess} out={exitModule} setSess={setSess} setV={setV} />);
    }
    if (activeModule === 'pos') {
      return renderWithBanner(<Cashier sess={sess} out={exitModule} setSess={setSess} setV={setV} />);
    }
    if (activeModule === 'kitchen') {
      return renderWithBanner(<KDS sess={sess} out={exitModule} setSess={setSess} setV={setV} />);
    }
    if (activeModule === 'inventory') {
      return renderWithBanner(<Inventory sess={sess} out={exitModule} setSess={setSess} setV={setV} />);
    }
    if (activeModule === 'production') {
      return renderWithBanner(<Production sess={sess} out={exitModule} setSess={setSess} setV={setV} />);
    }

    // No module selected — show launcher
    return renderWithBanner(
      <ModuleLauncher
        sess={sess}
        onLaunch={launchModule}
        onOut={out}
        tenant={currentTenant}
        onOpenSuperAdmin={impersonatedTenant ? exitImpersonation : () => { setV('superadmin'); setSess((S.users || USERS).find(u => u.role === 'superadmin')); }}
      />
    );
  }

  // Fallback
  return renderWithBanner(<Cashier sess={sess} out={out} setSess={setSess} setV={setV} />);
}
