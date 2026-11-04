import React, { useState, useContext } from 'react';
import { USERS, PACKAGES, fmt } from '../data';
import { Ctx } from '../store';
import { Sheet, LanguageToggle } from '../components/ui';

export function Landing({ go, onDirectRole, onSelectPackage }) {
  const { S, lang, t } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  const [showPersonas, setShowPersonas] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  const packages = S.packages || PACKAGES;

  const handleStartWithPackage = (pkgId) => {
    if (onSelectPackage) onSelectPackage(pkgId);
    go('auth:register');
  };

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', minHeight: '100vh', fontFamily: 'inherit' }}>
      {/* ── Top Navigation Bar ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 2px 10px rgba(16,185,129,0.35)'
          }}>
            🍽️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: -0.3 }}>
              RestoERP <span style={{ color: '#10b981' }}>Cloud</span>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {isSw ? 'Usimamizi wa Migahawa na Baa' : 'Hospitality & Restaurant SaaS'}
            </div>
          </div>
        </div>

        {/* Desktop Quick Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 20 }} className="landing-nav">
          <a href="#features" style={{ color: '#cbd5e1', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
            {isSw ? 'Sifa za Mfumo' : 'Features'}
          </a>
          <a href="#pricing" style={{ color: '#cbd5e1', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
            {isSw ? 'Vifurushi vya Bei' : 'Pricing Plans'}
          </a>
          <button
            onClick={() => setShowPersonas(true)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#38bdf8',
              border: '1px solid rgba(56,189,248,0.3)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isSw ? '⚡ Watumiaji wa Mfano' : '⚡ Live Personas'}
          </button>
        </nav>

        {/* Right Action Buttons with Language Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageToggle isLight={true} />

          <button
            onClick={() => go('auth:login')}
            style={{
              background: 'transparent',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: 10,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isSw ? 'Ingia Kazini' : 'Staff Sign In'}
          </button>

          <button
            onClick={() => go('auth:register')}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(16,185,129,0.3)'
            }}
          >
            {isSw ? 'Jaribu Bure' : 'Start Free Trial'}
          </button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section style={{
        padding: '60px 24px 40px',
        maxWidth: 1200,
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Glow backdrop */}
        <div style={{
          position: 'absolute',
          top: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70%',
          height: 300,
          background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            padding: '6px 16px',
            borderRadius: 99,
            fontSize: 12.5,
            fontWeight: 700,
            marginBottom: 20
          }}>
            <span>🔥</span> {isSw ? 'Mfumo Mahiri wa Kisasa wa Kidijitali kwa Migahawa na Baa' : 'Next-Generation Multi-Tenant Cloud ERP for Hospitality'}
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 900,
            lineHeight: 1.15,
            color: '#fff',
            margin: '0 auto 18px',
            maxWidth: 920,
            letterSpacing: -1
          }}>
            {isSw ? 'Mfumo Moja Mahiri wa Kuendesha Mgahawa, Baa na Matawi Yako Yote.' : 'One Unified Cloud Platform for Restaurants, Bars & Multi-Branch Chains.'}
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: '#94a3b8',
            maxWidth: 780,
            margin: '0 auto 32px',
            lineHeight: 1.6
          }}>
            {isSw ? 'Kuagiza mezani kwa QR, mauzo na risiti za kaunta (POS), skrini ya jikoni (KDS), udhibiti wa stoo ya vinywaji na makreti, maandalizi ya jikoni, na taarifa sahihi za faida na hasara (P&L).' : 'Power table QR ordering, lightning POS cashier settlements, real-time Kitchen Displays, dual-stock inventory, Central Kitchen sub-recipe BOMs, double-entry accounting, and multi-tenant provider administration.'}
          </p>

          {/* Primary CTA Buttons Strip */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 40
          }}>
            <button
              onClick={() => go('auth:register')}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '16px 32px',
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16,185,129,0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all .15s'
              }}
            >
              <span>🚀</span> {isSw ? 'Anza Jaribio la Siku 14 Bure' : 'Start 14-Day Free Trial (Wizard)'}
            </button>

            <button
              onClick={() => {
                const superAdminUser = (S.users || USERS).find(u => u.role === 'superadmin') || USERS[0];
                if (onDirectRole) onDirectRole(superAdminUser);
                else go('superadmin');
              }}
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.25))',
                color: '#c4b5fd',
                border: '1.5px solid rgba(124,58,237,0.5)',
                borderRadius: 12,
                padding: '16px 28px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>👑</span> SuperAdmin Provider Console
            </button>

            <button
              onClick={() => setShowPersonas(true)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: 12,
                padding: '16px 24px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>⚡</span> Explore Live Personas
            </button>
          </div>

          {/* Social Proof / Metrics Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            maxWidth: 960,
            margin: '0 auto',
            padding: '20px 24px',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16
          }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981' }}>120+</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Active Dining Venues</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8' }}>99.99%</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>High Availability SLA</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#c084fc' }}>TSh 1.4B+</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Transactions Processed</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fbbf24' }}>Zero</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Proprietary Hardware Lock</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Highlights Grid ── */}
      <section id="features" style={{ padding: '60px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ color: '#10b981', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
            Full-Stack Hospitality Architecture
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: '8px 0' }}>
            Built from the Ground Up for Modern Food & Beverage
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 640, margin: '0 auto' }}>
            Eliminate fragmented tools. RestoERP unites front-of-house dining with kitchen execution, warehouse supply chains, and executive accounting.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20
        }}>
          {[
            {
              icon: '🍽️',
              title: 'Smart POS & Table QR Mobile Ordering',
              desc: 'Interactive visual floor plan, table scanning, customer mobile checkout, waiter links with automated commission calculation, and daily cashier drawer balancing.',
              color: '#e67e22'
            },
            {
              icon: '👨‍🍳',
              title: 'Multi-Station Kitchen Display (KDS)',
              desc: 'Eliminate thermal paper jams. Station routing (Grill, Fry, Bar, Pastry), live cooking timers, visual ticket stages, and instant auto-86 menu stock depletion sync.',
              color: '#8e44ad'
            },
            {
              icon: '📦',
              title: 'Dual-Stock & Crate Deposit Ledger',
              desc: 'Dual tracking between Main Store and selling bars. Direct pack multipliers for beer/soda without recipe hassle, plus empty crate & returnable bottle deposit ledger.',
              color: '#2980b9'
            },
            {
              icon: '🏭',
              title: 'Central Kitchen & BOM Manufacturing',
              desc: 'Standardized Bill of Materials (BOM) sub-recipes, batch manufacturing work orders, temperature safety logging, and inter-branch refrigerated requisitions.',
              color: '#16a085'
            },
            {
              icon: '💲',
              title: 'Double-Entry Accounting & Boss P&L',
              desc: 'Tanzanian VAT and service charge taxation, automated journal entries, real-time Boss P&L statement, supplier AP payables, and operating expense analytics.',
              color: '#1C7A4B'
            },
            {
              icon: '👑',
              title: 'Multi-Tenant SaaS Provider Engine',
              desc: 'System provider control console with one-click tenant creation, custom subdomains, subscription tiers, automated M-Pesa billing, and instant workspace impersonation.',
              color: '#7c3aed'
            }
          ].map((feat, i) => (
            <div
              key={i}
              style={{
                background: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'all .2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = feat.color;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e293b';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: feat.color + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                border: `1px solid ${feat.color}40`
              }}>
                {feat.icon}
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>{feat.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6 }}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Interactive SaaS Packages & Pricing ── */}
      <section id="pricing" style={{ padding: '60px 24px', background: '#0c1322', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ color: '#10b981', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
              Transparent Subscription Pricing
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: '8px 0' }}>
              Simple, Predictable Packages for Every Stage
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 600, margin: '0 auto 20px' }}>
              All packages include a 14-day free trial. Scale seamlessly from a single food truck to a national multi-branch franchise.
            </p>

            {/* Billing Cycle Toggle */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: '#1e293b',
              padding: '6px 14px',
              borderRadius: 99,
              border: '1px solid #334155'
            }}>
              <span style={{ fontSize: 13, fontWeight: billingCycle === 'monthly' ? 700 : 400, color: billingCycle === 'monthly' ? '#fff' : '#94a3b8' }}>
                Monthly Billing
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
                Annual Billing <span style={{ background: '#10b98125', color: '#34d399', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>20% OFF</span>
              </span>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            alignItems: 'stretch'
          }}>
            {packages.map(p => {
              const price = billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly;

              return (
                <div
                  key={p.id}
                  style={{
                    background: '#131b2e',
                    border: p.popular ? `2px solid ${p.color}` : '1px solid #1e293b',
                    borderRadius: 20,
                    padding: 28,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: p.popular ? '0 10px 30px rgba(16,185,129,0.15)' : 'none'
                  }}
                >
                  {p.popular && (
                    <div style={{
                      position: 'absolute',
                      top: -12,
                      right: 28,
                      background: p.color,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: 99,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}>
                      Most Popular Tier
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: p.color + '20',
                      color: p.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      border: `1px solid ${p.color}40`
                    }}>
                      {p.icon || '📦'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>{p.name}</h3>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{p.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ margin: '18px 0 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{fmt(price)}</span>
                      <span style={{ fontSize: 14, color: '#94a3b8' }}>/{billingCycle === 'annual' ? 'year' : 'month'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                      {billingCycle === 'annual' ? 'Billed annually · Includes 2 months free' : 'Billed monthly · Cancel anytime'}
                    </div>
                  </div>

                  {/* Scale summary */}
                  <div style={{
                    background: '#090d16',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 12,
                    color: '#cbd5e1',
                    marginBottom: 18,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>🏬 {p.limits?.branches >= 999 ? 'Unlimited' : p.limits?.branches} Branch</span>
                    <span>🪑 {p.limits?.tables >= 999 ? 'Unlimited' : p.limits?.tables} Tables</span>
                    <span>👤 {p.limits?.staffUsers >= 999 ? 'Unlimited' : p.limits?.staffUsers} Staff</span>
                  </div>

                  {/* Features list */}
                  <div style={{ flex: 1, borderTop: '1px solid #1e293b', paddingTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
                      What's Included:
                    </div>
                    <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.8 }}>
                      {p.features?.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleStartWithPackage(p.id)}
                    style={{
                      marginTop: 24,
                      background: p.popular ? 'linear-gradient(135deg, #10b981, #059669)' : '#1e293b',
                      color: '#fff',
                      border: p.popular ? 'none' : '1px solid #334155',
                      borderRadius: 12,
                      padding: 14,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: p.popular ? '0 4px 14px rgba(16,185,129,0.3)' : 'none',
                      transition: 'all .15s'
                    }}
                  >
                    Select {p.name.split(' ')[0]} & Register ›
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials & Proof ── */}
      <section style={{ padding: '60px 24px', maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 30 }}>
          Trusted by Premier Hospitality Groups
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            {
              quote: "RestoERP replaced 4 disparate systems for us. Managing Masaki flagship, Oysterbay kiosk, and our Central Kitchen from one dashboard changed our profitability.",
              author: "David Kimani",
              role: "Owner, Safari Grill & Lounge Group"
            },
            {
              quote: "The dual-stock beer and direct link drinks tracking solved 100% of our bar inventory variances. Our storekeeper and bartenders are perfectly in sync.",
              author: "Sarah Mollel",
              role: "General Manager, Serengeti Steakhouse"
            },
            {
              quote: "As a SaaS provider, onboarding new restaurant tenants takes under 60 seconds with instant subdomains and automated M-Pesa subscription renewals.",
              author: "Amina Mwamba",
              role: "Lead Systems Architect, RestoERP Cloud"
            }
          ].map((t, i) => (
            <div key={i} style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: 14, padding: 22, textAlign: 'left' }}>
              <div style={{ color: '#f59e0b', fontSize: 16, marginBottom: 8 }}>★★★★★</div>
              <p style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 14px' }}>
                "{t.quote}"
              </p>
              <div>
                <strong style={{ color: '#fff', fontSize: 13, display: 'block' }}>{t.author}</strong>
                <small style={{ color: '#94a3b8', fontSize: 11 }}>{t.role}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom Call to Action ── */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(124,58,237,0.2))',
        borderTop: '1px solid #1e293b',
        padding: '50px 24px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>
            Ready to Modernize Your Restaurant Operations?
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: 15, margin: '0 0 24px' }}>
            Get started in 60 seconds with our interactive onboarding wizard. Full 14-day free trial with sample menus and recipes included.
          </p>

          <button
            onClick={() => go('auth:register')}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '16px 36px',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(16,185,129,0.4)'
            }}
          >
            🚀 Launch Your Restaurant Cloud ERP Now
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: '#090d16',
        borderTop: '1px solid #1e293b',
        padding: '30px 24px',
        textAlign: 'center',
        fontSize: 12,
        color: '#64748b'
      }}>
        <div>© 2026 RestoERP Cloud Technologies Ltd. All rights reserved.</div>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <span>Multi-Tenant Hospitality SaaS</span> ·
          <span>Vodacom M-Pesa & Tigo Pesa Connected</span> ·
          <span style={{ color: '#10b981' }}>System Status: Normal (100% Operational)</span>
        </div>
      </footer>

      {/* ── Sheet: Live Persona / Role Switcher ── */}
      {showPersonas && (
        <Sheet title="Select SRS Persona or SuperAdmin" onClose={() => setShowPersonas(false)}>
          <div style={{ display: 'grid', gap: 8 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--mut)' }}>
              Instant role launch without typing phone numbers or passwords:
            </p>

            <div className="roles-list-grid">
              {(S.users || USERS).map(u => (
                <button
                  key={u.id}
                  className="role-select-card"
                  onClick={() => {
                    setShowPersonas(false);
                    if (onDirectRole) onDirectRole(u);
                    else go(u.role);
                  }}
                  style={{
                    background: u.role === 'superadmin' ? 'rgba(124,58,237,0.1)' : 'var(--card)',
                    border: u.role === 'superadmin' ? '1.5px solid #7c3aed' : '1px solid var(--line)'
                  }}
                >
                  <div className="role-icon">
                    {u.role === 'superadmin' ? '👑' : u.role === 'customer' ? '🍽️' : u.role === 'waiter' ? '🧑‍🍳' : u.role === 'chef' ? '🍳' : u.role === 'production' ? '🏭' : u.role === 'cashier' ? '💳' : u.role === 'storekeeper' ? '📦' : u.role === 'manager' ? '👔' : '🏢'}
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: 700, color: u.role === 'superadmin' ? '#7c3aed' : 'var(--tx)' }}>
                      {u.name}
                      {u.role === 'superadmin' && (
                        <span style={{ marginLeft: 6, fontSize: 10, background: '#7c3aed', color: '#fff', padding: '1px 6px', borderRadius: 99, fontWeight: 800 }}>
                          SYSTEM PROVIDER
                        </span>
                      )}
                    </div>
                    <small style={{ color: 'var(--mut)' }}>{u.title} ({u.role})</small>
                  </div>
                  <span style={{ color: u.role === 'superadmin' ? '#7c3aed' : 'var(--g)', fontSize: 13, fontWeight: 700 }}>
                    Launch ▸
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
