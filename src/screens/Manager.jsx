import React, { useState, useContext, useEffect } from 'react';
import { fmt, fmtNum, tot, calcNet, calcTax, SITES, TABLES } from '../data';
import { Ctx } from '../store';
import { Hd, Pill, Sheet, Tabs, TopBar } from '../components/ui';
import { ManagerReviewModal } from '../components/FastDrinksAndInventory';
import { MenuManagementView } from '../components/MenuManagement';

export function Manager({ sess, out, setSess, setV }) {
  const { S, A, wn, lang } = useContext(Ctx);
  const isSw = (lang || 'sw') === 'sw';
  const [tab, setTab] = useState('overview');
  const [selWaiterId, setSelWaiterId] = useState('all');
  const [drillOrder, setDrillOrder] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);

  // Commission Policy State (WCM-01 to WCM-14)
  const p0 = S.policy || { method: 'percent', rate: 5, fixed: 2000, basis: 'gross', trigger: 'payment', overrides: { w1: 5.5 } };
  const [policyForm, setPolicyForm] = useState(p0);
  const [policySaved, setPolicySaved] = useState(false);

  // VAT & Tax Settings State
  const vat0 = S.vatSettings || {
    enabled: true,
    rate: 18,
    inclusive: true,
    taxNumber: '104824986',
    vrn: '40012984-Z',
    taxLabel: 'VAT 18%'
  };
  const [vatForm, setVatForm] = useState(() => ({ ...vat0, ...(S.vatSettings || {}) }));
  const [vatSaved, setVatSaved] = useState(false);

  useEffect(() => {
    if (S.vatSettings) {
      setVatForm(prev => ({ ...vat0, ...S.vatSettings }));
    }
  }, [S.vatSettings]);

  const handleSaveVat = () => {
    A.setVatSettings(vatForm, sess?.name || 'Manager');
    setVatSaved(true);
    setTimeout(() => setVatSaved(false), 2500);
  };

  const currentVat = S.vatSettings || vat0;
  const isVatOn = currentVat.enabled !== false;

  // Financial aggregates
  const paid = (S.orders || []).filter(o => o.paid || o.st === 'closed');
  const grossSales = paid.reduce((a, o) => a + tot(o), 0);
  const netSales = calcNet(grossSales, currentVat);
  const taxCollected = calcTax(grossSales, currentVat);
  const totalCovers = (S.orders || []).reduce((a, o) => a + (o.it || []).reduce((x, l) => x + l.q, 0), 0);
  const avgCheck = paid.length > 0 ? Math.round(grossSales / paid.length) : 0;
  const liveCount = (S.orders || []).filter(o => !['paid', 'closed', 'cancelled'].includes(o.st)).length;

  const commissionAccrued = (S.ledger || []).filter(l => l.st !== 'reversed').reduce((a, l) => a + l.amt, 0);
  const commissionCostPct = grossSales > 0 ? ((commissionAccrued / grossSales) * 100).toFixed(1) : '0.0';

  // Commission policy preview estimation (WCM-07)
  const fx = policyForm.method === 'fixed';
  const previewEst = paid.reduce((a, o) => {
    const base = policyForm.basis === 'net' ? (isVatOn ? tot(o) / (1 + (currentVat.rate || 18) / 100) : tot(o)) : tot(o);
    return a + (fx ? policyForm.fixed : Math.round((base * policyForm.rate) / 100));
  }, 0);

  const handleSavePolicy = () => {
    A.setPolicy(policyForm, sess?.name || 'Manager Rehema');
    setPolicySaved(true);
    setTimeout(() => setPolicySaved(false), 2500);
  };

  const currentSite = SITES.find(s => s.id === (S.siteId || 'masaki')) || SITES[0];
  const unreviewedItems = (S.menu || []).filter(m => m.needsReview);

  return (
    <div className="app wide">
      <TopBar sess={sess} setSess={setSess} setV={setV} currentView="manager" />

      {unreviewedItems.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
          border: '1.5px solid #F59E0B',
          borderRadius: 16,
          padding: '12px 18px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 2px 10px rgba(245, 158, 11, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>⚠️</span>
            <div>
              <b style={{ color: '#92400E', fontSize: 14.5 }}>
                {isSw
                  ? `Bidhaa ${unreviewedItems.length} za Menyu Zilizoongezwa Haraka Zinahitaji Kuunganishwa na Stoo`
                  : `${unreviewedItems.length} Quick-Added Menu Item${unreviewedItems.length > 1 ? 's' : ''} Need Stock & Cost Linking`}
              </b>
              <div style={{ fontSize: 12, color: '#B45309' }}>
                {isSw
                  ? 'Bidhaa ziliongezwa haraka (<10s) na keshia/jiko. Unganisha na bidhaa za stoo ili kufuatilia matumizi na faida.'
                  : 'Items were added rapidly on-site (<10s) by cashier/kitchen. Link to inventory stock items to track depleted stock and margins.'}
              </div>
            </div>
          </div>
          <button
            className="btn sm o"
            style={{ background: '#D97706', color: '#fff', fontSize: 12.5, whiteSpace: 'nowrap' }}
            onClick={() => setReviewModal(true)}
          >
            {isSw ? `Kagua Bidhaa (${unreviewedItems.length}) ➔` : `Review Items (${unreviewedItems.length}) ➔`}
          </button>
        </div>
      )}

      <Hd
        s={`${isSw ? 'Meneja Mkuu wa Tawi' : 'Site General Manager'} · ${sess?.name || 'Rehema Said'}`}
        t={isSw ? 'Dashibodi ya Uendeshaji wa Meneja' : 'Manager Operating Console'}
        r={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm o" onClick={A.approve}>
              {isSw ? '✓ Idhinisha Kamisheni Zote' : '✓ Approve All Commissions'}
            </button>
            <button className="btn sm ghost" onClick={out}>
              {isSw ? 'Toka' : 'Exit'}
            </button>
          </div>
        }
      />

      <div className="inv-subnav">
        {[
          ['overview', isSw ? 'Uendeshaji wa Siku & KPIs' : 'Day Operations & KPIs', '📊'],
          ['vat', isSw ? 'Mipangilio ya VAT na Kodi' : 'VAT & Tax Settings', '🏛️'],
          ['menu', isSw ? 'Orodha ya Menyu na Bei' : 'Menu Catalog & Pricing', '🍽️'],
          ['finance', isSw ? 'Faida & Hasara (P&L) na Gharama' : 'Site P&L & Expenses', '💼'],
          ['commission', isSw ? 'Sera ya Kamisheni' : 'Commission Policy', '💰'],
          ['reconciliation', isSw ? 'Uhakiki wa Wahudumu' : 'Waiter Reconciliation', '🧾'],
          ['checklists', isSw ? 'Orodha za Ukaguzi & HACCP' : 'Daily Checklists & HACCP', '📋'],
          ['audit', isSw ? 'Kumbukumbu ya Ukaguzi' : 'Audit Log', '🛡️']
        ].map(([k, l, icon]) => (
          <button
            key={k}
            className={`inv-tab-btn ${tab === k ? 'on' : ''}`}
            onClick={() => setTab(k)}
          >
            <span>{icon}</span>
            <span>{l}</span>
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Day Lifecycle Automation Banner (Section 6.3) */}
          <div className="card" style={{ marginBottom: 14, background: 'linear-gradient(135deg, #093B2F, #0E5A47)', color: '#fff' }}>
            <div className="row">
              <div>
                <small style={{ color: '#cfe8df' }}>{isSw ? 'ENEO LA TAWI · RATIBA YA SIKU' : 'SITE WORKSPACE · TIMELINE'}</small>
                <h3 style={{ margin: '4px 0', color: '#fff' }}>{currentSite.name}</h3>
                <div style={{ fontSize: 13, color: '#cfe8df' }}>
                  {isSw ? 'Hali ya Sasa:' : 'Current Status:'}{' '}
                  <b style={{ color: '#FFD700', textTransform: 'uppercase' }}>
                    {S.shiftState || (isSw ? 'Huduma Inaendelea' : 'Live Service')}
                  </b>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className={`btn sm ${S.shiftState === 'opening' ? 'o' : 'ghost'}`}
                  style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  onClick={() => A.setShift('opening', sess?.name || 'Manager')}
                >
                  {isSw ? '1. Kufungua' : '1. Opening'}
                </button>
                <button
                  className={`btn sm ${S.shiftState === 'service' ? 'o' : 'ghost'}`}
                  style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  onClick={() => A.setShift('service', sess?.name || 'Manager')}
                >
                  {isSw ? '2. Huduma' : '2. Service'}
                </button>
                <button
                  className={`btn sm ${S.shiftState === 'closed' ? 'o' : 'ghost'}`}
                  style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  onClick={() => A.setShift('closed', sess?.name || 'Manager')}
                >
                  {isSw ? '3. Kufunga Siku' : '3. Day-Close'}
                </button>
              </div>
            </div>
          </div>

          <div className="tiles">
            {[
              [isSw ? 'Mauzo Ghafi Leo' : 'Gross Sales Today', fmt(grossSales), isSw ? 'Lengo: TSh 1,200,000' : 'Target: TSh 1,200,000', '#15803D'],
              [isSw ? 'Mapato Halisi (bila VAT)' : 'Net Revenue (excl. VAT)', fmt(netSales), `18% VAT: ${fmt(taxCollected)}`, '#0E5A47'],
              [isSw ? 'Wastani wa Bili / Mgeni' : 'Average Check / Cover', fmt(avgCheck), isSw ? `Bili ${paid.length} zimelipwa` : `${paid.length} bills settled`, '#007AFF'],
              [isSw ? 'Tiketi Zinazoendelea' : 'Live Service Tickets', `${liveCount} ${isSw ? 'oda' : 'orders'}`, isSw ? 'Zinazoendelea sasa' : 'Currently active', '#FF9500'],
              [isSw ? 'Gharama ya Kamisheni' : 'Waiter Commission Cost', `${commissionCostPct}%`, `${isSw ? 'Jumla:' : 'Total:'} ${fmt(commissionAccrued)}`, '#5856D6'],
              [isSw ? 'Gharama ya Chakula %' : 'Food Cost % (Theoretical)', '29.4%', isSw ? 'Lengo PAR: <32%' : 'Target PAR: <32%', '#093B2F']
            ].map(([label, val, sub, color]) => (
              <div key={label} className="card">
                <small>{label}</small>
                <b style={{ color, fontSize: 22 }}>{val}</b>
                <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>{sub}</small>
              </div>
            ))}
          </div>

          {/* Recommended Design Architecture: Tracking Mode Widget (Option A Simple vs Option B Recipe) */}
          <div className="card" style={{ marginTop: 14, border: '1.5px solid #E5E7EB', background: 'var(--card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>⚙️</span>
                  <b style={{ fontSize: 16 }}>
                    {isSw ? 'Mfumo wa Stoo na Gharama za Chakula Jikoni' : 'Inventory & Kitchen Food Costing Mode'}
                  </b>
                </div>
                <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
                  {isSw
                    ? 'Vinywaji hutumia kiungo cha moja kwa moja (−1 chupa, bila BOM). Vyakula vya jikoni vina mifumo miwili:'
                    : 'Drinks always use direct link (−1 base bottle, no BOM). Kitchen dishes support two operating models:'}
                </small>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={`btn sm ${S.kitchenTrackingMode !== 'recipe' ? 'o' : 'ghost'}`}
                  style={{
                    fontSize: 12,
                    padding: '6px 12px',
                    background: S.kitchenTrackingMode !== 'recipe' ? '#0E5A47' : 'transparent',
                    color: S.kitchenTrackingMode !== 'recipe' ? '#fff' : 'var(--tx)',
                    borderColor: '#0E5A47'
                  }}
                  onClick={() => A.setKitchenTrackingMode('simple', sess?.name || 'Manager')}
                >
                  {isSw ? '✓ Chaguo A: Rahisi (Iliyotolewa)' : '✓ Option A: Simple (Issued)'}
                </button>
                <button
                  type="button"
                  className={`btn sm ${S.kitchenTrackingMode === 'recipe' ? 'o' : 'ghost'}`}
                  style={{
                    fontSize: 12,
                    padding: '6px 12px',
                    background: S.kitchenTrackingMode === 'recipe' ? '#0E5A47' : 'transparent',
                    color: S.kitchenTrackingMode === 'recipe' ? '#fff' : 'var(--tx)',
                    borderColor: '#0E5A47'
                  }}
                  onClick={() => A.setKitchenTrackingMode('recipe', sess?.name || 'Manager')}
                >
                  {isSw ? 'Chaguo B: Kulingana na Mapishi (BOM)' : 'Option B: Recipe-based (BOM)'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              <div style={{
                padding: 12,
                borderRadius: 12,
                background: S.kitchenTrackingMode !== 'recipe' ? '#E5F2EE' : 'var(--bg)',
                border: S.kitchenTrackingMode !== 'recipe' ? '1.5px solid #0E5A47' : '1px solid var(--line)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <b style={{ color: S.kitchenTrackingMode !== 'recipe' ? '#0E5A47' : 'var(--tx)', fontSize: 13.5 }}>
                    {isSw ? 'Chaguo A: Rahisi (Inapendekezwa kwa Migahawa ya Kati)' : 'Option A: Simple (Recommended for Small/Mid Restaurants)'}
                  </b>
                  {S.kitchenTrackingMode !== 'recipe' && (
                    <span style={{ fontSize: 11, background: '#0E5A47', color: '#fff', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                      {isSw ? 'INATUMIKA' : 'ACTIVE'}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--mut)', lineHeight: 1.4 }}>
                  {isSw
                    ? 'Vyakula vinatolewa kutoka Stoo kwenda Jikoni. Gharama inahesabiwa mara moja. Hakuna mapishi ya BOM yanayohitajika. Hesabu ya mwisho wa siku inaonyesha tofauti halisi.'
                    : 'Food items are issued from Store to Kitchen. Cost is counted immediately upon issue. No BOM recipes needed. End-of-day count of leftovers gives actual variance.'}
                </p>
              </div>

              <div style={{
                padding: 12,
                borderRadius: 12,
                background: S.kitchenTrackingMode === 'recipe' ? '#E5F2EE' : 'var(--bg)',
                border: S.kitchenTrackingMode === 'recipe' ? '1.5px solid #0E5A47' : '1px solid var(--line)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <b style={{ color: S.kitchenTrackingMode === 'recipe' ? '#0E5A47' : 'var(--tx)', fontSize: 13.5 }}>
                    {isSw ? 'Chaguo B: Kulingana na Mapishi (Gharama Kamili)' : 'Option B: Recipe-Based (Precision Costing)'}
                  </b>
                  {S.kitchenTrackingMode === 'recipe' && (
                    <span style={{ fontSize: 11, background: '#0E5A47', color: '#fff', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                      {isSw ? 'INATUMIKA' : 'ACTIVE'}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--mut)', lineHeight: 1.4 }}>
                  {isSw
                    ? 'Kila chakula kinaorodhesha viungo (mf. Sahani ya Kuku = 250g kuku + kijiko 1 mafuta). Kila mauzo ya POS yanapunguza viungo kutoka stoo ya jikoni moja kwa moja.'
                    : 'Each dish lists raw ingredients (e.g. Chicken Plate = 250g chicken + 1 tbsp oil). Each POS sale deducts ingredients from kitchen stock automatically.'}
                </p>
              </div>
            </div>
          </div>

          <p className="sec" style={{ marginTop: 20 }}>{isSw ? 'Muhtasari wa Zamu ya Sasa' : 'Live Shift Summary'}</p>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <small>{isSw ? 'Fedha Taslimu Kwenye Droo' : 'Cash in Drawer'}</small>
              <b style={{ fontSize: 18, display: 'block' }}>
                {fmt(paid.filter(o => o.pm === 'cash').reduce((a, o) => a + tot(o), 0))}
              </b>
            </div>
            <div>
              <small>{isSw ? 'Pesa ya Simu (M-Pesa / Tigo)' : 'Mobile Money (M-Pesa / Tigo)'}</small>
              <b style={{ fontSize: 18, display: 'block' }}>
                {fmt(paid.filter(o => o.pm === 'momo').reduce((a, o) => a + tot(o), 0))}
              </b>
            </div>
            <div>
              <small>{isSw ? 'Oda za Ununuzi (PO) Zinazosubiri' : 'Pending PO Deliveries'}</small>
              <b style={{ fontSize: 18, display: 'block' }}>
                {(S.purchaseOrders || []).filter(p => p.status === 'pending_approval').length} POs
              </b>
            </div>
            <div>
              <small>{isSw ? 'Wafanyakazi Kazini' : 'Staff on Floor'}</small>
              <b style={{ fontSize: 18, display: 'block' }}>
                {isSw ? 'Wahudumu 2 · Mpishi 1 · Keshia 1' : '2 Waiters · 1 Chef · 1 Cashier'}
              </b>
            </div>
          </div>
        </>
      )}

      {tab === 'vat' && (
        <div>
          {/* Header Card */}
          <div className="card" style={{ marginBottom: 14, background: 'linear-gradient(135deg, #093B2F, #0E5A47)', color: '#fff' }}>
            <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <b style={{ fontSize: 18 }}>
                    🏛️ {isSw ? 'Mipangilio ya VAT na Kodi ya Mauzo (TRA / EFD)' : 'VAT & Sales Tax Settings (TRA / EFD Compliance)'}
                  </b>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 99,
                      background: vatForm.enabled ? '#34C759' : '#8E8E93',
                      color: '#fff'
                    }}
                  >
                    {vatForm.enabled
                      ? `${isSw ? 'INATUMIKA' : 'ACTIVE'} · ${vatForm.rate || 18}% ${vatForm.inclusive !== false ? (isSw ? 'IMEJUMUISHWA' : 'INCLUSIVE') : (isSw ? 'IMEONGEZWA' : 'ADDED')}`
                      : (isSw ? 'IMEZIMWA · 0% (ZIMA)' : 'DISABLED · 0% (OFF)')}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#cfe8df', margin: 0, maxWidth: 650 }}>
                  {isSw
                    ? 'Simamia ukusanyaji wa Kodi ya Ongezeko la Thamani (VAT) katika tawi zima. Ikiruhusiwa (ON), VAT inahesabiwa na kuonyeshwa kwenye vikapu vya QR, POS ya keshia, na risiti. Ikizimwa (OFF), VAT inaondolewa kabisa.'
                    : 'Manage Value Added Tax (VAT) collection across the entire venue. When turned ON, VAT is calculated and displayed on customer QR carts, cashier POS checkouts, and official thermal/digital receipts. When turned OFF, VAT is completely removed and will not show or be included on any cart or receipt.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{ background: vatForm.enabled ? '#FF3B30' : '#34C759', color: '#fff', border: 0, fontWeight: 700 }}
                  onClick={() => setVatForm(prev => ({ ...prev, enabled: !prev.enabled }))}
                >
                  {vatForm.enabled ? (isSw ? '✕ Zima VAT' : '✕ Turn VAT OFF') : (isSw ? '✓ Washa VAT' : '✓ Turn VAT ON')}
                </button>
                <button
                  type="button"
                  className="btn sm o"
                  style={{ background: 'var(--o)', color: '#fff', border: 0 }}
                  onClick={handleSaveVat}
                >
                  💾 {isSw ? 'Hifadhi Mipangilio' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>

          {vatSaved && (
            <div
              className="card"
              style={{
                marginBottom: 14,
                background: '#E8F5E9',
                border: '1px solid #4CAF50',
                color: '#1B5E20',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px'
              }}
            >
              <span>✓</span>
              <b>
                {isSw
                  ? 'Mipangilio ya VAT na Kodi imehifadhiwa na kusambazwa kwenye POS zote, vikapu vya QR, na risiti!'
                  : 'VAT & Tax Settings saved successfully and broadcasted across all POS terminals, QR carts, and receipts!'}
              </b>
            </div>
          )}

          {/* Master Toggle Banner */}
          <div
            className="card"
            style={{
              marginBottom: 14,
              border: vatForm.enabled ? '2px solid #0E5A47' : '2px dashed #8E8E93',
              background: vatForm.enabled ? '#F0F9F6' : 'var(--card)',
              transition: 'all 0.2s ease'
            }}
          >
            <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{vatForm.enabled ? '🟢' : '⚪'}</span>
                  <div>
                    <b style={{ fontSize: 16, color: vatForm.enabled ? '#0E5A47' : 'var(--tx)' }}>
                      {isSw ? 'Hali ya Ukusanyaji wa Kodi ya VAT:' : 'VAT Tax Collection Status:'}{' '}
                      {vatForm.enabled
                        ? (isSw ? 'IMEWASHWA NA INATUMIKA' : 'ENABLED & ENFORCED')
                        : (isSw ? 'IMEZIMWA' : 'DISABLED / TURNED OFF')}
                    </b>
                    <div style={{ fontSize: 13, color: 'var(--mut)', marginTop: 2 }}>
                      {vatForm.enabled
                        ? (isSw ? 'VAT inahesabiwa kikamilifu, kuonyeshwa kwenye vikapu na kuchanganuliwa kwenye risiti za wateja.' : 'VAT is actively calculated, displayed on cart cards, and broken down on customer receipts.')
                        : (isSw ? 'VAT imezimwa kabisa. Hakuna kodi inayoongezwa au kukatwa kwenye vikapu na risiti.' : 'VAT is completely disabled. No tax is added or deducted. Carts and receipts do not show any VAT line.')}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className={`btn sm ${vatForm.enabled ? 'o' : 'ghost'}`}
                  style={{
                    background: vatForm.enabled ? '#0E5A47' : 'transparent',
                    color: vatForm.enabled ? '#fff' : 'var(--tx)',
                    borderColor: vatForm.enabled ? '#0E5A47' : 'var(--line)',
                    fontWeight: 700,
                    minWidth: 120
                  }}
                  onClick={() => setVatForm(prev => ({ ...prev, enabled: true }))}
                >
                  {isSw ? '✓ Washa VAT' : '✓ Enable VAT'}
                </button>
                <button
                  type="button"
                  className={`btn sm ${!vatForm.enabled ? 'o' : 'ghost'}`}
                  style={{
                    background: !vatForm.enabled ? '#5856D6' : 'transparent',
                    color: !vatForm.enabled ? '#fff' : 'var(--tx)',
                    borderColor: !vatForm.enabled ? '#5856D6' : 'var(--line)',
                    fontWeight: 700,
                    minWidth: 120
                  }}
                  onClick={() => setVatForm(prev => ({ ...prev, enabled: false }))}
                >
                  {isSw ? '✕ Zima VAT' : '✕ Disable VAT'}
                </button>
              </div>
            </div>
          </div>

          {/* Configuration Form & Presets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 14 }}>
            {/* Left: Tax Parameters */}
            <div className="card">
              <b style={{ fontSize: 15, display: 'block', marginBottom: 10 }}>
                ⚙️ {isSw ? 'Kiwango cha Kodi na Vigezo vya Mahesabu' : 'Tax Rate & Calculation Parameters'}
              </b>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: 'var(--mut)', display: 'block', marginBottom: 4 }}>
                  {isSw ? 'Asilimia ya Kiwango cha VAT (%)' : 'VAT Rate Percentage (%)'}
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="inp"
                    style={{ margin: 0, fontWeight: 700, fontSize: 16 }}
                    value={vatForm.rate ?? 18}
                    onChange={e => setVatForm(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    disabled={!vatForm.enabled}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--mut)' }}>%</span>
                </div>
                <small style={{ color: 'var(--mut)' }}>
                  {isSw ? 'Kiwango cha kawaida Tanzania Bara ni 18%.' : 'Default standard rate in Tanzania Mainland is 18%.'}
                </small>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: 'var(--mut)', display: 'block', marginBottom: 4 }}>
                  {isSw ? 'Mfumo wa Mahesabu na Onyesho' : 'Calculation & Display Mode'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    className={`btn sm ${vatForm.inclusive !== false ? 'o' : 'ghost'}`}
                    style={{
                      background: vatForm.inclusive !== false ? '#0E5A47' : 'transparent',
                      color: vatForm.inclusive !== false ? '#fff' : 'var(--tx)',
                      borderColor: 'var(--line)',
                      fontSize: 12
                    }}
                    onClick={() => setVatForm(prev => ({ ...prev, inclusive: true }))}
                    disabled={!vatForm.enabled}
                  >
                    {isSw ? 'Kodi Imejumuishwa (Chaguo-msingi)' : 'Tax Inclusive (Default)'}
                  </button>
                  <button
                    type="button"
                    className={`btn sm ${vatForm.inclusive === false ? 'o' : 'ghost'}`}
                    style={{
                      background: vatForm.inclusive === false ? '#0E5A47' : 'transparent',
                      color: vatForm.inclusive === false ? '#fff' : 'var(--tx)',
                      borderColor: 'var(--line)',
                      fontSize: 12
                    }}
                    onClick={() => setVatForm(prev => ({ ...prev, inclusive: false }))}
                    disabled={!vatForm.enabled}
                  >
                    {isSw ? 'Kodi Inaongezwa Juu' : 'Tax Added (Add-on)'}
                  </button>
                </div>
                <small style={{ color: 'var(--mut)', display: 'block', marginTop: 4 }}>
                  {vatForm.inclusive !== false
                    ? (isSw ? 'Bei za menyu tayari zinajumuisha kodi. Risiti na kikapu vinaonyesha kiasi cha VAT kilichomo.' : 'Menu prices already include tax. The receipt and cart show the extracted VAT amount.')
                    : (isSw ? 'Kodi inahesabiwa na kuongezwa juu ya bei za menyu wakati wa malipo.' : 'Tax is calculated and added on top of menu prices at checkout.')}
                </small>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: 'var(--mut)', display: 'block', marginBottom: 4 }}>
                  {isSw ? 'Lebo ya Kodi Kwenye Vikapu na Risiti' : 'Tax Label on Carts & Receipts'}
                </label>
                <input
                  type="text"
                  className="inp"
                  style={{ margin: 0 }}
                  value={vatForm.taxLabel || 'VAT 18%'}
                  onChange={e => setVatForm(prev => ({ ...prev, taxLabel: e.target.value }))}
                  placeholder="e.g. VAT 18% or TRA VAT"
                  disabled={!vatForm.enabled}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--mut)', display: 'block', marginBottom: 4 }}>
                    {isSw ? 'Namba ya Mlipakodi (TIN)' : 'Tax Identification (TIN)'}
                  </label>
                  <input
                    type="text"
                    className="inp"
                    style={{ margin: 0, fontSize: 13 }}
                    value={vatForm.taxNumber || '104824986'}
                    onChange={e => setVatForm(prev => ({ ...prev, taxNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--mut)', display: 'block', marginBottom: 4 }}>
                    {isSw ? 'Namba ya Usajili wa VAT (VRN)' : 'VAT Reg Number (VRN)'}
                  </label>
                  <input
                    type="text"
                    className="inp"
                    style={{ margin: 0, fontSize: 13 }}
                    value={vatForm.vrn || '40012984-Z'}
                    onChange={e => setVatForm(prev => ({ ...prev, vrn: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Right: Regulatory Presets & Summary */}
            <div className="card">
              <b style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
                ⚡ {isSw ? 'Mipangilio ya Haraka ya Mamlaka za Kodi' : 'Quick Regulatory & Tax Presets'}
              </b>
              <p style={{ fontSize: 13, color: 'var(--mut)', margin: '0 0 12px' }}>
                {isSw
                  ? 'Tumia kwa haraka viwango vya kodi kulingana na mamlaka yako ya kodi:'
                  : 'Quickly apply statutory tax templates according to your tax jurisdiction or exempt status:'}
              </p>

              <div style={{ display: 'grid', gap: 8 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setVatForm(prev => ({
                    ...prev,
                    enabled: true,
                    rate: 18,
                    inclusive: true,
                    taxLabel: 'VAT 18%',
                    taxNumber: '104824986',
                    vrn: '40012984-Z'
                  }))}
                >
                  <div>
                    <b>🇹🇿 {isSw ? 'Tanzania TRA Bara (18% Imejumuishwa)' : 'Tanzania TRA Mainland (18% Inclusive)'}</b>
                    <small style={{ display: 'block', color: 'var(--mut)' }}>
                      {isSw ? 'Kiwango rasmi cha VAT kwa migahawa Dar es Salaam' : 'Standard statutory VAT for restaurants in Dar es Salaam'}
                    </small>
                  </div>
                  <span style={{ fontSize: 13, color: '#0E5A47', fontWeight: 700 }}>{isSw ? 'Tumia' : 'Apply'}</span>
                </button>

                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setVatForm(prev => ({
                    ...prev,
                    enabled: true,
                    rate: 15,
                    inclusive: true,
                    taxLabel: 'ZRB VAT (15%)',
                    taxNumber: '204918231',
                    vrn: '50012984-Z'
                  }))}
                >
                  <div>
                    <b>🏝️ {isSw ? 'Bodi ya Mapato Zanzibar / ZRB (15% Imejumuishwa)' : 'Zanzibar Revenue Board / ZRB (15% Inclusive)'}</b>
                    <small style={{ display: 'block', color: 'var(--mut)' }}>
                      {isSw ? 'Inatumika kwa matawi ya Zanzibar na Pemba' : 'Applies to Zanzibar and Pemba hospitality outlets'}
                    </small>
                  </div>
                  <span style={{ fontSize: 13, color: '#0E5A47', fontWeight: 700 }}>{isSw ? 'Tumia' : 'Apply'}</span>
                </button>

                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setVatForm(prev => ({
                    ...prev,
                    enabled: true,
                    rate: 16,
                    inclusive: true,
                    taxLabel: 'KRA VAT (16%)',
                    taxNumber: 'P051283921X',
                    vrn: 'KRA-88392'
                  }))}
                >
                  <div>
                    <b>🇰🇪 {isSw ? 'Mamlaka ya Mapato Kenya / KRA (16% Imejumuishwa)' : 'Kenya Revenue Authority / KRA (16% Inclusive)'}</b>
                    <small style={{ display: 'block', color: 'var(--mut)' }}>
                      {isSw ? 'Kiwango cha kawaida cha ukanda wa Afrika Mashariki' : 'Standard East Africa regional rate'}
                    </small>
                  </div>
                  <span style={{ fontSize: 13, color: '#0E5A47', fontWeight: 700 }}>{isSw ? 'Tumia' : 'Apply'}</span>
                </button>

                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: '#FF3B30', background: '#FFF5F5' }}
                  onClick={() => setVatForm(prev => ({
                    ...prev,
                    enabled: false,
                    rate: 0,
                    taxLabel: 'VAT Disabled'
                  }))}
                >
                  <div>
                    <b style={{ color: '#FF3B30' }}>🚫 {isSw ? 'Zima VAT / Msamaha wa Kodi (0%)' : 'Turn VAT OFF / Tax Exempt (0%)'}</b>
                    <small style={{ display: 'block', color: 'var(--mut)' }}>
                      {isSw ? 'Inaficha na kuondoa kodi kabisa kwenye vikapu na risiti zote' : 'Completely hides and excludes tax from all carts and receipts'}
                    </small>
                  </div>
                  <span style={{ fontSize: 13, color: '#FF3B30', fontWeight: 700 }}>{isSw ? 'Zima' : 'Disable'}</span>
                </button>
              </div>

              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn o"
                  style={{ background: 'var(--o)', flex: 1 }}
                  onClick={handleSaveVat}
                >
                  💾 {isSw ? 'Hifadhi na Tekeleza Mipangilio ya VAT' : 'Save & Enforce VAT Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Live Touchpoint Simulator (Carts & Receipts) */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div>
                <b style={{ fontSize: 16 }}>📱 {isSw ? 'Kiigaji cha Moja kwa Moja cha Mauzo na Risiti' : 'Live Sale & Receipt Touchpoint Simulator'}</b>
                <p style={{ fontSize: 13, color: 'var(--mut)', margin: '2px 0 0' }}>
                  {isSw
                    ? 'Mwonekano wa moja kwa moja wa jinsi oda ya mfano (Roasted Chicken TSh 18,000 + Kilimanjaro Water TSh 2,000 = TSh 20,000) inavyoonekana kwenye kikapu na risiti:'
                    : 'Real-time preview of how a sample order (Roasted Chicken TSh 18,000 + Kilimanjaro Water TSh 2,000 = TSh 20,000) looks on customer/cashier cart cards and thermal customer receipts under the current setting:'}
                </p>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 99,
                  background: vatForm.enabled ? '#E5F2EE' : '#F2F2F7',
                  color: vatForm.enabled ? '#0E5A47' : '#8E8E93',
                  border: '1px solid var(--line)'
                }}
              >
                {vatForm.enabled
                  ? (isSw ? '● INAIGA VAT IMEWASHWA' : '● SIMULATING VAT ON')
                  : (isSw ? '○ INAIGA VAT IMEZIMWA' : '○ SIMULATING VAT OFF')}
              </span>
            </div>

            {/* Calculations for Simulator */}
            {(() => {
              const sampleSubTotal = 20000;
              const simRate = vatForm.enabled ? (vatForm.rate ?? 18) : 0;
              const simIsInclusive = vatForm.inclusive !== false;
              const simTaxAmt = vatForm.enabled ? (simIsInclusive ? Math.round(sampleSubTotal - sampleSubTotal / (1 + simRate / 100)) : Math.round(sampleSubTotal * (simRate / 100))) : 0;
              const simNetTaxable = vatForm.enabled ? (simIsInclusive ? Math.round(sampleSubTotal / (1 + simRate / 100)) : sampleSubTotal) : sampleSubTotal;
              const simTotal = vatForm.enabled && !simIsInclusive ? sampleSubTotal + simTaxAmt : sampleSubTotal;

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
                  {/* Cart Simulator */}
                  <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 14, border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <b style={{ fontSize: 14 }}>🛒 {isSw ? 'Mwonekano wa Kikapu (POS & QR)' : 'Cart View (POS & Customer QR)'}</b>
                      <small style={{ color: vatForm.enabled ? '#0E5A47' : 'var(--mut)', fontWeight: 600 }}>
                        {vatForm.enabled ? (isSw ? '✓ Mstari wa Kodi Unaonekana' : '✓ Tax Row Visible') : (isSw ? '✕ Mstari wa Kodi Umefichwa' : '✕ Tax Row Omitted')}
                      </small>
                    </div>

                    <div style={{ background: 'var(--card)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                      <div className="row" style={{ fontSize: 13, marginBottom: 4 }}>
                        <span>Roasted Chicken (1x)</span>
                        <b>TSh 18,000</b>
                      </div>
                      <div className="row" style={{ fontSize: 13 }}>
                        <span>Kilimanjaro Water (1x)</span>
                        <b>TSh 2,000</b>
                      </div>
                    </div>

                    <div style={{ background: 'var(--card)', borderRadius: 10, padding: 10 }}>
                      <div className="row" style={{ fontSize: 13, color: 'var(--mut)', padding: '2px 0' }}>
                        <span>{isSw ? 'Jumla Ndogo' : 'Sub Total'}</span>
                        <b>{fmt(sampleSubTotal)}</b>
                      </div>

                      {vatForm.enabled ? (
                        <div className="row" style={{ fontSize: 13, color: 'var(--tx)', padding: '2px 0', background: '#E8F5E9', borderRadius: 6, margin: '2px -4px', paddingLeft: 4, paddingRight: 4 }}>
                          <span>
                            {vatForm.taxLabel || `VAT (${simRate}%)`}{' '}
                            {simIsInclusive ? (isSw ? '(Imejumuishwa)' : '(Included)') : (isSw ? '(Imeongezwa)' : '(Added)')}
                          </span>
                          <b style={{ color: '#1B5E20' }}>{fmt(simTaxAmt)}</b>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--mut)', fontStyle: 'italic', padding: '4px 0' }}>
                          {isSw ? '[VAT imezimwa: Mstari wa kodi umefichwa kwenye kikapu]' : '[VAT is turned off: Tax row is hidden on sale carts]'}
                        </div>
                      )}

                      <div className="row" style={{ borderTop: '1px dashed var(--line)', paddingTop: 6, marginTop: 4 }}>
                        <b style={{ fontSize: 15 }}>{isSw ? 'Jumla ya Kulipa' : 'Payable Total'}</b>
                        <b style={{ fontSize: 18, color: '#15803D' }}>{fmt(simTotal)}</b>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Simulator */}
                  <div style={{ background: '#FFFEF8', borderRadius: 14, padding: 14, border: '1px solid #E6DEC5', fontFamily: 'monospace', color: '#1C1C1E' }}>
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>SAFARI GRILL & LOUNGE LTD</div>
                      <div style={{ fontSize: 11, color: '#666' }}>Plot 42, Haile Selassie Rd, Masaki</div>
                      {vatForm.enabled && (
                        <div style={{ fontSize: 11, fontWeight: 700 }}>TIN: {vatForm.taxNumber || '104824986'} | VRN: {vatForm.vrn || '40012984-Z'}</div>
                      )}
                      <div style={{ fontSize: 11, color: '#888' }}>----------------------------------------</div>
                    </div>

                    <div style={{ fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>ROASTED CHICKEN 1x</span>
                        <span>18,000.00 TSh</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>KILIMANJARO WATER 1x</span>
                        <span>2,000.00 TSh</span>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #1C1C1E', margin: '6px 0', paddingTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14 }}>
                        <span>{isSw ? 'JUMLA:' : 'TOTAL:'}</span>
                        <span>{fmtNum(simTotal)}.00 TSh</span>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px dashed #888', paddingTop: 4, margin: '4px 0', fontSize: 11 }}>
                      {vatForm.enabled ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0E5A47', fontWeight: 700 }}>
                            <span>{isSw ? 'KIASI BILA VAT:' : 'NET TAXABLE (EXCL. VAT):'}</span>
                            <span>{fmtNum(simNetTaxable)}.00 TSh</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0E5A47', fontWeight: 700 }}>
                            <span>{(vatForm.taxLabel || `VAT ${simRate}%`).toUpperCase()} ({isSw ? 'IMEJUMUISHWA' : 'INCLUSIVE'}):</span>
                            <span>{fmtNum(simTaxAmt)}.00 TSh</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '2px 0' }}>
                          {isSw ? '[VAT IMEZIMWA: Mistari ya kodi imeondolewa kwenye risiti]' : '[VAT is OFF: Tax breakdown lines excluded from receipt]'}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span>{isSw ? 'NJIA YA MALIPO:' : 'PAYMENT METHOD:'}</span>
                        <span>{isSw ? 'TASLIMU' : 'CASH'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: 11, marginTop: 8, color: '#666' }}>
                      {vatForm.enabled
                        ? (isSw ? '★ RISITI RASMI YA EFD ★' : '★ OFFICIAL EFD FISCAL RECEIPT ★')
                        : (isSw ? '★ RISITI YA BIASHARA ★' : '★ COMMERCIAL BILL / RECEIPT ★')}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {tab === 'finance' && (
        <div>
          <div className="card" style={{ marginBottom: 14, background: 'linear-gradient(135deg, #093B2F, #0E5A47)', color: '#fff' }}>
            <div className="row">
              <div>
                <b style={{ fontSize: 17 }}>{isSw ? 'Uchambuzi wa Fedha na Faida & Hasara (P&L) ya Tawi' : 'Site Financial Intelligence & P&L Analysis'}</b>
                <p style={{ fontSize: 13, color: '#cfe8df', margin: '4px 0 0' }}>
                  {isSw
                    ? 'Vipimo vilivyokaguliwa: Mauzo Ghafi, Mapato Halisi, Gharama ya Bidhaa (COGS), Gharama za Uendeshaji (OPEX), na Mtiririko wa Fedha.'
                    : 'Audited financial metrics: Gross Sales, Net Revenue, Cost of Goods Sold (COGS), Operating Expenses (OPEX), and Real-Time Cashflow.'}
                </p>
              </div>
              <button
                className="btn sm o"
                style={{ background: 'var(--o)', color: '#fff', border: 0 }}
                onClick={() => setV ? setV('owner') : null}
              >
                📊 {isSw ? 'Fungua Makao Makuu (HQ)' : 'Open Executive HQ'}
              </button>
            </div>
          </div>

          <div className="tiles" style={{ marginBottom: 14 }}>
            {[
              [isVatOn ? (isSw ? 'Mauzo Ghafi (pamoja na VAT)' : 'Gross Sales (incl. VAT)') : (isSw ? 'Mauzo Ghafi' : 'Gross Sales'), fmt(grossSales), isSw ? `Tiketi ${paid.length} zilizolipwa` : `${paid.length} settled tickets`, '#15803D'],
              [isVatOn ? (isSw ? 'Mapato Halisi (bila VAT)' : 'Net Revenue (excl. VAT)') : (isSw ? 'Mapato Halisi (VAT Imezimwa)' : 'Net Revenue (VAT Off)'), fmt(netSales), isVatOn ? `${currentVat.rate || 18}% VAT: ${fmt(taxCollected)}` : (isSw ? 'Msamaha wa Kodi (0% VAT)' : 'Tax Exempt (0% VAT)'), '#0E5A47'],
              [isSw ? 'Makadirio ya COGS ya Tawi' : 'Site Estimated COGS', fmt(Math.round(grossSales * 0.32)), isSw ? 'Jumla ya Chakula + Vinywaji' : 'Food + Drinks wholesale', '#C2410C'],
              [isSw ? 'Asilimia ya Faida Ghafi' : 'Gross Margin', grossSales > 0 ? `${Math.round(((netSales - grossSales * 0.32) / netSales) * 100)}%` : '0%', `${isSw ? 'Faida:' : 'Profit:'} ${fmt(netSales - Math.round(grossSales * 0.32))}`, '#007AFF'],
              [isSw ? 'Deni la Kamisheni' : 'Commission Liability', fmt(commissionAccrued), isSw ? `${commissionCostPct}% ya mauzo ghafi` : `${commissionCostPct}% of gross sales`, '#5856D6'],
              [isSw ? 'Gharama za Uendeshaji (OPEX)' : 'Operating Expenses (OPEX)', fmt((S.expenses || []).reduce((a, e) => a + Number(e.amount || 0), 0)), isSw ? 'Umeme, gesi, leseni' : 'Utilities, gas, permits', '#FF9500']
            ].map(([lbl, val, sub, c]) => (
              <div key={lbl} className="card">
                <small>{lbl}</small>
                <b style={{ color: c, fontSize: 22 }}>{val}</b>
                <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>{sub}</small>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 14 }}>
            {/* P&L Statement */}
            <div className="card">
              <b style={{ fontSize: 16 }}>{isSw ? 'Taarifa ya Mapato ya Tawi (P&L)' : 'Site Income Statement (P&L)'}</b>
              <table className="fin-statement">
                <tbody>
                  <tr className="fin-sec-header">
                    <td><b>{isSw ? '1. MAPATO' : '1. REVENUE'}</b></td>
                    <td style={{ textAlign: 'right' }}><b>{isSw ? 'Kiasi (TSh)' : 'Amount (TSh)'}</b></td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Mauzo Ghafi (Chakula + Vinywaji)' : 'Gross Sales (Food + Beverages)'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(grossSales)}</td>
                  </tr>
                  {isVatOn ? (
                    <tr className="fin-subrow" style={{ color: '#C2410C' }}>
                      <td>{isSw ? 'Toa:' : 'Less:'} {currentVat.taxLabel || `VAT (${currentVat.rate || 18}%)`}</td>
                      <td style={{ textAlign: 'right', color: '#C2410C' }}>-{fmt(taxCollected)}</td>
                    </tr>
                  ) : (
                    <tr className="fin-subrow" style={{ color: 'var(--mut)' }}>
                      <td>{isSw ? 'Ukusanyaji wa VAT (Imezimwa)' : 'VAT Collection (Disabled / Off)'}</td>
                      <td style={{ textAlign: 'right' }}>{isSw ? 'TSh 0 (Msamaha)' : 'TSh 0 (Exempt)'}</td>
                    </tr>
                  )}
                  <tr className="fin-total-row">
                    <td><b>{isSw ? 'MAPATO HALISI' : 'NET REVENUE'}</b></td>
                    <td style={{ textAlign: 'right' }}><b>{fmt(netSales)}</b></td>
                  </tr>

                  <tr className="fin-sec-header">
                    <td><b>{isSw ? '2. GHARAMA ZA BIDHAA ZILIZOUZWA' : '2. COST OF GOODS SOLD'}</b></td>
                    <td style={{ textAlign: 'right' }}></td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Matumizi ya Mapishi ya Jikoni' : 'Theoretical Kitchen Recipe Usage'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(Math.round(grossSales * 0.28))}</td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Kumbukumbu ya Upotevu na Uharibifu' : 'Waste & Spoilage Incident Log'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt((S.wasteLog || []).reduce((a, w) => a + (w.cost || 0), 0))}</td>
                  </tr>
                  <tr className="fin-total-row">
                    <td><b>{isSw ? 'JUMLA YA COGS' : 'TOTAL COGS'}</b></td>
                    <td style={{ textAlign: 'right' }}><b>{fmt(Math.round(grossSales * 0.28) + (S.wasteLog || []).reduce((a, w) => a + (w.cost || 0), 0))}</b></td>
                  </tr>

                  <tr style={{ background: '#E0EDFE' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: '#007AFF' }}>
                      <b>{isSw ? 'FAIDA GHAFI YA UENDESHAJI' : 'GROSS OPERATING PROFIT'}</b>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#007AFF' }}>
                      <b>{fmt(netSales - (Math.round(grossSales * 0.28) + (S.wasteLog || []).reduce((a, w) => a + (w.cost || 0), 0)))}</b>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Operating Expenses & Outflows */}
            <div className="card">
              <b style={{ fontSize: 16 }}>{isSw ? 'Gharama za Uendeshaji na Malipo' : 'Operational Expenses & Disbursements'}</b>
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>{isSw ? 'Jina la Gharama' : 'Expense Name'}</th>
                    <th>{isSw ? 'Aina' : 'Category'}</th>
                    <th style={{ textAlign: 'right' }}>{isSw ? 'Kiasi' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(S.expenses || []).map(exp => (
                    <tr key={exp.id}>
                      <td>
                        <b>{exp.name}</b>
                        {exp.ref && <div style={{ fontSize: 11, color: 'var(--mut)' }}>{isSw ? 'Kumb:' : 'Ref:'} {exp.ref}</div>}
                      </td>
                      <td><small>{exp.category}</small></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#FF3B30' }}>
                        -{fmt(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'commission' && (
        <div style={{ maxWidth: 840 }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <b>{isSw ? 'Mipangilio ya Sera ya Kamisheni ya Wahudumu (SRS WCM-01 hadi WCM-14)' : 'Waiter Commission Policy Configuration (SRS WCM-01 to WCM-14)'}</b>
            <p style={{ fontSize: 13, color: 'var(--mut)', margin: '4px 0 0' }}>
              {isSw
                ? 'Mabadiliko yanatumika kwa miamala ijayo na kuhifadhi kumbukumbu kwenye kila ingizo la daftari. Mapato ya awali hayabadilishwi.'
                : 'Changes take effect on future transactions and store a snapshot on every ledger entry. Previous earnings are never silently altered.'}
            </p>
          </div>

          <div className="card">
            <small style={{ fontWeight: 600 }}>{isSw ? 'Njia ya Mahesabu:' : 'Calculation Method:'}</small>
            <div className="seg">
              {[
                ['percent', isSw ? 'Asilimia (%) ya Mauzo' : 'Percentage (%) of Sales'],
                ['fixed', isSw ? 'Kiasi Maalum (TSh kwa Oda)' : 'Fixed Amount (TSh per Order)'],
                ['tiered', isSw ? 'Mfumo wa Ngazi za Malengo' : 'Tiered Target Matrix']
              ].map(([k, l]) => (
                <button
                  key={k}
                  className={policyForm.method === k ? 'on' : ''}
                  onClick={() => setPolicyForm({ ...policyForm, method: k })}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="fld" style={{ margin: '12px 0' }}>
              <span>
                {fx
                  ? (isSw ? 'Ada Maalum kwa Kila Oda (TSh)' : 'Fixed Fee per Eligible Order (TSh)')
                  : (isSw ? 'Kiwango cha Kamisheni (%)' : 'Default Commission Rate (%)')}
              </span>
              <input
                className="inp"
                inputMode="decimal"
                value={fx ? policyForm.fixed : policyForm.rate}
                onChange={e => setPolicyForm({ ...policyForm, [fx ? 'fixed' : 'rate']: +e.target.value || 0 })}
              />
            </div>

            <small style={{ fontWeight: 600, display: 'block', marginTop: 12 }}>
              {isSw ? 'Msingi wa Mahesabu ya Kamisheni:' : 'Commission Calculation Basis:'}
            </small>
            <div className="seg">
              {[
                ['gross', isSw ? 'Jumla Ghafi ya Oda (Kawaida)' : 'Gross Order Total (Standard)'],
                ['net', isSw ? 'Mapato Halisi (Bila Kodi ya VAT 18%)' : 'Net Revenue (Excluding 18% VAT Tax)']
              ].map(([k, l]) => (
                <button
                  key={k}
                  className={policyForm.basis === k ? 'on' : ''}
                  onClick={() => setPolicyForm({ ...policyForm, basis: k })}
                >
                  {l}
                </button>
              ))}
            </div>

            <small style={{ fontWeight: 600, display: 'block', marginTop: 12 }}>
              {isSw ? 'Kichocheo cha Kupata Kamisheni:' : 'Qualification Earning Trigger:'}
            </small>
            <div className="seg">
              {[
                ['payment', isSw ? 'Malipo Yanapothibitishwa (Taslimu / Momo)' : 'On Verified Customer Payment (Cash / Momo)'],
                ['served', isSw ? 'Mara Oda Inapohudumiwa Mezani' : 'Immediately When Order is Served at Table']
              ].map(([k, l]) => (
                <button
                  key={k}
                  className={policyForm.trigger === k ? 'on' : ''}
                  onClick={() => setPolicyForm({ ...policyForm, trigger: k })}
                >
                  {l}
                </button>
              ))}
            </div>

            <div style={{ margin: '14px 0', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <b>{isSw ? 'Viwango Maalum vya Mhudumu Mmoja Mmoja (SRS WCM-04):' : 'Waiter-Specific Override Rates (SRS WCM-04):'}</b>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                {(S.waiters || []).map(w => (
                  <div key={w.id} className="fld">
                    <span>{w.name} ({isSw ? 'Kiwango %' : 'Rate %'})</span>
                    <input
                      className="inp"
                      style={{ width: 80 }}
                      value={policyForm.overrides?.[w.id] ?? policyForm.rate}
                      onChange={e => setPolicyForm({
                        ...policyForm,
                        overrides: { ...policyForm.overrides, [w.id]: +e.target.value || policyForm.rate }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: '#E5F2EE', margin: '14px 0' }}>
              <div className="row">
                <span>
                  {isSw
                    ? `Makadirio ya Kamisheni kwenye Oda ${paid.length} Zilizolipwa Leo:`
                    : `Estimated Commission on Today’s ${paid.length} Paid Orders:`}
                </span>
                <b style={{ color: 'var(--g)', fontSize: 18 }}>{fmt(previewEst)}</b>
              </div>
              <small style={{ color: 'var(--g)' }}>
                {isSw ? 'Mwonekano wa moja kwa moja kabla ya kuhifadhi mabadiliko (WCM-07)' : 'Live simulation preview before committing changes (WCM-07)'}
              </small>
            </div>

            <button className="btn o" onClick={handleSavePolicy}>
              {policySaved
                ? (isSw ? '✓ Sera Imehifadhiwa na Kuwashwa!' : '✓ Policy Saved & Activated!')
                : (isSw ? 'Hifadhi na Washa Sera ya Kamisheni' : 'Save & Activate Commission Policy')}
            </button>
          </div>

          <p className="sec" style={{ marginTop: 24 }}>{isSw ? 'Madeni ya Malipo ya Kamisheni (SRS WCM-09)' : 'Commission Payout Liabilities (SRS WCM-09)'}</p>
          <div className="tiles">
            {[
              [isSw ? 'Inasubiri Idhini ya Meneja' : 'Pending Manager Approval', (S.ledger || []).filter(l => l.st === 'pending').reduce((a, l) => a + l.amt, 0), '#FF9500'],
              [isSw ? 'Imeidhinishwa Kulipwa' : 'Approved for Payout', (S.ledger || []).filter(l => l.st === 'approved').reduce((a, l) => a + l.amt, 0), '#007AFF'],
              [isSw ? 'Imelipwa kwa Wafanyakazi' : 'Paid Out to Staff', (S.ledger || []).filter(l => l.st === 'paid').reduce((a, l) => a + l.amt, 0), '#15803D']
            ].map(([lbl, val, c]) => (
              <div key={lbl} className="card">
                <small>{lbl}</small>
                <b style={{ color: c, fontSize: 20 }}>{fmt(val)}</b>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn sm" onClick={() => A.approve('all', sess?.name || 'Manager')}>
              {isSw ? '✓ Idhinisha Kamisheni Zote Zinazosubiri' : '✓ Approve All Pending Commissions'}
            </button>
            <button className="btn ghost sm" onClick={() => A.payout('all', sess?.name || 'Manager')}>
              {isSw ? '💵 Rekodi Malipo ya Jumla ya Kamisheni' : '💵 Record Batch Commission Payout'}
            </button>
          </div>
        </div>
      )}

      {tab === 'reconciliation' && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <b>{isSw ? 'Ripoti ya Uhakiki wa Wahudumu (SRS Sehemu 5.7, REC-01 hadi REC-10)' : 'Manager Waiter Reconciliation Report (SRS Section 5.7, REC-01 to REC-10)'}</b>
            <p style={{ fontSize: 13, color: 'var(--mut)', margin: '4px 0 0' }}>
              {isSw
                ? 'Hakiki mauzo ya wahudumu, makusanyo ya taslimu ya moja kwa moja, vyanzo vya oda (viungo binafsi dhidi ya mezani), na kamisheni.'
                : 'Cross-check waiter sales, direct cash collections, order sources (waiter personal links vs dine-in), and commission liabilities.'}
            </p>
          </div>

          <div className="tags" style={{ marginBottom: 14 }}>
            <button className={selWaiterId === 'all' ? 'on' : ''} onClick={() => setSelWaiterId('all')}>
              {isSw ? 'Ulinganisho wa Pamoja (Wafanyakazi Wote)' : 'Side-by-Side Comparison (All Staff)'}
            </button>
            {(S.waiters || []).map(w => (
              <button key={w.id} className={selWaiterId === w.id ? 'on' : ''} onClick={() => setSelWaiterId(w.id)}>
                {w.name}
              </button>
            ))}
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>{isSw ? 'Mhudumu' : 'Waiter'}</th>
                  <th>{isSw ? 'Jumla ya Oda' : 'Total Orders'}</th>
                  <th>{isSw ? 'Oda za Kiungo (CPT)' : 'Link Orders (CPT)'}</th>
                  <th>{isSw ? 'Jumla ya Mauzo' : 'Total Sales'}</th>
                  <th>{isSw ? 'Taslimu ya Moja kwa Moja' : 'Direct Cash'}</th>
                  <th>{isSw ? 'Momo ya Keshia' : 'Cashier Momo'}</th>
                  <th>{isSw ? 'Kamisheni Iliyopatikana' : 'Commission Earned'}</th>
                  <th>{isSw ? 'Iliyoidhinishwa' : 'Approved'}</th>
                  <th>{isSw ? 'Hali' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {(S.waiters || [])
                  .filter(w => selWaiterId === 'all' || w.id === selWaiterId)
                  .map(w => {
                    const os = (S.orders || []).filter(o => o.wid === w.id);
                    const linkOrders = os.filter(o => o.src === 'WAITER_LINK');
                    const sales = os.filter(o => o.paid || o.st === 'closed').reduce((a, o) => a + tot(o), 0);
                    const cash = os.filter(o => o.pm === 'cash' && (o.paid || o.st === 'closed')).reduce((a, o) => a + tot(o), 0);
                    const momo = os.filter(o => o.pm === 'momo' && (o.paid || o.st === 'closed')).reduce((a, o) => a + tot(o), 0);

                    const led = (S.ledger || []).filter(l => l.wid === w.id && l.st !== 'reversed');
                    const earned = led.reduce((a, l) => a + l.amt, 0);
                    const approved = led.filter(l => l.st === 'approved' || l.st === 'paid').reduce((a, l) => a + l.amt, 0);

                    return (
                      <tr key={w.id}>
                        <td>
                          <b>{w.name}</b>
                          <div style={{ fontSize: 12, color: 'var(--mut)' }}>{isSw ? 'Tokeni:' : 'Token:'} {w.tok}</div>
                        </td>
                        <td>{os.length}</td>
                        <td><b style={{ color: 'var(--o)' }}>{linkOrders.length}</b></td>
                        <td><b>{fmt(sales)}</b></td>
                        <td>{fmt(cash)}</td>
                        <td>{fmt(momo)}</td>
                        <td style={{ color: '#15803D', fontWeight: 700 }}>{fmt(earned)}</td>
                        <td>{fmt(approved)}</td>
                        <td>
                          <button
                            className="btn sm ghost"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => setSelWaiterId(w.id)}
                          >
                            {isSw ? 'Chambua ▸' : 'Drill Down ▸'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Drill-down order details */}
          <div style={{ marginTop: 20 }}>
            <p className="sec">
              {selWaiterId === 'all'
                ? (isSw ? 'Kumbukumbu ya Ukaguzi wa Oda Zote' : 'All Orders Audit Trail')
                : (isSw ? `Chambua Oda za ${wn(selWaiterId)}` : `Drill Down Orders for ${wn(selWaiterId)}`)}
            </p>

            <div className="cg">
              {(S.orders || [])
                .filter(o => selWaiterId === 'all' || o.wid === selWaiterId)
                .map(o => (
                  <div key={o.id} className="card">
                    <div className="row">
                      <b>{o.no} · {isSw ? 'Meza' : 'Table'} {o.tb}</b>
                      <Pill st={o.st} />
                    </div>
                    <small style={{ display: 'block', margin: '4px 0', color: 'var(--mut)' }}>
                      {isSw ? 'Mhudumu:' : 'Waiter:'} <b>{wn(o.wid)}</b> · {isSw ? 'Chanzo:' : 'Source:'} {o.src} · {isSw ? 'Malipo:' : 'Payment:'} {o.pm || (isSw ? 'haijalipwa' : 'unpaid')}
                    </small>
                    <div className="row" style={{ marginTop: 8 }}>
                      <b>{fmt(tot(o))}</b>
                      <button className="btn sm ghost" onClick={() => setDrillOrder(o)}>
                        {isSw ? 'Kagua Risiti & Ukaguzi' : 'Inspect Receipt & Audit'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'checklists' && (
        <div style={{ maxWidth: 740 }}>
          <p className="sec">{isSw ? 'Orodha za Ukaguzi wa Kidijitali & Viwango vya Ubora (SRS QSC-01)' : 'Digital Checklists & Quality Standards (SRS QSC-01)'}</p>
          {(S.checklists || []).map(chk => (
            <div key={chk.id} className="card" style={{ marginBottom: 14 }}>
              <div className="row">
                <b>{chk.title}</b>
                <span
                  className="pill"
                  style={{
                    background: chk.completed ? '#DDF3E4' : '#FFE9DD',
                    color: chk.completed ? '#15803D' : '#C2410C'
                  }}
                >
                  {chk.completed
                    ? `${isSw ? 'Imetiwa Saini:' : 'Signed:'} ${chk.signedBy || (isSw ? 'Imethibitishwa' : 'Verified')}`
                    : (isSw ? 'Vipengele Vinavyosubiri' : 'Pending Items')}
                </span>
              </div>

              <div style={{ margin: '10px 0' }}>
                {chk.items.map((it, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: idx < chk.items.length - 1 ? '1px solid var(--line)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={() => A.toggleChecklist(chk.id, idx, sess?.name || 'Manager')}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--mut)' : 'inherit' }}>
                      {it.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <p className="sec">{isSw ? 'Kumbukumbu ya Ukaguzi wa Mfumo Isiyobadilika (SRS ADM-04, NFR-12)' : 'Tamper-Evident System Audit Trail (SRS ADM-04, NFR-12)'}</p>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>{isSw ? 'Muda' : 'Timestamp'}</th>
                  <th>{isSw ? 'Mtumiaji' : 'Actor / User'}</th>
                  <th>{isSw ? 'Tukio / Kitendo' : 'Action Event'}</th>
                  <th>{isSw ? 'Maelezo ya Ukaguzi' : 'Audit Details'}</th>
                </tr>
              </thead>
              <tbody>
                {(S.auditLog || []).map(aud => (
                  <tr key={aud.id}>
                    <td><small>{new Date(aud.t).toLocaleTimeString()} ({new Date(aud.t).toLocaleDateString()})</small></td>
                    <td><b>{aud.user}</b></td>
                    <td>
                      <span className="pill" style={{ fontSize: 11 }}>{aud.action}</span>
                    </td>
                    <td>{aud.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'menu' && (
        <MenuManagementView
          menuList={S.menu && S.menu.length ? S.menu : MENU}
          stockList={S.stock || []}
          outOfStockIds={S.outOfStockIds || []}
          onToggle86={(id, actor) => A.toggle86(id, actor || sess?.name || 'General Manager')}
          onCreateItem={(data, actor) => A.createMenuItem(data, actor || sess?.name || 'General Manager')}
          onUpdateItem={(id, data, actor) => A.updateMenuItem(id, data, actor || sess?.name || 'General Manager')}
          onDeleteItem={(id, actor) => A.deleteMenuItem(id, actor || sess?.name || 'General Manager')}
          actor={sess?.name || 'General Manager'}
        />
      )}

      {drillOrder && (
        <Sheet title={`${isSw ? 'Maelezo ya Ukaguzi wa Oda' : 'Order Audit Details'} ${drillOrder.no}`} onClose={() => setDrillOrder(null)}>
          <div className="card">
            <div className="row" style={{ marginBottom: 8 }}>
              <b>{drillOrder.no} · {isSw ? 'Meza' : 'Table'} {drillOrder.tb}</b>
              <Pill st={drillOrder.st} />
            </div>

            <div style={{ fontSize: 13, color: 'var(--mut)', marginBottom: 10 }}>
              {isSw ? 'Iliundwa:' : 'Created:'} {new Date(drillOrder.t).toLocaleString()} · {isSw ? 'Mhudumu:' : 'Waiter:'} {wn(drillOrder.wid)}
            </div>

            <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '8px 0', margin: '8px 0' }}>
              {(drillOrder.it || []).map((l, i) => (
                <div key={i} className="row" style={{ padding: '3px 0' }}>
                  <span>{l.q}x {isSw ? 'Bidhaa #' : 'Item #'}{l.id}</span>
                </div>
              ))}
            </div>

            <p><b>{isSw ? 'Historia ya Hatua za Oda:' : 'Lifecycle Audit History:'}</b></p>
            <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--mut)' }}>
              {(drillOrder.log || []).map((entry, idx) => (
                <li key={idx} style={{ margin: '4px 0' }}>{entry}</li>
              ))}
            </ul>

            <button className="btn ghost sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setDrillOrder(null)}>
              {isSw ? 'Funga' : 'Close'}
            </button>
          </div>
        </Sheet>
      )}

      <Tabs
        cur={tab}
        set={setTab}
        tabs={[
          ['overview', isSw ? 'Muhtasari' : 'Overview', '📊', 0],
          ['vat', isSw ? 'VAT & Kodi' : 'VAT & Tax', '🏛️', 0],
          ['menu', isSw ? 'Menyu' : 'Menu Catalog', '🍽️', unreviewedItems.length],
          ['commission', isSw ? 'Kamisheni' : 'Commission', '💰', 0],
          ['reconciliation', isSw ? 'Wahudumu' : 'Waiters (REC)', '👥', 0],
          ['checklists', isSw ? 'Ukaguzi' : 'Checklists', '📋', 0],
          ['audit', isSw ? 'Kumbukumbu' : 'Audit Trail', '🛡️', 0]
        ]}
      />

      {/* Manager Review Modal for Quick-Added Items */}
      <ManagerReviewModal
        isOpen={reviewModal}
        onClose={() => setReviewModal(false)}
        unreviewedItems={unreviewedItems}
        stockList={S.stock || []}
        onApproveItem={(itemId, approvalData) => A.reviewMenuItem(itemId, approvalData, sess?.name || 'Manager')}
      />
    </div>
  );
}
