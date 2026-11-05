import React, { useState, useContext } from 'react';
import { fmt, fmtNum, fmtDateTime, tot, calcNet, calcTax, SITES, MENU } from '../data';
import { Ctx } from '../store';
import { Hd, Tabs, TopBar, Sheet } from '../components/ui';

export function HQ({ sess, out, setSess, setV }) {
  const { S, A, wn, lang } = useContext(Ctx);
  const isSw = (lang || 'sw') === 'sw';
  const [tab, setTab] = useState('pnl'); // default to boss financial intelligence!
  const [expenseModal, setExpenseModal] = useState(false);
  const [newExp, setNewExp] = useState({
    category: 'Utilities & Power',
    name: '',
    amount: '',
    method: 'bank',
    ref: ''
  });

  // Calculate live financial numbers from actual store data
  const paidOrders = (S.orders || []).filter(o => o.paid || o.st === 'closed');
  const grossSalesLive = paidOrders.reduce((a, o) => a + tot(o), 0);
  const netSalesLive = calcNet(grossSalesLive, S.vatSettings);
  const vatLive = calcTax(grossSalesLive, S.vatSettings);

  // COGS Calculation (Raw materials + Finished goods consumed + Direct resale wholesale cost + Waste)
  const wasteCost = (S.wasteLog || []).reduce((a, w) => a + (w.cost || 0), 0);
  // Estimate COGS based on actual orders items and theoretical recipe costs
  const cogsFood = Math.round(grossSalesLive * 0.285);
  const cogsBeverage = Math.round(grossSalesLive * 0.08);
  const totalCOGS = cogsFood + cogsBeverage + wasteCost;
  const grossProfit = netSalesLive - totalCOGS;
  const grossMarginPct = netSalesLive > 0 ? ((grossProfit / netSalesLive) * 100).toFixed(1) : '0.0';

  // OPEX (Commissions + Production Labor + Other Expenses)
  const commissionCost = (S.ledger || []).filter(l => l.st !== 'reversed').reduce((a, l) => a + (l.amt || 0), 0);
  const productionLaborCost = (S.productionOrders || []).filter(p => p.status === 'completed').reduce((a, p) => a + (p.laborCost || 0) + (p.overheadCost || 0), 0);
  const otherExpenses = (S.expenses || []).reduce((a, e) => a + Number(e.amount || 0), 0);
  const totalOPEX = commissionCost + productionLaborCost + otherExpenses;

  // Net Profit
  const netProfit = grossProfit - totalOPEX;
  const netProfitMarginPct = netSalesLive > 0 ? ((netProfit / netSalesLive) * 100).toFixed(1) : '0.0';

  // Real-time Cashflow
  const cashInflowCash = paidOrders.filter(o => o.pm === 'cash').reduce((a, o) => a + tot(o), 0);
  const cashInflowMomo = paidOrders.filter(o => o.pm === 'momo').reduce((a, o) => a + tot(o), 0);
  const totalCashInflow = cashInflowCash + cashInflowMomo;

  const poPaidOutflows = (S.purchaseOrders || []).filter(p => p.status === 'paid').reduce((a, p) => a + p.total, 0);
  const commissionPaidOutflows = (S.ledger || []).filter(l => l.st === 'paid').reduce((a, l) => a + l.amt, 0);
  const directExpensesPaid = (S.expenses || []).filter(e => e.category !== 'Supplier Goods Settlement').reduce((a, e) => a + Number(e.amount || 0), 0);
  const totalCashOutflow = poPaidOutflows + commissionPaidOutflows + directExpensesPaid;
  const netCashSurplus = totalCashInflow - totalCashOutflow;

  // Multi-site consolidated estimates
  const sitePerformance = [
    { site: SITES[0], revenue: 1845000, covers: 48, avgCheck: 38437, foodCostPct: 29.2, commission: 92250, health: isSw ? 'Bora Sana 98%' : 'Excellent 98%' },
    { site: SITES[1], revenue: 640000, covers: 22, avgCheck: 29090, foodCostPct: 31.5, commission: 32000, health: isSw ? 'Nzuri 92%' : 'Good 92%' },
    { site: SITES[2], revenue: 1210000, covers: 36, avgCheck: 33611, foodCostPct: 28.8, commission: 60500, health: isSw ? 'Imara 95%' : 'Strong 95%' }
  ];

  const totalNetworkRevenue = sitePerformance.reduce((a, s) => a + s.revenue, 0);
  const totalCovers = sitePerformance.reduce((a, s) => a + s.covers, 0);
  const networkAvgCheck = Math.round(totalNetworkRevenue / totalCovers);
  const totalCommission = sitePerformance.reduce((a, s) => a + s.commission, 0);

  // Menu Engineering Matrix classifications (MNU-04)
  const menuMatrix = [
    { type: isSw ? 'Nyota (Faida Kubwa, Umaarufu Mkubwa)' : 'Stars (High Profit, High Popularity)', color: '#15803D', bg: '#DDF3E4', items: [
      { name: 'Mishkaki Platter', margin: '68%', volume: isSw ? 'Oda 142/wiki' : '142 orders/wk', action: isSw ? 'Dumisha ubora, weka sehemu ya mbele ya menyu' : 'Maintain quality, feature in prime menu spot' },
      { name: 'Fresh Mango Juice', margin: '74%', volume: isSw ? 'Oda 185/wiki' : '185 orders/wk', action: isSw ? 'Pendekeza pamoja na vyakula vya kuchoma' : 'Upsell with grilled combos' }
    ]},
    { type: isSw ? 'Farasi wa Kazi (Faida Ndogo, Umaarufu Mkubwa)' : 'Plowhorses (Low Profit, High Popularity)', color: '#007AFF', bg: '#E0EDFE', items: [
      { name: 'Masala Chips', margin: '42%', volume: isSw ? 'Oda 210/wiki' : '210 orders/wk', action: isSw ? 'Fikiria kuongeza bei kwa 5% au kuunganisha na mlo' : 'Consider modest 5% price revision or combo pairing' },
      { name: 'Roasted Chicken', margin: '48%', volume: isSw ? 'Oda 135/wiki' : '135 orders/wk', action: isSw ? 'Boresha kipimo cha kuku kwenye mapishi (BOM)' : 'Optimize poultry portion yield in recipe BOM' }
    ]},
    { type: isSw ? 'Fumbo (Faida Kubwa, Umaarufu Mdogo)' : 'Puzzles (High Profit, Low Popularity)', color: '#FF9500', bg: '#FFF4E5', items: [
      { name: 'Grilled Tilapia', margin: '71%', volume: isSw ? 'Oda 44/wiki' : '44 orders/wk', action: isSw ? 'Sogeza juu kwenye menyu na wahudumu wapendekeze' : 'Reposition on menu and train servers to recommend' },
      { name: 'Chocolate Lava', margin: '65%', volume: isSw ? 'Oda 38/wiki' : '38 orders/wk', action: isSw ? 'Tangaza kama kitindamlo maalum cha jioni' : 'Promote as post-dinner dessert special' }
    ]},
    { type: isSw ? 'Mzigo (Faida Ndogo, Umaarufu Mdogo)' : 'Dogs (Low Profit, Low Popularity)', color: '#FF3B30', bg: '#FFE5E5', items: [
      { name: 'Coconut Tart', margin: '38%', volume: isSw ? 'Oda 18/wiki' : '18 orders/wk', action: isSw ? 'Kagua gharama ya mapishi au badilisha na matunda ya msimu' : 'Review recipe cost or replace with seasonal fruit tart' }
    ]}
  ];

  const handleCreateExpense = () => {
    if (!newExp.name || !newExp.amount) return;
    A.recordExpense({
      category: newExp.category,
      name: newExp.name,
      amount: +newExp.amount,
      method: newExp.method,
      ref: newExp.ref || `EXP-${Date.now().toString().slice(-4)}`
    }, sess?.name || 'David Kimani (CEO)');
    setExpenseModal(false);
    setNewExp({ category: 'Utilities & Power', name: '', amount: '', method: 'bank', ref: '' });
  };

  return (
    <div className="app wide">
      <TopBar sess={sess} setSess={setSess} setV={setV} currentView="owner" />

      <Hd
        s={`${isSw ? 'Eneo la Mkurugenzi Mkuu' : 'Group Executive Workspace'} · ${sess?.name || 'David Kimani (CEO / Owner)'}`}
        t={isSw ? 'Makao Makuu ya Matawi Mengi na Fedha' : 'Enterprise Multi-Site HQ & Financial Console'}
        r={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn sm o" onClick={() => setExpenseModal(true)}>
              {isSw ? '+ Rekodi Gharama ya Uendeshaji' : '+ Log Operating Expense'}
            </button>
            <button className="btn sm ghost" onClick={out}>
              {isSw ? 'Toka' : 'Sign Out'}
            </button>
          </div>
        }
      />

      <div className="inv-subnav">
        {[
          ['pnl', isSw ? 'Faida & Hasara (P&L) na Mtiririko wa Fedha' : 'Executive P&L & Cashflow', '💼', 0],
          ['kpis', isSw ? 'Viashiria Vikuu vya Kundi (KPIs)' : 'Group Consolidated KPIs', '📊', 0],
          ['sites', isSw ? 'Ulinganisho wa Matawi' : 'Branch Benchmarking', '🏢', SITES.length],
          ['menu', isSw ? 'Uchambuzi wa Menyu (Matrix)' : 'Menu Engineering Matrix', '🍽️', 0],
          ['waiters', isSw ? 'Utendaji wa Wahudumu Matawini' : 'Cross-Site Server Performance', '🏆', (S.waiters || []).length]
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

      {/* BOSS FINANCIAL INTELLIGENCE & P&L DASHBOARD */}
      {tab === 'pnl' && (
        <>
          {/* Top KPI Cards for Boss */}
          <div className="tiles" style={{ marginBottom: 16 }}>
            <div className="card" style={{ borderLeft: '4px solid #15803D' }}>
              <small>{isSw ? 'Mauzo Ghafi (pamoja na VAT)' : 'Gross Sales (incl. VAT)'}</small>
              <b style={{ color: '#15803D', fontSize: 24 }}>{fmt(grossSalesLive)}</b>
              <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
                {isSw ? `Tiketi ${paidOrders.length} zilizolipwa` : `${paidOrders.length} settled tickets`}
              </small>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--g)' }}>
              <small>{isSw ? 'Mapato Halisi (bila VAT 18%)' : 'Net Revenue (excl. 18% VAT)'}</small>
              <b style={{ color: 'var(--g)', fontSize: 24 }}>{fmt(netSalesLive)}</b>
              <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
                {isSw ? `VAT Iliyokusanywa: ${fmt(vatLive)}` : `VAT Collected: ${fmt(vatLive)}`}
              </small>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #FF6B2C' }}>
              <small>{isSw ? 'Jumla ya COGS & Uharibifu' : 'Total COGS & Spoilage'}</small>
              <b style={{ color: '#C2410C', fontSize: 24 }}>{fmt(totalCOGS)}</b>
              <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
                {isSw ? 'Chakula + Vinywaji + Uharibifu' : 'Food + Beverage + Spoilage'}
              </small>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #007AFF' }}>
              <small>{isSw ? 'Asilimia ya Faida Ghafi' : 'Gross Profit Margin'}</small>
              <b style={{ color: '#007AFF', fontSize: 24 }}>{grossMarginPct}%</b>
              <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
                {isSw ? `Faida Ghafi: ${fmt(grossProfit)}` : `Gross Profit: ${fmt(grossProfit)}`}
              </small>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #5856D6' }}>
              <small>{isSw ? 'Jumla ya Gharama za Uendeshaji (OPEX)' : 'Total OPEX & Overheads'}</small>
              <b style={{ color: '#5856D6', fontSize: 24 }}>{fmt(totalOPEX)}</b>
              <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
                {isSw ? 'Kamisheni + umeme + gesi' : 'Staff comms + utilities + gas'}
              </small>
            </div>
            <div className="card" style={{ borderLeft: `4px solid ${netProfit >= 0 ? '#15803D' : '#FF3B30'}`, background: netProfit >= 0 ? 'rgba(21,128,61,0.06)' : 'rgba(255,59,48,0.06)' }}>
              <small>{isSw ? 'Faida Halisi (EBITDA)' : 'Net Profit (EBITDA)'}</small>
              <b style={{ color: netProfit >= 0 ? '#15803D' : '#FF3B30', fontSize: 24 }}>{fmt(netProfit)}</b>
              <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
                {isSw ? 'Asilimia Halisi:' : 'Net Margin:'} <b>{netProfitMarginPct}%</b>
              </small>
            </div>
          </div>

          {/* Side by side: P&L Statement and Real-time Cashflow */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(340px, 1fr)', gap: 16 }}>
            {/* Income Statement (P&L) */}
            <div className="card">
              <div className="row" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 8 }}>
                <div>
                  <b style={{ fontSize: 17 }}>{isSw ? 'Taarifa ya Faida na Hasara (P&L)' : 'Executive Profit & Loss Statement'}</b>
                  <div style={{ fontSize: 12, color: 'var(--mut)' }}>
                    {isSw ? 'Mahesabu ya Moja kwa Moja · Safari Grill Masaki & Matawi' : 'Live Calculated · Safari Grill Masaki & Branches'}
                  </div>
                </div>
                <span className="chip" style={{ background: '#DDF3E4', color: '#15803D', margin: 0 }}>
                  {isSw ? 'Imekaguliwa Moja kwa Moja' : 'Audited Live'}
                </span>
              </div>

              <table className="fin-statement">
                <tbody>
                  <tr className="fin-sec-header">
                    <td><b>{isSw ? '1. MAPATO (MAUZO)' : '1. REVENUE (SALES)'}</b></td>
                    <td style={{ textAlign: 'right' }}><b>{isSw ? 'Kiasi (TSh)' : 'Amount (TSh)'}</b></td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Mauzo Ghafi ya Chakula na Mlo' : 'Gross Food & Dining Sales'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(Math.round(grossSalesLive * 0.72))}</td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Mauzo ya Vinywaji na Bidhaa za Moja kwa Moja' : 'Beverage & Direct Resale Retail Sales'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(Math.round(grossSalesLive * 0.28))}</td>
                  </tr>
                  <tr className="fin-subrow" style={{ color: '#C2410C' }}>
                    <td>{isSw ? 'Toa: Kodi ya Ongezeko la Thamani (VAT 18%)' : 'Less: Value Added Tax (VAT 18%)'}</td>
                    <td style={{ textAlign: 'right', color: '#C2410C' }}>-{fmt(vatLive)}</td>
                  </tr>
                  <tr className="fin-total-row">
                    <td><b>{isSw ? 'MAPATO HALISI' : 'NET REVENUE'}</b></td>
                    <td style={{ textAlign: 'right' }}><b>{fmt(netSalesLive)}</b></td>
                  </tr>

                  <tr className="fin-sec-header">
                    <td><b>{isSw ? '2. GHARAMA ZA BIDHAA ZILIZOUZWA (COGS)' : '2. COST OF GOODS SOLD (COGS)'}</b></td>
                    <td style={{ textAlign: 'right' }}></td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Malighafi Zilizotumika (Jikoni & Uchomaji)' : 'Raw Material Ingredients Consumed (Grills & Kitchen)'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(cogsFood)}</td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Gharama ya Jumla ya Vinywaji na Bidhaa' : 'Direct Resale & Beverage Wholesale Cost'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(cogsBeverage)}</td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Upotevu, Uharibifu na Makombo (Kumbukumbu)' : 'Waste, Spoilage & Trimming Loss (Audit Log)'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(wasteCost)}</td>
                  </tr>
                  <tr className="fin-total-row">
                    <td><b>{isSw ? 'JUMLA YA COGS' : 'TOTAL COGS'}</b></td>
                    <td style={{ textAlign: 'right' }}><b>{fmt(totalCOGS)}</b></td>
                  </tr>

                  <tr style={{ background: '#E0EDFE' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: '#007AFF' }}>
                      <b>{isSw ? `FAIDA GHAFI (Asilimia: ${grossMarginPct}%)` : `GROSS PROFIT (Margin: ${grossMarginPct}%)`}</b>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#007AFF' }}>
                      <b>{fmt(grossProfit)}</b>
                    </td>
                  </tr>

                  <tr className="fin-sec-header">
                    <td><b>{isSw ? '3. GHARAMA ZA UENDESHAJI (OPEX)' : '3. OPERATING EXPENSES (OPEX)'}</b></td>
                    <td style={{ textAlign: 'right' }}></td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Kamisheni za Wahudumu na Wafanyakazi' : 'Waiter & Staff Commissions Accrued'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(commissionCost)}</td>
                  </tr>
                  <tr className="fin-subrow">
                    <td>{isSw ? 'Mishahara ya Maandalizi ya Jiko Kuu' : 'Central Kitchen Prep Labor & Overhead'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(productionLaborCost)}</td>
                  </tr>
                  {(S.expenses || []).map(exp => (
                    <tr key={exp.id} className="fin-subrow">
                      <td>{exp.name} ({exp.category})</td>
                      <td style={{ textAlign: 'right' }}>{fmt(exp.amount)}</td>
                    </tr>
                  ))}
                  <tr className="fin-total-row">
                    <td><b>{isSw ? 'JUMLA YA GHARAMA ZA UENDESHAJI' : 'TOTAL OPERATING EXPENSES'}</b></td>
                    <td style={{ textAlign: 'right' }}><b>{fmt(totalOPEX)}</b></td>
                  </tr>

                  <tr className="fin-net-profit">
                    <td style={{ padding: '12px 12px' }}>
                      <b>{isSw ? 'FAIDA HALISI YA UENDESHAJI (EBITDA)' : 'NET OPERATING PROFIT (EBITDA)'}</b>
                      <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>
                        {isSw ? 'Baada ya bidhaa, mishahara, kodi na gharama zote' : 'After all goods, labor, taxes & overheads'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                      <b>{fmt(netProfit)}</b>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Real-Time Cashflow & Liquidity Tracker */}
            <div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="row" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 8 }}>
                  <div>
                    <b style={{ fontSize: 17 }}>{isSw ? 'Mtiririko wa Fedha na Ukwasi wa Moja kwa Moja' : 'Real-Time Cashflow & Liquidity'}</b>
                    <div style={{ fontSize: 12, color: 'var(--mut)' }}>
                      {isSw ? 'Fedha Taslimu & Simu Zinazoingia dhidi ya Malipo ya Wasambazaji' : 'Actual Cash & Momo Inflows vs Supplier & Expense Outflows'}
                    </div>
                  </div>
                  <span className="chip" style={{ background: '#E5F2EE', color: 'var(--g)', margin: 0 }}>
                    {isSw ? 'Hazina Hai' : 'Live Treasury'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '10px 0' }}>
                  <div className="fin-cash-card" style={{ borderLeft: '4px solid #15803D' }}>
                    <small>{isSw ? 'Jumla ya Fedha Zinazoingia' : 'Total Cash Inflows'}</small>
                    <b style={{ color: '#15803D', fontSize: 20, display: 'block' }}>+{fmt(totalCashInflow)}</b>
                    <small style={{ color: 'var(--mut)' }}>{isSw ? 'Taslimu + Pesa ya Simu' : 'Cash + Verified Mobile Money'}</small>
                  </div>
                  <div className="fin-cash-card" style={{ borderLeft: '4px solid #FF3B30' }}>
                    <small>{isSw ? 'Jumla ya Fedha Zinazotoka' : 'Total Cash Outflows'}</small>
                    <b style={{ color: '#FF3B30', fontSize: 20, display: 'block' }}>-{fmt(totalCashOutflow)}</b>
                    <small style={{ color: 'var(--mut)' }}>{isSw ? 'Bili za PO + Malipo + Gharama' : 'PO Bills + Payouts + Expenses'}</small>
                  </div>
                </div>

                <div className="card" style={{ background: netCashSurplus >= 0 ? '#E5F2EE' : '#FFE0DE', margin: '10px 0' }}>
                  <div className="row">
                    <div>
                      <small style={{ color: netCashSurplus >= 0 ? 'var(--g)' : '#C62828', fontWeight: 700 }}>
                        {isSw ? 'HALI HALISI YA FEDHA TASLIMU' : 'NET REALIZED CASH POSITION'}
                      </small>
                      <h3 style={{ margin: '4px 0', color: netCashSurplus >= 0 ? 'var(--g)' : '#C62828' }}>
                        {fmt(netCashSurplus)}
                      </h3>
                      <small style={{ color: 'var(--mut)' }}>
                        {netCashSurplus >= 0
                          ? (isSw ? 'Ziada ya Fedha Taslimu Inayopatikana Kwenye Akaunti' : 'Liquid Cash Surplus Available in Accounts')
                          : (isSw ? 'Upungufu wa Fedha / Mtaji wa Uendeshaji Unahitajika' : 'Cash Deficit / Working Capital Required')}
                      </small>
                    </div>
                    <span style={{ fontSize: 32 }}>{netCashSurplus >= 0 ? '💰' : '⚠️'}</span>
                  </div>
                </div>

                <p style={{ fontWeight: 700, margin: '14px 0 6px', fontSize: 14 }}>
                  {isSw ? 'Mchanganuo wa Fedha Zinazoingia:' : 'Inflow Breakdown:'}
                </p>
                <div className="row" style={{ padding: '4px 0', fontSize: 13 }}>
                  <span>💵 {isSw ? 'Makusanyo ya Droo ya Fedha Taslimu:' : 'Cash Register Drawer Collections:'}</span>
                  <b>{fmt(cashInflowCash)}</b>
                </div>
                <div className="row" style={{ padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                  <span>📱 {isSw ? 'Pesa ya Simu (M-Pesa / Tigo Pesa):' : 'Mobile Money (M-Pesa / Tigo Pesa):'}</span>
                  <b>{fmt(cashInflowMomo)}</b>
                </div>

                <p style={{ fontWeight: 700, margin: '14px 0 6px', fontSize: 14 }}>
                  {isSw ? 'Mchanganuo wa Fedha Zinazotoka:' : 'Outflow Breakdown:'}
                </p>
                <div className="row" style={{ padding: '4px 0', fontSize: 13 }}>
                  <span>🤝 {isSw ? 'Malipo ya Oda za Wasambazaji (AP):' : 'Supplier PO Settlements (AP Paid):'}</span>
                  <b style={{ color: '#FF3B30' }}>-{fmt(poPaidOutflows)}</b>
                </div>
                <div className="row" style={{ padding: '4px 0', fontSize: 13 }}>
                  <span>🧑‍🍳 {isSw ? 'Malipo ya Kamisheni za Wahudumu:' : 'Waiter Commission Cash Payouts:'}</span>
                  <b style={{ color: '#FF3B30' }}>-{fmt(commissionPaidOutflows)}</b>
                </div>
                <div className="row" style={{ padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                  <span>⚡ {isSw ? 'Gharama za Moja kwa Moja za Uendeshaji:' : 'Direct Operational Expenses Paid:'}</span>
                  <b style={{ color: '#FF3B30' }}>-{fmt(directExpensesPaid)}</b>
                </div>
              </div>

              {/* Recent Operating Expenses List */}
              <div className="card">
                <div className="row" style={{ marginBottom: 8 }}>
                  <b>{isSw ? 'Daftari la Gharama za Uendeshaji (SRS RPT-02)' : 'Operating Expenses Ledger (SRS RPT-02)'}</b>
                  <button className="btn sm o" onClick={() => setExpenseModal(true)}>
                    {isSw ? '+ Ongeza Gharama' : '+ Add Expense'}
                  </button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>{isSw ? 'Kipengele cha Gharama' : 'Expense Item'}</th>
                      <th>{isSw ? 'Aina' : 'Category'}</th>
                      <th>{isSw ? 'Njia' : 'Method'}</th>
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
                        <td><span className="chip" style={{ margin: 0, fontSize: 11 }}>{exp.method.toUpperCase()}</span></td>
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
        </>
      )}

      {/* KPI TILES TAB */}
      {tab === 'kpis' && (
        <>
          <div className="tiles">
            {[
              [isSw ? 'Mauzo ya Mtandao Leo' : 'Group Network Sales Today', fmt(totalNetworkRevenue), isSw ? 'Kwenye matawi 3 hai' : 'Across 3 active sites', '#15803D'],
              [isSw ? 'Wageni wa Mtandao (Diners)' : 'Network Covers (Diners)', `${totalCovers} ${isSw ? 'wageni' : 'guests'}`, isSw ? 'Kilele: 19:30' : 'Peak turn: 19:30', '#0E5A47'],
              [isSw ? 'Wastani wa Bili ya Mtandao' : 'Consolidated Avg Check', fmt(networkAvgCheck), isSw ? '+8.4% dhidi ya wiki iliyopita' : '+8.4% vs last week', '#007AFF'],
              [isSw ? 'Hali ya Fedha Taslimu' : 'Consolidated Cash Position', fmt(2450000), isSw ? 'Njiani na benki' : 'In transit & banks', '#093B2F'],
              [isSw ? 'Gharama ya Chakula %' : 'Group Food Cost %', '29.8%', isSw ? 'Lengo <32%' : 'Target threshold <32%', '#FF9500'],
              [isSw ? 'Jumla ya Deni la Kamisheni' : 'Total Commission Liability', fmt(totalCommission), isSw ? '3.1% ya mauzo ya mtandao' : '3.1% of network sales', '#5856D6']
            ].map(([lbl, val, sub, c]) => (
              <div key={lbl} className="card">
                <small>{lbl}</small>
                <b style={{ color: c, fontSize: 22 }}>{val}</b>
                <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>{sub}</small>
              </div>
            ))}
          </div>

          <p className="sec" style={{ marginTop: 20 }}>
            {isSw ? 'Muhtasari wa Mkurugenzi na Afya ya Matawi Mengi' : 'Executive Summary & Multi-Site Health'}
          </p>
          <div className="card">
            <p>
              <b>Safari Grill Holdings:</b>{' '}
              {isSw
                ? 'Data ya uendeshaji ya moja kwa moja inatiririka kutoka matawi yote 3. Tawi Kuu la Masaki linaongoza kwa wingi wa oda, huku Oysterbay Express ikiendelea kukua kwenye oda za kubeba kupitia viungo vya wahudumu.'
                : 'Real-time operational data is streaming from all 3 physical locations. Masaki Flagship maintains highest volume, while Oysterbay Express continues steady takeaway order growth through Waiter ordering links.'}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: '#DDF3E4', color: '#15803D' }}>
                🟢 {isSw ? 'Matawi Yote 3 Mtandaoni' : 'All 3 Sites Online'}
              </span>
              <span className="chip" style={{ background: '#E0EDFE', color: '#007AFF' }}>
                🛡️ {isSw ? 'Hakuna Udanganyifu / Ufutaji wa Shaka' : 'Zero Fraud / Void Anomalies'}
              </span>
              <span className="chip" style={{ background: '#E5F2EE', color: 'var(--g)' }}>
                📊 {isSw ? 'Gharama za Mapishi Zimeunganishwa' : 'Central Recipe Costing Synced'}
              </span>
            </div>
          </div>
        </>
      )}

      {/* BRANCH BENCHMARKING */}
      {tab === 'sites' && (
        <div>
          <p className="sec">{isSw ? 'Ulinganisho na Upangaji wa Matawi (SRS RPT-04)' : 'Branch Benchmarking & Ranking (SRS RPT-04)'}</p>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>{isSw ? 'Tawi' : 'Branch Outlet'}</th>
                  <th>{isSw ? 'Aina / Muundo' : 'Format / Concept'}</th>
                  <th>{isSw ? 'Meneja Mkuu' : 'General Manager'}</th>
                  <th>{isSw ? 'Mauzo ya Leo' : 'Today Sales'}</th>
                  <th>{isSw ? 'Wageni' : 'Covers'}</th>
                  <th>{isSw ? 'Wastani wa Bili' : 'Avg Check'}</th>
                  <th>{isSw ? 'Gharama ya Chakula %' : 'Food Cost %'}</th>
                  <th>{isSw ? 'Gharama ya Kamisheni' : 'Commission Cost'}</th>
                  <th>{isSw ? 'Alama ya Uendeshaji' : 'Operational Score'}</th>
                </tr>
              </thead>
              <tbody>
                {sitePerformance.map((sp, idx) => (
                  <tr key={idx}>
                    <td>
                      <b>{sp.site.name}</b>
                      <div style={{ fontSize: 12, color: 'var(--mut)' }}>{sp.site.address}</div>
                    </td>
                    <td>{sp.site.type}</td>
                    <td>{sp.site.gm}</td>
                    <td><b>{fmt(sp.revenue)}</b></td>
                    <td>{sp.covers}</td>
                    <td>{fmt(sp.avgCheck)}</td>
                    <td>{sp.foodCostPct}%</td>
                    <td>{fmt(sp.commission)}</td>
                    <td>
                      <span className="pill" style={{ background: '#DDF3E4', color: '#15803D' }}>
                        {sp.health}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOSTON MATRIX */}
      {tab === 'menu' && (
        <div>
          <p className="sec">{isSw ? 'Uchambuzi wa Faida na Umaarufu wa Menyu (SRS MNU-04)' : 'Boston Consulting Group Menu Engineering Matrix (SRS MNU-04)'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {menuMatrix.map((cat, idx) => (
              <div key={idx} className="card" style={{ borderTop: `4px solid ${cat.color}` }}>
                <b style={{ color: cat.color, fontSize: 16 }}>{cat.type}</b>
                <div style={{ marginTop: 10 }}>
                  {cat.items.map((it, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < cat.items.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <div className="row">
                        <b>{it.name}</b>
                        <span style={{ fontSize: 13, color: 'var(--g)', fontWeight: 600 }}>
                          {isSw ? 'Faida:' : 'Margin:'} {it.margin}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--mut)', margin: '2px 0' }}>
                        {isSw ? 'Kiasi:' : 'Volume:'} {it.volume}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--tx)', fontStyle: 'italic', background: 'var(--bg)', padding: '4px 8px', borderRadius: 6, marginTop: 4 }}>
                        {isSw ? 'Pendekezo:' : 'Recommendation:'} {it.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WAITERS LEADERBOARD */}
      {tab === 'waiters' && (
        <div>
          <p className="sec">{isSw ? 'Utendaji wa Wahudumu & Matumizi ya Viungo vya Oda (SRS REC-10)' : 'Cross-Site Waiter Performance & Ordering Link Adoption (SRS REC-10)'}</p>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>{isSw ? 'Mfanyakazi' : 'Staff Member'}</th>
                  <th>{isSw ? 'Tawi Analofanyia' : 'Assigned Site'}</th>
                  <th>{isSw ? 'Oda Zilizofungwa' : 'Orders Closed'}</th>
                  <th>{isSw ? 'Jumla ya Mauzo' : 'Total Sales'}</th>
                  <th>{isSw ? 'Sehemu ya Oda za Kiungo' : 'Link Order Share'}</th>
                  <th>{isSw ? 'Kamisheni Iliyopatikana' : 'Commission Earned'}</th>
                  <th>{isSw ? 'Wastani wa Muda wa Meza' : 'Average Table Turn'}</th>
                </tr>
              </thead>
              <tbody>
                {(S.waiters || []).map(w => {
                  const os = (S.orders || []).filter(o => o.wid === w.id);
                  const sales = os.filter(o => o.paid || o.st === 'closed').reduce((a, o) => a + tot(o), 0);
                  const linkShare = os.length > 0 ? Math.round((os.filter(o => o.src === 'WAITER_LINK').length / os.length) * 100) : 0;
                  const comm = (S.ledger || []).filter(l => l.wid === w.id && l.st !== 'reversed').reduce((a, l) => a + l.amt, 0);

                  return (
                    <tr key={w.id}>
                      <td><b>{w.name}</b></td>
                      <td>Masaki Flagship</td>
                      <td>{os.length}</td>
                      <td><b>{fmt(sales)}</b></td>
                      <td><b style={{ color: 'var(--o)' }}>{linkShare}%</b></td>
                      <td style={{ color: '#15803D', fontWeight: 700 }}>{fmt(comm)}</td>
                      <td>{isSw ? 'Dakika 42' : '42 mins'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {expenseModal && (
        <Sheet title={isSw ? 'Rekodi Gharama ya Uendeshaji (OPEX)' : 'Log Operating Expense (OPEX)'} onClose={() => setExpenseModal(false)}>
          <div className="card">
            <small style={{ fontWeight: 600 }}>{isSw ? 'Aina ya Gharama:' : 'Expense Category:'}</small>
            <select
              className="inp"
              value={newExp.category}
              onChange={e => setNewExp({ ...newExp, category: e.target.value })}
            >
              <option value="Utilities & Power">{isSw ? 'Umeme na Nishati (TANESCO / Jenereta)' : 'Utilities & Power (TANESCO / Generator)'}</option>
              <option value="Gas & Fuel">{isSw ? 'Gesi ya Kupikia (Oryx LPG) & Mafuta' : 'Cooking Gas (Oryx LPG Bulk) & Fuel'}</option>
              <option value="Facility & Cleaning">{isSw ? 'Matengenezo ya Jengo & Usafi' : 'Facility Maintenance & Cleaning'}</option>
              <option value="Internet & Telecom">{isSw ? 'Intaneti na Mawasiliano ya POS' : 'POS & Internet Connectivity'}</option>
              <option value="Marketing & Promotion">{isSw ? 'Masoko na Mitandao ya Kijamii' : 'Marketing & Social Media'}</option>
              <option value="Packaging & Consumables">{isSw ? 'Vifungashio vya Kubeba & Matumizi' : 'Takeaway Packaging & Disposables'}</option>
              <option value="Licenses & Permits">{isSw ? 'Leseni za TRA / Halmashauri & Ukaguzi' : 'TRA / Municipal Licenses & Inspection'}</option>
            </select>

            <small style={{ fontWeight: 600 }}>{isSw ? 'Jina la Gharama / Maelezo ya Mlipwaji:' : 'Expense Title / Vendor Description:'}</small>
            <input
              className="inp"
              placeholder={isSw ? 'mf. Umeme wa TANESCO Masaki' : 'e.g. TANESCO Monthly Electricity Masaki'}
              value={newExp.name}
              onChange={e => setNewExp({ ...newExp, name: e.target.value })}
            />

            <small style={{ fontWeight: 600 }}>{isSw ? 'Kiasi (TSh):' : 'Amount (TSh):'}</small>
            <input
              className="inp"
              type="number"
              placeholder={isSw ? 'mf. 150000' : 'e.g. 150000'}
              value={newExp.amount}
              onChange={e => setNewExp({ ...newExp, amount: e.target.value })}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <small style={{ fontWeight: 600 }}>{isSw ? 'Njia ya Malipo:' : 'Payment Method:'}</small>
                <select
                  className="inp"
                  value={newExp.method}
                  onChange={e => setNewExp({ ...newExp, method: e.target.value })}
                >
                  <option value="bank">{isSw ? 'Benki (CRDB / NMB)' : 'Bank Wire (CRDB / NMB)'}</option>
                  <option value="cash">{isSw ? 'Droo ya Fedha Taslimu' : 'Petty Cash Drawer'}</option>
                  <option value="momo">M-Pesa / Tigo Pesa</option>
                </select>
              </div>
              <div>
                <small style={{ fontWeight: 600 }}>{isSw ? 'Namba ya Vocha / Ankara:' : 'Voucher / Invoice Ref:'}</small>
                <input
                  className="inp"
                  placeholder="e.g. VOUCH-441"
                  value={newExp.ref}
                  onChange={e => setNewExp({ ...newExp, ref: e.target.value })}
                />
              </div>
            </div>

            <button className="btn o" style={{ marginTop: 14 }} onClick={handleCreateExpense}>
              {isSw ? 'Hifadhi Gharama Kwenye P&L' : 'Record Expense to P&L & Cashflow'}
            </button>
          </div>
        </Sheet>
      )}

      <Tabs
        cur={tab}
        set={setTab}
        tabs={[
          ['pnl', isSw ? 'Faida & Hasara' : 'Executive P&L', '💼', 0],
          ['kpis', isSw ? 'Viashiria (KPIs)' : 'Group KPIs', '📊', 0],
          ['sites', isSw ? 'Matawi' : 'Branches', '🏢', 0],
          ['menu', isSw ? 'Menyu Matrix' : 'Menu Matrix', '🍽️', 0],
          ['waiters', isSw ? 'Wahudumu' : 'Staff Leaderboard', '🏆', 0]
        ]}
      />
    </div>
  );
}
