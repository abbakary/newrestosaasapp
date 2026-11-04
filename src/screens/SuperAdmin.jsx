import React, { useState, useContext } from 'react';
import { Ctx } from '../store';
import { fmt, fmtDateTime, fmtNum, PACKAGES } from '../data';

export default function SuperAdmin({ sess, out, onImpersonate }) {
  const { S, A } = useContext(Ctx);

  const [tab, setTab] = useState('tenants'); // 'tenants' | 'packages' | 'billing' | 'audit' | 'settings'
  const [tenantFilter, setTenantFilter] = useState('all'); // 'all' | 'active' | 'trial' | 'overdue' | 'suspended'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers state
  const [activeModal, setActiveModal] = useState(null); // 'create_tenant' | 'edit_tenant' | 'change_plan' | 'reset_pwd' | 'view_tenant' | 'create_invoice' | 'view_invoice' | 'edit_pkg'
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);

  // Form states
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const tenants = S.tenants || [];
  const packages = S.packages || PACKAGES;
  const invoices = S.saasInvoices || [];
  const logs = S.saasLogs || [];
  const settings = S.saasSettings || {};

  // Financial Metrics
  const totalMrr = tenants.reduce((acc, t) => acc + (t.status === 'active' ? (Number(t.mrr) || 0) : 0), 0);
  const totalArr = totalMrr * 12;
  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;
  const trialTenantsCount = tenants.filter(t => t.status === 'trial').length;
  const overdueTenantsCount = tenants.filter(t => t.status === 'overdue').length;
  const suspendedTenantsCount = tenants.filter(t => t.status === 'suspended').length;

  const totalPaidRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const totalOutstanding = invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  // Filtered tenants
  const filteredTenants = tenants.filter(t => {
    const matchesFilter =
      tenantFilter === 'all' ? true :
      tenantFilter === t.status;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      t.name.toLowerCase().includes(q) ||
      (t.slug && t.slug.toLowerCase().includes(q)) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.adminName && t.adminName.toLowerCase().includes(q)) ||
      (t.adminPhone && t.adminPhone.includes(q)) ||
      (t.adminEmail && t.adminEmail.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  // Action handlers
  const handleToggleStatus = (t) => {
    const nextStatus = t.status === 'active' ? 'suspended' : 'active';
    A.toggleTenantStatus(t.id, nextStatus, sess?.name || 'SuperAdmin');
    showToast(`${t.name} is now ${nextStatus.toUpperCase()}`);
  };

  const handleDeleteTenant = (t) => {
    if (window.confirm(`Are you sure you want to archive and remove tenant "${t.name}"? This cannot be undone.`)) {
      A.deleteTenant(t.id, sess?.name || 'SuperAdmin');
      showToast(`Tenant ${t.name} archived`);
      if (selectedTenant?.id === t.id) setSelectedTenant(null);
    }
  };

  const handleEnterWorkspace = (t) => {
    A.setActiveTenant(t.id);
    if (onImpersonate) {
      onImpersonate(t);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'inherit' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#10b981',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 9999,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'up .25s ease'
        }}>
          <span>✓</span> {toastMsg}
        </div>
      )}

      {/* Top SuperAdmin Header */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 2px 8px rgba(124,58,237,0.4)'
          }}>
            👑
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.3, color: '#fff' }}>
                RestoERP Cloud
              </span>
              <span style={{
                background: 'rgba(124,58,237,0.25)',
                color: '#c4b5fd',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 99,
                border: '1px solid rgba(124,58,237,0.5)',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                System Provider Console
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Multi-Tenant SaaS Infrastructure & Billing · {settings.providerCompany || 'RestoERP Tech'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{sess?.name || 'Amina Mwamba'}</div>
            <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
              Provider SuperAdmin
            </div>
          </div>

          <button
            onClick={out}
            style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#fca5a5',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main SaaS Metrics Strip */}
      <div style={{ padding: '24px 24px 0', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16
        }}>
          {/* Card 1: MRR */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid #334155',
            borderRadius: 14,
            padding: '16px 18px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Monthly Recurring (MRR)
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
              {fmt(totalMrr)}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Run-rate ARR: <span style={{ color: '#94a3b8', fontWeight: 600 }}>{fmt(totalArr)}</span>
            </div>
            <div style={{ position: 'absolute', right: 14, top: 16, fontSize: 28, opacity: 0.25 }}>💰</div>
          </div>

          {/* Card 2: Active Tenants */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid #334155',
            borderRadius: 14,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Restaurants
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
              {tenants.length} <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>Tenants</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', gap: 8 }}>
              <span style={{ color: '#10b981' }}>{activeTenantsCount} Active</span> ·
              <span style={{ color: '#f59e0b' }}>{trialTenantsCount} Trial</span> ·
              <span style={{ color: '#ef4444' }}>{overdueTenantsCount} Overdue</span>
            </div>
            <div style={{ position: 'absolute', right: 14, top: 16, fontSize: 28, opacity: 0.25 }}>🍽️</div>
          </div>

          {/* Card 3: Billing & Revenue */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid #334155',
            borderRadius: 14,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Collected Revenue
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#c084fc', marginTop: 4 }}>
              {fmt(totalPaidRevenue)}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Pending Invoices: <span style={{ color: overdueTenantsCount > 0 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{fmt(totalOutstanding)}</span>
            </div>
            <div style={{ position: 'absolute', right: 14, top: 16, fontSize: 28, opacity: 0.25 }}>💳</div>
          </div>

          {/* Card 4: Platform Health */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid #334155',
            borderRadius: 14,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Platform Status
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
              99.99%
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Cloud Node Europe-West1 · All APIs Operational
            </div>
            <div style={{ position: 'absolute', right: 14, top: 16, fontSize: 28, opacity: 0.25 }}>⚡</div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginTop: 24,
          borderBottom: '1px solid #334155',
          paddingBottom: 2,
          overflowX: 'auto'
        }}>
          {[
            { id: 'tenants', label: 'Tenants & Accounts', icon: '🏢', count: tenants.length },
            { id: 'packages', label: 'Subscription Packages', icon: '📦', count: packages.length },
            { id: 'billing', label: 'Billing & Service Payments', icon: '💳', count: invoices.length, warn: overdueTenantsCount > 0 },
            { id: 'audit', label: 'System Activity Logs', icon: '📜', count: logs.length },
            { id: 'settings', label: 'Platform Settings', icon: '⚙️' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: '10px 10px 0 0',
                fontSize: 14,
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? '#fff' : '#94a3b8',
                background: tab === t.id ? '#1e293b' : 'transparent',
                border: '1px solid',
                borderColor: tab === t.id ? '#334155 #334155 transparent #334155' : 'transparent',
                cursor: 'pointer',
                transition: 'all .15s',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 99,
                  background: t.warn ? '#ef4444' : (tab === t.id ? '#7c3aed' : '#334155'),
                  color: '#fff',
                  fontWeight: 700
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <main style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* ================= TAB 1: TENANTS MANAGEMENT ================= */}
        {tab === 'tenants' && (
          <div>
            {/* Top Toolbar: Search, Filters, Add New Tenant Button */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20
            }}>
              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: '#1e293b', padding: 4, borderRadius: 10, border: '1px solid #334155' }}>
                {[
                  { id: 'all', label: `All (${tenants.length})` },
                  { id: 'active', label: `Active (${activeTenantsCount})` },
                  { id: 'trial', label: `Free Trial (${trialTenantsCount})` },
                  { id: 'overdue', label: `Overdue (${overdueTenantsCount})` },
                  { id: 'suspended', label: `Suspended (${suspendedTenantsCount})` }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTenantFilter(f.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 7,
                      fontSize: 12.5,
                      fontWeight: tenantFilter === f.id ? 700 : 500,
                      background: tenantFilter === f.id ? (f.id === 'overdue' ? '#ef4444' : '#7c3aed') : 'transparent',
                      color: tenantFilter === f.id ? '#fff' : '#94a3b8',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search and Provision Button */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search restaurant, slug, city, admin..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: '8px 14px 8px 34px',
                      fontSize: 13,
                      color: '#fff',
                      width: 280,
                      outline: 'none'
                    }}
                  />
                  <span style={{ position: 'absolute', left: 12, top: 9, color: '#64748b', fontSize: 13 }}>🔍</span>
                </div>

                <button
                  onClick={() => setActiveModal('create_tenant')}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 16px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                  }}
                >
                  <span>➕</span>
                  <span>Provision New Tenant</span>
                </button>
              </div>
            </div>

            {/* Tenants Table */}
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <th style={{ padding: '12px 16px' }}>Tenant & Domain</th>
                      <th style={{ padding: '12px 14px' }}>Package & Billing</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px' }}>Admin & Contact</th>
                      <th style={{ padding: '12px 14px' }}>Branches & Tables</th>
                      <th style={{ padding: '12px 14px' }}>MRR Contribution</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                          No tenants found matching your search and filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map(t => {
                        const pkg = packages.find(p => p.id === t.packageId) || packages[1];
                        const isExpired = t.renewalDate && t.renewalDate < Date.now();
                        const isCurrentActive = S.activeTenantId === t.id;

                        return (
                          <tr
                            key={t.id}
                            style={{
                              borderBottom: '1px solid #334155',
                              transition: 'background .15s',
                              background: isCurrentActive ? 'rgba(124,58,237,0.08)' : 'transparent'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isCurrentActive ? 'rgba(124,58,237,0.14)' : 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = isCurrentActive ? 'rgba(124,58,237,0.08)' : 'transparent'}
                          >
                            {/* Organization Name & Subdomain */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 10,
                                  background: '#334155',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 20,
                                  flexShrink: 0
                                }}>
                                  {t.logoEmoji || '🍽️'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>
                                    {t.name}
                                    {isCurrentActive && (
                                      <span style={{ marginLeft: 6, fontSize: 10, color: '#c4b5fd', background: '#7c3aed40', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                        ACTIVE CONTEXT
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>🌐</span>
                                    <code>{t.domain || `${t.slug}.restoerp.io`}</code>
                                    <span style={{ color: '#64748b' }}>· {t.city || 'Tanzania'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Package Tier & Billing */}
                            <td style={{ padding: '14px 14px' }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: pkg.color + '25',
                                color: pkg.color === '#0E5A47' ? '#34d399' : pkg.color === '#7c3aed' ? '#c084fc' : '#38bdf8',
                                border: `1px solid ${pkg.color}50`
                              }}>
                                <span>{pkg.icon}</span>
                                <span>{pkg.name}</span>
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                                Cycle: <span style={{ textTransform: 'capitalize', color: '#e2e8f0', fontWeight: 600 }}>{t.billingCycle || 'monthly'}</span>
                              </div>
                            </td>

                            {/* Status Pill */}
                            <td style={{ padding: '14px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 9px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 700,
                                background:
                                  t.status === 'active' ? 'rgba(16,185,129,0.18)' :
                                  t.status === 'trial' ? 'rgba(245,158,11,0.18)' :
                                  t.status === 'overdue' ? 'rgba(239,68,68,0.22)' : 'rgba(148,163,184,0.18)',
                                color:
                                  t.status === 'active' ? '#34d399' :
                                  t.status === 'trial' ? '#fbbf24' :
                                  t.status === 'overdue' ? '#f87171' : '#cbd5e1',
                                border: `1px solid ${
                                  t.status === 'active' ? '#10b98150' :
                                  t.status === 'trial' ? '#f59e0b50' :
                                  t.status === 'overdue' ? '#ef444450' : '#64748b50'
                                }`
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
                                <span style={{ textTransform: 'uppercase' }}>{t.status}</span>
                              </span>
                              {t.status === 'trial' && (
                                <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 3 }}>
                                  Trial ends in {Math.max(1, Math.ceil(((t.renewalDate || Date.now()) - Date.now()) / (24*3600*1000)))} days
                                </div>
                              )}
                              {t.status === 'overdue' && (
                                <div style={{ fontSize: 10, color: '#f87171', marginTop: 3, fontWeight: 600 }}>
                                  ⚠️ Payment past due
                                </div>
                              )}
                            </td>

                            {/* Admin & Contact Details */}
                            <td style={{ padding: '14px 14px' }}>
                              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{t.adminName || 'Admin'}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{t.adminPhone}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{t.adminEmail}</div>
                            </td>

                            {/* Branches & Capacity */}
                            <td style={{ padding: '14px 14px' }}>
                              <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                🏬 {t.branchesCount || 1} {t.branchesCount === 1 ? 'Branch' : 'Branches'}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                🪑 {t.tablesCount || 12} Tables · 👤 {t.staffCount || 6} Staff
                              </div>
                            </td>

                            {/* MRR Fee */}
                            <td style={{ padding: '14px 14px' }}>
                              <div style={{ fontWeight: 800, color: t.status === 'active' ? '#10b981' : '#64748b', fontSize: 14 }}>
                                {fmt(t.monthlyFee || 0)}
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>
                                /month {t.status === 'trial' ? '(Trial $0)' : ''}
                              </div>
                            </td>

                            {/* Action Buttons Column */}
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                {/* 1. Enter Workspace (Impersonate) */}
                                <button
                                  onClick={() => handleEnterWorkspace(t)}
                                  title="Enter and manage this restaurant's ERP workspace"
                                  style={{
                                    background: 'rgba(124,58,237,0.2)',
                                    color: '#c4b5fd',
                                    border: '1px solid rgba(124,58,237,0.4)',
                                    padding: '5px 10px',
                                    borderRadius: 7,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.35)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,0.2)'}
                                >
                                  <span>🚀</span> Enter
                                </button>

                                {/* 2. View Overview */}
                                <button
                                  onClick={() => { setSelectedTenant(t); setActiveModal('view_tenant'); }}
                                  title="View complete organization profile and usage"
                                  style={{
                                    background: 'rgba(2,132,199,0.2)',
                                    color: '#7dd3fc',
                                    border: '1px solid rgba(2,132,199,0.4)',
                                    padding: '5px 8px',
                                    borderRadius: 7,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  👁️
                                </button>

                                {/* 3. Edit Tenant */}
                                <button
                                  onClick={() => { setSelectedTenant(t); setActiveModal('edit_tenant'); }}
                                  title="Edit tenant details, limits & profile"
                                  style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#f8fafc',
                                    border: '1px solid #475569',
                                    padding: '5px 8px',
                                    borderRadius: 7,
                                    fontSize: 12,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✏️
                                </button>

                                {/* 4. Change Plan */}
                                <button
                                  onClick={() => { setSelectedTenant(t); setActiveModal('change_plan'); }}
                                  title="Upgrade or downgrade package plan"
                                  style={{
                                    background: 'rgba(16,185,129,0.15)',
                                    color: '#6ee7b7',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    padding: '5px 8px',
                                    borderRadius: 7,
                                    fontSize: 12,
                                    cursor: 'pointer'
                                  }}
                                >
                                  💳
                                </button>

                                {/* 5. Suspend / Activate Toggle */}
                                <button
                                  onClick={() => handleToggleStatus(t)}
                                  title={t.status === 'active' ? 'Suspend account' : 'Reactivate account'}
                                  style={{
                                    background: t.status === 'active' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                    color: t.status === 'active' ? '#fca5a5' : '#6ee7b7',
                                    border: `1px solid ${t.status === 'active' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                    padding: '5px 8px',
                                    borderRadius: 7,
                                    fontSize: 12,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {t.status === 'active' ? '⏸️' : '▶️'}
                                </button>

                                {/* 6. Reset Password */}
                                <button
                                  onClick={() => { setSelectedTenant(t); setActiveModal('reset_pwd'); }}
                                  title="Reset admin password"
                                  style={{
                                    background: 'rgba(245,158,11,0.15)',
                                    color: '#fde68a',
                                    border: '1px solid rgba(245,158,11,0.3)',
                                    padding: '5px 8px',
                                    borderRadius: 7,
                                    fontSize: 12,
                                    cursor: 'pointer'
                                  }}
                                >
                                  🔑
                                </button>

                                {/* 7. Delete */}
                                <button
                                  onClick={() => handleDeleteTenant(t)}
                                  title="Archive / Remove tenant"
                                  style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    padding: '5px 8px',
                                    borderRadius: 7,
                                    fontSize: 12,
                                    cursor: 'pointer'
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PACKAGES & PRICING ================= */}
        {tab === 'packages' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#fff' }}>SaaS Subscription Packages & Feature Tiers</h2>
                <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                  Configure pricing, branch limits, module capabilities and service level agreements for all restaurant tiers.
                </p>
              </div>

              <button
                onClick={() => {
                  const name = prompt('Enter new Package Plan Name: (e.g. Food Truck Lite)');
                  if (!name) return;
                  const price = Number(prompt('Enter Monthly Price in TSh:', '75000')) || 75000;
                  A.createPackage({
                    name,
                    tagline: 'Customized hospitality tier',
                    priceMonthly: price,
                    priceAnnual: price * 10,
                    popular: false,
                    color: '#eab308',
                    icon: '🚀',
                    limits: { branches: 1, tables: 8, staffUsers: 5, posTerminals: 1, kdsScreens: 1, inventoryStorage: 'Basic' },
                    modules: ['pos', 'kitchen', 'customer_qr'],
                    features: ['POS Terminal', 'QR Table Ordering', 'Standard Support']
                  });
                  showToast(`Package "${name}" created successfully!`);
                }}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>➕</span> Create New Package Plan
              </button>
            </div>

            {/* Packages Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {packages.map(p => {
                const subscriberCount = tenants.filter(t => t.packageId === p.id).length;
                const packageMrr = tenants.filter(t => t.packageId === p.id && t.status === 'active')
                  .reduce((acc, t) => acc + (t.monthlyFee || 0), 0);

                return (
                  <div
                    key={p.id}
                    style={{
                      background: '#1e293b',
                      border: p.popular ? `2px solid ${p.color}` : '1px solid #334155',
                      borderRadius: 18,
                      padding: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                    }}
                  >
                    {p.popular && (
                      <div style={{
                        position: 'absolute',
                        top: -12,
                        right: 24,
                        background: p.color,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 12px',
                        borderRadius: 99,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        Most Popular Tier
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: p.color + '20',
                        color: p.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        border: `1px solid ${p.color}40`
                      }}>
                        {p.icon || '📦'}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>{p.name}</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{p.tagline}</p>
                      </div>
                    </div>

                    {/* Pricing Display */}
                    <div style={{ background: '#0f172a', borderRadius: 12, padding: '14px 16px', margin: '12px 0 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{fmt(p.priceMonthly)}</span>
                        <span style={{ fontSize: 13, color: '#94a3b8' }}>/ month</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#10b981', marginTop: 3 }}>
                        Annual Plan: {fmt(p.priceAnnual)} / yr (20% Savings)
                      </div>
                    </div>

                    {/* Subscriber Metrics Strip */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 12,
                      marginBottom: 16
                    }}>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Active Subscribers: </span>
                        <strong style={{ color: '#fff' }}>{subscriberCount} Restaurants</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>MRR: </span>
                        <strong style={{ color: '#10b981' }}>{fmt(packageMrr)}</strong>
                      </div>
                    </div>

                    {/* Resource Limits Matrix */}
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontSize: 11 }}>
                        Included Infrastructure Limits
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                        <div>🏬 Branches: <strong>{p.limits?.branches >= 999 ? 'Unlimited' : p.limits?.branches}</strong></div>
                        <div>🪑 Max Tables: <strong>{p.limits?.tables >= 999 ? 'Unlimited' : p.limits?.tables}</strong></div>
                        <div>👥 Staff Seats: <strong>{p.limits?.staffUsers >= 999 ? 'Unlimited' : p.limits?.staffUsers}</strong></div>
                        <div>💻 POS Nodes: <strong>{p.limits?.posTerminals >= 999 ? 'Unlimited' : p.limits?.posTerminals}</strong></div>
                      </div>
                    </div>

                    {/* Features list */}
                    <div style={{ flex: 1, borderTop: '1px solid #334155', paddingTop: 14 }}>
                      <div style={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontSize: 11 }}>
                        Core Platform Capabilities
                      </div>
                      <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 }}>
                        {p.features?.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Edit Plan Button */}
                    <button
                      onClick={() => { setSelectedPkg(p); setActiveModal('edit_pkg'); }}
                      style={{
                        marginTop: 20,
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid #475569',
                        borderRadius: 10,
                        padding: '10px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      ✏️ Modify Package Pricing & Features
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 3: BILLING & PAYMENTS ================= */}
        {tab === 'billing' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#fff' }}>Tenant Billing & Service Invoices</h2>
                <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                  Track subscription revenue, verify M-Pesa / Tigo Pesa and credit card transactions, and issue receipts.
                </p>
              </div>

              <button
                onClick={() => setActiveModal('create_invoice')}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>➕</span> Generate Subscription Invoice
              </button>
            </div>

            {/* Invoices Table */}
            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <th style={{ padding: '12px 16px' }}>Invoice #</th>
                      <th style={{ padding: '12px 14px' }}>Tenant & Plan</th>
                      <th style={{ padding: '12px 14px' }}>Amount</th>
                      <th style={{ padding: '12px 14px' }}>Billing Period</th>
                      <th style={{ padding: '12px 14px' }}>Payment Status</th>
                      <th style={{ padding: '12px 14px' }}>Payment Method & Ref</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                          No invoice records found.
                        </td>
                      </tr>
                    ) : (
                      invoices.map(inv => {
                        return (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#38bdf8' }}>
                              {inv.id}
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
                                {fmtDateTime(inv.issuedDate)}
                              </div>
                            </td>

                            <td style={{ padding: '14px 14px' }}>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{inv.tenantName}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{inv.packageName}</div>
                            </td>

                            <td style={{ padding: '14px 14px', fontWeight: 800, fontSize: 14, color: inv.status === 'paid' ? '#10b981' : '#f87171' }}>
                              {fmt(inv.amount)}
                            </td>

                            <td style={{ padding: '14px 14px', color: '#cbd5e1' }}>
                              {inv.period || 'Monthly'}
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                Due: {new Date(inv.dueDate).toLocaleDateString()}
                              </div>
                            </td>

                            <td style={{ padding: '14px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 9px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 700,
                                background:
                                  inv.status === 'paid' ? 'rgba(16,185,129,0.2)' :
                                  inv.status === 'overdue' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.2)',
                                color:
                                  inv.status === 'paid' ? '#34d399' :
                                  inv.status === 'overdue' ? '#f87171' : '#fbbf24',
                                border: `1px solid ${
                                  inv.status === 'paid' ? '#10b98150' :
                                  inv.status === 'overdue' ? '#ef444450' : '#f59e0b50'
                                }`
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
                                {inv.status.toUpperCase()}
                              </span>
                            </td>

                            <td style={{ padding: '14px 14px' }}>
                              <div style={{ color: '#f8fafc', fontWeight: 500 }}>{inv.method || 'Not Selected'}</div>
                              {inv.refNo && (
                                <div style={{ fontSize: 11, color: '#10b981', fontFamily: 'monospace' }}>
                                  Ref: {inv.refNo}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                {inv.status !== 'paid' && (
                                  <button
                                    onClick={() => {
                                      const method = prompt('Confirm Payment Method (e.g. M-Pesa, Tigo Pesa, Card, Bank Wire):', 'M-Pesa');
                                      if (!method) return;
                                      const ref = prompt('Enter Transaction Reference / Confirmation code:', 'MPESA-' + Math.floor(100000 + Math.random() * 900000));
                                      A.markInvoicePaid(inv.id, method, ref, sess?.name || 'SuperAdmin');
                                      showToast(`Invoice ${inv.id} marked PAID!`);
                                    }}
                                    style={{
                                      background: 'rgba(16,185,129,0.2)',
                                      color: '#6ee7b7',
                                      border: '1px solid rgba(16,185,129,0.4)',
                                      padding: '5px 10px',
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    💵 Settle Payment
                                  </button>
                                )}

                                <button
                                  onClick={() => { setSelectedInvoice(inv); setActiveModal('view_invoice'); }}
                                  style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    border: '1px solid #475569',
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    cursor: 'pointer'
                                  }}
                                  title="View & Print Official Receipt"
                                >
                                  📄 View Receipt
                                </button>

                                {inv.status === 'overdue' && (
                                  <button
                                    onClick={() => showToast(`Payment reminder SMS & Email dispatched to ${inv.tenantName}!`)}
                                    style={{
                                      background: 'rgba(245,158,11,0.2)',
                                      color: '#fde68a',
                                      border: '1px solid rgba(245,158,11,0.4)',
                                      padding: '5px 8px',
                                      borderRadius: 6,
                                      fontSize: 12,
                                      cursor: 'pointer'
                                    }}
                                    title="Send Payment Reminder Alert"
                                  >
                                    ✉️ Reminder
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: AUDIT LOGS ================= */}
        {tab === 'audit' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#fff' }}>Platform Real-Time Audit Log</h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                Immutable historical event records across all tenant onboarding, package changes, status toggles, and payment settlements.
              </p>
            </div>

            <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {logs.map((log, i) => (
                  <div
                    key={log.id || i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      padding: '12px 14px',
                      background: '#0f172a',
                      borderRadius: 10,
                      border: '1px solid #334155'
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(124,58,237,0.2)',
                      color: '#c084fc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0
                    }}>
                      ⚡
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: 12.5,
                          color: '#e2e8f0',
                          background: '#1e293b',
                          padding: '2px 8px',
                          borderRadius: 6
                        }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {fmtDateTime(log.t)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                        {log.detail}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        Actor: <strong>{log.actor || 'System'}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: SYSTEM SETTINGS ================= */}
        {tab === 'settings' && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#fff' }}>SaaS Platform Global Configuration</h2>
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                Control self-service restaurant onboarding, default trial duration, accepted payment gateways, and system maintenance.
              </p>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 24 }}>
              {/* Setting 1: Self-registration */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid #334155' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>Enable Self-Service Tenant Registration</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Allows new restaurant owners to sign up directly via the public landing page wizard.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.selfRegistration ?? true}
                  onChange={e => {
                    A.updatePlatformSettings({ selfRegistration: e.target.checked });
                    showToast(`Self-service registration ${e.target.checked ? 'ENABLED' : 'DISABLED'}`);
                  }}
                  style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#10b981' }}
                />
              </div>

              {/* Setting 2: Trial Days */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: '1px solid #334155' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>Default Free Trial Duration</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Length of initial zero-dollar evaluation period granted to newly registered restaurant accounts.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    value={settings.trialPeriodDays ?? 14}
                    onChange={e => A.updatePlatformSettings({ trialPeriodDays: Number(e.target.value) || 14 })}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: '6px 12px',
                      color: '#fff',
                      width: 70,
                      textAlign: 'center',
                      fontWeight: 700
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Days</span>
                </div>
              </div>

              {/* Setting 3: Payment Gateways */}
              <div style={{ padding: '18px 0', borderBottom: '1px solid #334155' }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>Active Payment Gateway Connectors</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, marginBottom: 12 }}>
                  Tanzanian local mobile money and international cards enabled for subscription billing.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['mpesa', '📱 Vodacom M-Pesa Merchant Lipa Namba'],
                    ['tigopesa', '📱 Tigo Pesa Lipa Namba'],
                    ['airtel', '📱 Airtel Money Pay'],
                    ['card', '💳 Visa & Mastercard (Stripe Connect)'],
                    ['bank', '🏦 CRDB & NMB Bank Direct Wire']
                  ].map(([k, label]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.gateways?.[k] ?? true}
                        onChange={e => {
                          const updated = { ...(settings.gateways || {}), [k]: e.target.checked };
                          A.updatePlatformSettings({ gateways: updated });
                        }}
                        style={{ accentColor: '#10b981' }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Setting 4: Maintenance Mode */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f87171', fontSize: 15 }}>Maintenance Mode</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Temporarily lock out non-superadmin tenant logins during major infrastructure upgrades.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode ?? false}
                  onChange={e => {
                    A.updatePlatformSettings({ maintenanceMode: e.target.checked });
                    showToast(`Maintenance mode ${e.target.checked ? 'ACTIVATED' : 'DEACTIVATED'}`);
                  }}
                  style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#ef4444' }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: PROVISION NEW TENANT ================= */}
      {activeModal === 'create_tenant' && (
        <ProvisionTenantModal
          packages={packages}
          onClose={() => setActiveModal(null)}
          onSave={(data) => {
            A.createTenant(data, sess?.name || 'SuperAdmin');
            setActiveModal(null);
            showToast(`Tenant "${data.name}" provisioned successfully!`);
          }}
        />
      )}

      {/* ================= MODAL: EDIT TENANT ================= */}
      {activeModal === 'edit_tenant' && selectedTenant && (
        <EditTenantModal
          tenant={selectedTenant}
          packages={packages}
          onClose={() => { setActiveModal(null); setSelectedTenant(null); }}
          onSave={(updates) => {
            A.updateTenant(selectedTenant.id, updates, sess?.name || 'SuperAdmin');
            setActiveModal(null);
            setSelectedTenant(null);
            showToast(`Tenant updated successfully!`);
          }}
        />
      )}

      {/* ================= MODAL: CHANGE PLAN ================= */}
      {activeModal === 'change_plan' && selectedTenant && (
        <ChangePlanModal
          tenant={selectedTenant}
          packages={packages}
          onClose={() => { setActiveModal(null); setSelectedTenant(null); }}
          onSave={(pkgId, cycle) => {
            A.changeTenantPackage(selectedTenant.id, pkgId, cycle, sess?.name || 'SuperAdmin');
            setActiveModal(null);
            setSelectedTenant(null);
            showToast(`Subscription plan updated!`);
          }}
        />
      )}

      {/* ================= MODAL: RESET PASSWORD ================= */}
      {activeModal === 'reset_pwd' && selectedTenant && (
        <ResetPasswordModal
          tenant={selectedTenant}
          onClose={() => { setActiveModal(null); setSelectedTenant(null); }}
          onSave={(newPw) => {
            A.resetTenantAdminPassword(selectedTenant.id, newPw, sess?.name || 'SuperAdmin');
            setActiveModal(null);
            setSelectedTenant(null);
            showToast(`Admin password for ${selectedTenant.name} reset to "${newPw}"`);
          }}
        />
      )}

      {/* ================= DRAWER: VIEW TENANT OVERVIEW ================= */}
      {activeModal === 'view_tenant' && selectedTenant && (
        <TenantOverviewDrawer
          tenant={selectedTenant}
          packages={packages}
          invoices={invoices.filter(i => i.tenantId === selectedTenant.id)}
          onClose={() => { setActiveModal(null); setSelectedTenant(null); }}
          onEnter={() => handleEnterWorkspace(selectedTenant)}
        />
      )}

      {/* ================= MODAL: VIEW INVOICE RECEIPT ================= */}
      {activeModal === 'view_invoice' && selectedInvoice && (
        <InvoiceReceiptModal
          invoice={selectedInvoice}
          tenant={tenants.find(t => t.id === selectedInvoice.tenantId)}
          onClose={() => { setActiveModal(null); setSelectedInvoice(null); }}
        />
      )}

      {/* ================= MODAL: CREATE MANUAL INVOICE ================= */}
      {activeModal === 'create_invoice' && (
        <CreateInvoiceModal
          tenants={tenants}
          packages={packages}
          onClose={() => setActiveModal(null)}
          onSave={(invData) => {
            A.createInvoice(invData, sess?.name || 'SuperAdmin');
            setActiveModal(null);
            showToast(`Invoice generated for ${invData.tenantName}!`);
          }}
        />
      )}

      {/* ================= MODAL: EDIT PACKAGE ================= */}
      {activeModal === 'edit_pkg' && selectedPkg && (
        <EditPackageModal
          pkg={selectedPkg}
          onClose={() => { setActiveModal(null); setSelectedPkg(null); }}
          onSave={(updates) => {
            A.updatePackage(selectedPkg.id, updates, sess?.name || 'SuperAdmin');
            setActiveModal(null);
            setSelectedPkg(null);
            showToast(`Package "${selectedPkg.name}" updated!`);
          }}
        />
      )}
    </div>
  );
}

/* ================= SUB-COMPONENTS & MODALS ================= */

function ProvisionTenantModal({ packages, onClose, onSave }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [concept, setConcept] = useState('Dine-in Flame Grill & Lounge');
  const [packageId, setPackageId] = useState('pkg_growth');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isTrial, setIsTrial] = useState(false);
  const [city, setCity] = useState('Dar es Salaam');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('demo');
  const [branchesCount, setBranchesCount] = useState(1);
  const [tablesCount, setTablesCount] = useState(12);
  const [staffCount, setStaffCount] = useState(8);
  const [logoEmoji, setLogoEmoji] = useState('🍽️');

  const handleNameChange = (val) => {
    setName(val);
    if (!slug) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter the Restaurant Name');
    if (!adminPhone.trim()) return alert('Please enter Admin Mobile Phone');

    onSave({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      concept,
      packageId,
      billingCycle,
      isTrial,
      status: isTrial ? 'trial' : 'active',
      city,
      country: 'Tanzania',
      currency: 'TSh',
      adminName: adminName || 'Admin User',
      adminEmail: adminEmail || `${(slug || 'admin')}@restaurant.tz`,
      adminPhone,
      adminPassword: adminPassword || 'demo',
      branchesCount: Number(branchesCount) || 1,
      tablesCount: Number(tablesCount) || 12,
      staffCount: Number(staffCount) || 6,
      logoEmoji
    });
  };

  return (
    <div className="ov" style={{ zIndex: 100 }}>
      <div className="sh" style={{ maxWidth: 640, background: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
        <div className="modal-header" style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
          <h3 className="modal-title" style={{ color: '#fff' }}>
            <span>➕</span> Provision New Restaurant Tenant
          </h3>
          <button className="modal-close-btn" onClick={onClose} style={{ color: '#fff', background: '#334155' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Section 1: Restaurant Identity */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
              Restaurant Brand & Concept
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Icon</label>
                <input
                  type="text"
                  value={logoEmoji}
                  onChange={e => setLogoEmoji(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', textAlign: 'center', fontSize: 18 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Restaurant Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Serengeti Grill"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Subdomain Slug</label>
                <input
                  type="text"
                  placeholder="e.g. serengeti-grill"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Hospitality Concept</label>
                <select
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                >
                  <option value="Dine-in Flame Grill & Lounge">Dine-in Flame Grill & Lounge</option>
                  <option value="Fine Dining & Wine Bar">Fine Dining & Wine Bar</option>
                  <option value="Fast Food / Quick Service (QSR)">Fast Food / Quick Service (QSR)</option>
                  <option value="Seafood & Beachfront Bistro">Seafood & Beachfront Bistro</option>
                  <option value="Artisan Bakery & Cafe">Artisan Bakery & Cafe</option>
                  <option value="Multi-Location Restaurant Chain">Multi-Location Restaurant Chain</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>City / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Dar es Salaam, Masaki"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Package Tier & Billing */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
              Subscription Tier & Billing
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {packages.map(p => (
                <div
                  key={p.id}
                  onClick={() => setPackageId(p.id)}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: `2px solid ${packageId === p.id ? p.color : '#334155'}`,
                    background: packageId === p.id ? p.color + '18' : '#0f172a',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: 20 }}>{p.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 12, marginTop: 4 }}>{p.name.split(' ')[0]}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmt(p.priceMonthly)}/m</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cycle"
                  checked={billingCycle === 'monthly'}
                  onChange={() => setBillingCycle('monthly')}
                />
                Monthly Billing
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cycle"
                  checked={billingCycle === 'annual'}
                  onChange={() => setBillingCycle('annual')}
                />
                Annual Billing (20% OFF)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#fbbf24', marginLeft: 'auto', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isTrial}
                  onChange={e => setIsTrial(e.target.checked)}
                />
                Grant 14-Day Free Trial
              </label>
            </div>
          </div>

          {/* Section 3: Admin User Credentials */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
              Tenant Administrator Account
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Admin Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Mollel"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Admin Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. 0754112233"
                  value={adminPhone}
                  onChange={e => setAdminPhone(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Admin Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. admin@serengeti.tz"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Initial Password</label>
                <input
                  type="text"
                  placeholder="demo"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Scale Limits */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
              Initial Outlets & Operational Setup
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Branches</label>
                <input
                  type="number"
                  min="1"
                  value={branchesCount}
                  onChange={e => setBranchesCount(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Tables</label>
                <input
                  type="number"
                  min="1"
                  value={tablesCount}
                  onChange={e => setTablesCount(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94a3b8' }}>Staff Users</label>
                <input
                  type="number"
                  min="1"
                  value={staffCount}
                  onChange={e => setStaffCount(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13 }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: 10,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🚀 Provision & Launch Tenant Workspace
          </button>
        </form>
      </div>
    </div>
  );
}

function EditTenantModal({ tenant, packages, onClose, onSave }) {
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug || '');
  const [city, setCity] = useState(tenant.city || '');
  const [adminName, setAdminName] = useState(tenant.adminName || '');
  const [adminPhone, setAdminPhone] = useState(tenant.adminPhone || '');
  const [adminEmail, setAdminEmail] = useState(tenant.adminEmail || '');
  const [branchesCount, setBranchesCount] = useState(tenant.branchesCount || 1);
  const [tablesCount, setTablesCount] = useState(tenant.tablesCount || 12);
  const [staffCount, setStaffCount] = useState(tenant.staffCount || 6);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      slug,
      city,
      adminName,
      adminPhone,
      adminEmail,
      branchesCount: Number(branchesCount) || 1,
      tablesCount: Number(tablesCount) || 12,
      staffCount: Number(staffCount) || 6
    });
  };

  return (
    <div className="ov" style={{ zIndex: 100 }}>
      <div className="sh" style={{ maxWidth: 520, background: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
        <div className="modal-header" style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
          <h3 className="modal-title" style={{ color: '#fff' }}>
            <span>✏️</span> Edit Tenant: {tenant.name}
          </h3>
          <button className="modal-close-btn" onClick={onClose} style={{ color: '#fff', background: '#334155' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8' }}>Restaurant Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Subdomain Slug</label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Admin Name</label>
              <input
                type="text"
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Admin Phone</label>
              <input
                type="text"
                value={adminPhone}
                onChange={e => setAdminPhone(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Branches</label>
              <input
                type="number"
                value={branchesCount}
                onChange={e => setBranchesCount(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Tables</label>
              <input
                type="number"
                value={tablesCount}
                onChange={e => setTablesCount(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Staff</label>
              <input
                type="number"
                value={staffCount}
                onChange={e => setStaffCount(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: 10,
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Save Tenant Changes
          </button>
        </form>
      </div>
    </div>
  );
}

function ChangePlanModal({ tenant, packages, onClose, onSave }) {
  const [packageId, setPackageId] = useState(tenant.packageId || 'pkg_growth');
  const [cycle, setCycle] = useState(tenant.billingCycle || 'monthly');

  return (
    <div className="ov" style={{ zIndex: 100 }}>
      <div className="sh" style={{ maxWidth: 480, background: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
        <div className="modal-header" style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
          <h3 className="modal-title" style={{ color: '#fff' }}>
            <span>💳</span> Change Plan for {tenant.name}
          </h3>
          <button className="modal-close-btn" onClick={onClose} style={{ color: '#fff', background: '#334155' }}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {packages.map(p => (
              <div
                key={p.id}
                onClick={() => setPackageId(p.id)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: `2px solid ${packageId === p.id ? p.color : '#334155'}`,
                  background: packageId === p.id ? p.color + '18' : '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{p.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.tagline}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#10b981' }}>{fmt(p.priceMonthly)}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>/month</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 14, background: '#0f172a', padding: 12, borderRadius: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="radio"
                name="plan_cycle"
                checked={cycle === 'monthly'}
                onChange={() => setCycle('monthly')}
              />
              Monthly Subscription
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#10b981' }}>
              <input
                type="radio"
                name="plan_cycle"
                checked={cycle === 'annual'}
                onChange={() => setCycle('annual')}
              />
              Annual Subscription (20% OFF)
            </label>
          </div>

          <button
            onClick={() => onSave(packageId, cycle)}
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Confirm Plan Upgrade / Downgrade
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ tenant, onClose, onSave }) {
  const [newPassword, setNewPassword] = useState('demo');

  return (
    <div className="ov" style={{ zIndex: 100 }}>
      <div className="sh" style={{ maxWidth: 400, background: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
        <div className="modal-header" style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
          <h3 className="modal-title" style={{ color: '#fff' }}>
            <span>🔑</span> Reset Password
          </h3>
          <button className="modal-close-btn" onClick={onClose} style={{ color: '#fff', background: '#334155' }}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>
            Set a new temporary password for <strong>{tenant.adminName || 'Admin'}</strong> ({tenant.adminPhone}):
          </p>

          <input
            type="text"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#fff', fontSize: 14, fontWeight: 700 }}
          />

          <button
            onClick={() => onSave(newPassword)}
            style={{
              background: '#f59e0b',
              color: '#000',
              border: 'none',
              borderRadius: 10,
              padding: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Update Admin Password
          </button>
        </div>
      </div>
    </div>
  );
}

function TenantOverviewDrawer({ tenant, packages, invoices, onClose, onEnter }) {
  const pkg = packages.find(p => p.id === tenant.packageId) || packages[1];

  return (
    <div className="ov" style={{ zIndex: 100 }}>
      <div className="sh" style={{ maxWidth: 600, background: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
        <div className="modal-header" style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{tenant.logoEmoji || '🍽️'}</span>
            <div>
              <h3 className="modal-title" style={{ color: '#fff', margin: 0 }}>{tenant.name}</h3>
              <small style={{ color: '#38bdf8' }}>{tenant.domain || `${tenant.slug}.restoerp.io`}</small>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} style={{ color: '#fff', background: '#334155' }}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Action Button to Enter Workspace */}
          <button
            onClick={onEnter}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: 12,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(124,58,237,0.4)'
            }}
          >
            <span>🚀</span> Log In & Enter {tenant.name} Workspace
          </button>

          {/* Details Grid */}
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
              Account & Subscription Overview
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div>Plan: <strong style={{ color: '#38bdf8' }}>{pkg.name}</strong></div>
              <div>Billing: <strong style={{ textTransform: 'capitalize' }}>{tenant.billingCycle}</strong></div>
              <div>Status: <strong style={{ textTransform: 'uppercase', color: tenant.status === 'active' ? '#10b981' : '#f87171' }}>{tenant.status}</strong></div>
              <div>Monthly Fee: <strong style={{ color: '#10b981' }}>{fmt(tenant.monthlyFee)}</strong></div>
              <div>Administrator: <strong>{tenant.adminName}</strong></div>
              <div>Phone: <strong>{tenant.adminPhone}</strong></div>
              <div>Email: <strong style={{ color: '#94a3b8' }}>{tenant.adminEmail}</strong></div>
              <div>Location: <strong>{tenant.city}, {tenant.country || 'Tanzania'}</strong></div>
            </div>
          </div>

          {/* Operational Limits */}
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
              Hospitality Scale
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
              <div style={{ background: '#1e293b', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{tenant.branchesCount || 1}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Branches</div>
              </div>
              <div style={{ background: '#1e293b', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{tenant.tablesCount || 12}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Tables</div>
              </div>
              <div style={{ background: '#1e293b', padding: 10, borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{tenant.staffCount || 6}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Staff Seats</div>
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
              Subscription Invoices ({invoices.length})
            </div>
            {invoices.length === 0 ? (
              <div style={{ fontSize: 12, color: '#64748b' }}>No invoices on record for this tenant.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {invoices.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{inv.id} · {inv.period}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{inv.method || 'Pending'} {inv.refNo ? `(${inv.refNo})` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: inv.status === 'paid' ? '#10b981' : '#f87171' }}>{fmt(inv.amount)}</div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: inv.status === 'paid' ? '#34d399' : '#f87171' }}>{inv.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceReceiptModal({ invoice, tenant, onClose }) {
  return (
    <div className="ov" style={{ zIndex: 100 }}>
      <div className="sh" style={{ maxWidth: 480, background: '#fff', color: '#111827', border: '1px solid #e5e7eb' }}>
        <div className="modal-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
          <h3 className="modal-title" style={{ color: '#111827' }}>
            <span>📄</span> Subscription Invoice / Receipt
          </h3>
          <button className="modal-close-btn" onClick={onClose} style={{ color: '#111827', background: '#e2e8f0' }}>✕</button>
        </div>

        <div className="modal-body" style={{ padding: 24, fontSize: 13 }}>
          {/* Paper Receipt Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px dashed #e2e8f0', paddingBottom: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed' }}>RestoERP Cloud</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>RestoERP Technologies Ltd · Dar es Salaam, Tanzania</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>VAT Registration: 40-0291981-Z · support@restoerp.io</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginTop: 8 }}>OFFICIAL SUBSCRIPTION INVOICE</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0', fontSize: 12 }}>
            <div>
              <div style={{ color: '#6b7280' }}>Billed To:</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{invoice.tenantName}</div>
              <div style={{ color: '#4b5563' }}>Attn: {tenant?.adminName || 'Owner'}</div>
              <div style={{ color: '#4b5563' }}>Phone: {tenant?.adminPhone}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#6b7280' }}>Invoice #: <strong>{invoice.id}</strong></div>
              <div style={{ color: '#6b7280' }}>Date: {new Date(invoice.issuedDate).toLocaleDateString()}</div>
              <div style={{ color: '#6b7280' }}>Status: <strong style={{ color: invoice.status === 'paid' ? '#15803D' : '#DC2626', textTransform: 'uppercase' }}>{invoice.status}</strong></div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: 8 }}>Description</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 8 }}>
                  <strong>{invoice.packageName}</strong>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Billing Period: {invoice.period}</div>
                </td>
                <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>
                  {fmt(invoice.amount)}
                </td>
              </tr>
              <tr style={{ borderTop: '2px solid #111827', fontWeight: 800 }}>
                <td style={{ padding: '10px 8px' }}>Total Amount Paid</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 15, color: '#15803D' }}>
                  {fmt(invoice.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          {invoice.method && (
            <div style={{ background: '#f1f5f9', padding: 10, borderRadius: 8, fontSize: 11.5, marginBottom: 16 }}>
              <div>Payment Method: <strong>{invoice.method}</strong></div>
              {invoice.refNo && <div>Transaction Ref: <code>{invoice.refNo}</code></div>}
              {invoice.paidAt && <div>Settled Date: {fmtDateTime(invoice.paidAt)}</div>}
            </div>
          )}

          <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
            Thank you for powering your hospitality operations with RestoERP Cloud.
          </div>

          <button
            onClick={() => window.print()}
            style={{
              marginTop: 16,
              width: '100%',
              background: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: 10,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🖨️ Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateInvoiceModal({ tenants, packages, onClose, onSave }) {
  const [tenantId, setTenantId] = useState(tenants[0]?.id || '');
  const [amount, setAmount] = useState(249000);
  const [period, setPeriod] = useState('December 2026');
  const [notes, setNotes] = useState('Monthly SaaS package subscription');

  const selectedTenant = tenants.find(t => t.id === tenantId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTenant) return alert('Select tenant');

    onSave({
      tenantId,
      tenantName: selectedTenant.name,
      packageName: packages.find(p => p.id === selectedTenant.packageId)?.name || 'Growth Plan',
      packageId: selectedTenant.packageId || 'pkg_growth',
      amount: Number(amount) || 0,
      currency: 'TSh',
      status: 'pending',
      period,
      notes
    });
  };

  return (
    <div className="ov" style={{ zIndex: 100 }}>
      <div className="sh" style={{ maxWidth: 480, background: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
        <div className="modal-header" style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
          <h3 className="modal-title" style={{ color: '#fff' }}>
            <span>➕</span> Generate Subscription Invoice
          </h3>
          <button className="modal-close-btn" onClick={onClose} style={{ color: '#fff', background: '#334155' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8' }}>Select Restaurant Tenant</label>
            <select
              value={tenantId}
              onChange={e => {
                setTenantId(e.target.value);
                const t = tenants.find(x => x.id === e.target.value);
                if (t) setAmount(t.monthlyFee || 249000);
              }}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8' }}>Invoice Amount (TSh)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontWeight: 700 }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8' }}>Billing Period / Term</label>
            <input
              type="text"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8' }}>Invoice Notes</label>
            <textarea
              rows="2"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: 10,
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Issue Subscription Invoice
          </button>
        </form>
      </div>
    </div>
  );
}

function EditPackageModal({ pkg, onClose, onSave }) {
  const [name, setName] = useState(pkg.name);
  const [tagline, setTagline] = useState(pkg.tagline || '');
  const [priceMonthly, setPriceMonthly] = useState(pkg.priceMonthly);
  const [priceAnnual, setPriceAnnual] = useState(pkg.priceAnnual);
  const [maxBranches, setMaxBranches] = useState(pkg.limits?.branches || 1);
  const [maxTables, setMaxTables] = useState(pkg.limits?.tables || 12);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      tagline,
      priceMonthly: Number(priceMonthly) || 0,
      priceAnnual: Number(priceAnnual) || 0,
      limits: {
        ...(pkg.limits || {}),
        branches: Number(maxBranches) || 1,
        tables: Number(maxTables) || 12
      }
    });
  };

  return (
    <div className="ov" style={{ zIndex: 100 }}>
      <div className="sh" style={{ maxWidth: 480, background: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
        <div className="modal-header" style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
          <h3 className="modal-title" style={{ color: '#fff' }}>
            <span>✏️</span> Edit Package: {pkg.name}
          </h3>
          <button className="modal-close-btn" onClick={onClose} style={{ color: '#fff', background: '#334155' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8' }}>Package Plan Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8' }}>Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Monthly Fee (TSh)</label>
              <input
                type="number"
                value={priceMonthly}
                onChange={e => setPriceMonthly(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Annual Fee (TSh)</label>
              <input
                type="number"
                value={priceAnnual}
                onChange={e => setPriceAnnual(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff', fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Max Branches</label>
              <input
                type="number"
                value={maxBranches}
                onChange={e => setMaxBranches(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8' }}>Max Tables</label>
              <input
                type="number"
                value={maxTables}
                onChange={e => setMaxTables(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#fff' }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: 10,
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Save Package Updates
          </button>
        </form>
      </div>
    </div>
  );
}
