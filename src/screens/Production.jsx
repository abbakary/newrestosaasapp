import React, { useState, useContext } from 'react';
import { fmt, fmtNum, BOMS, SITES, M } from '../data';
import { Ctx } from '../store';
import { TopBar, Sheet } from '../components/ui';

export function Production({ sess, out, setSess, setV }) {
  const { S, A, lang } = useContext(Ctx);
  const isSw = (lang || 'sw') === 'sw';
  const [tab, setTab] = useState('batches');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newBatchModal, setNewBatchModal] = useState(false);
  const [completeModalWO, setCompleteModalWO] = useState(null);
  const [labelModalWO, setLabelModalWO] = useState(null);
  const [dispatchModalReq, setDispatchModalReq] = useState(null);

  // New batch form
  const [selBomId, setSelBomId] = useState(BOMS[0].id);
  const [targetYield, setTargetYield] = useState(String(BOMS[0].targetYield));

  // Complete batch form
  const [actualYieldInput, setActualYieldInput] = useState('');
  const [tempLogInput, setTempLogInput] = useState('2.4°C');
  const [notesInput, setNotesInput] = useState('QC passed: appearance, weight, and aroma verified.');

  // Dispatch form
  const [driverName, setDriverName] = useState('Rashid Mtambo (Van #TZ 881 AC)');
  const [transportTemp, setTransportTemp] = useState('2.8°C');

  // Traceability search
  const [traceQuery, setTraceQuery] = useState('#0001');

  const boms = S.boms || BOMS;
  const productionOrders = S.productionOrders || [];
  const finishedGoods = S.finishedGoods || [];
  const siteRequisitions = S.siteRequisitions || [];

  const plannedBatches = productionOrders.filter(w => w.status === 'planned');
  const inProdBatches = productionOrders.filter(w => w.status === 'in_production');
  const completedBatches = productionOrders.filter(w => w.status === 'completed');

  const filteredOrders = productionOrders.filter(wo => {
    if (statusFilter === 'all') return true;
    return wo.status === statusFilter;
  });

  const handleCreateBatch = () => {
    A.createProductionOrder(selBomId, +targetYield, sess?.name || 'Jaffar Mdee (CK Lead)');
    setNewBatchModal(false);
  };

  const handleOpenCompleteModal = wo => {
    setCompleteModalWO(wo);
    setActualYieldInput(String(wo.plannedYield));
    setTempLogInput('2.4°C');
    setNotesInput('Passed QA sensory, temperature, and weight audit.');
  };

  const handleConfirmComplete = () => {
    if (!completeModalWO) return;
    A.completeProduction(
      completeModalWO.id,
      +actualYieldInput || completeModalWO.plannedYield,
      tempLogInput,
      notesInput,
      sess?.name || 'Jaffar Mdee'
    );
    setCompleteModalWO(null);
  };

  const handleConfirmDispatch = () => {
    if (!dispatchModalReq) return;
    A.dispatchRequisition(dispatchModalReq.id, driverName, transportTemp, sess?.name || 'Production Dispatch');
    setDispatchModalReq(null);
  };

  const searchedOrder = (S.orders || []).find(o => o.no === traceQuery || String(o.id) === traceQuery || traceQuery.includes(String(o.id)));

  return (
    <div className="app wide" style={{ maxWidth: 1440, padding: '8px 14px 100px' }}>
      <TopBar sess={sess} setSess={setSess} setV={setV} currentView="production" />

      {/* Production Station Header matching KDS Design Philosophy */}
      <div className="kds-monitor-container" style={{ marginBottom: 16 }}>
        <div className="kds-teal-nav" style={{ height: 56 }}>
          <div className="kds-teal-tabs">
            <button
              className={`kds-nav-tab ${tab === 'batches' ? 'active' : ''}`}
              onClick={() => setTab('batches')}
            >
              🔥 {isSw ? 'Oda za Uzalishaji' : 'Work Orders'} ({inProdBatches.length + plannedBatches.length})
            </button>
            <button
              className={`kds-nav-tab ${tab === 'boms' ? 'active' : ''}`}
              onClick={() => setTab('boms')}
            >
              📜 {isSw ? 'Mapishi & BOM' : 'Recipes & BOMs'} ({boms.length})
            </button>
            <button
              className={`kds-nav-tab ${tab === 'finished' ? 'active' : ''}`}
              onClick={() => setTab('finished')}
            >
              🍱 {isSw ? 'Bidhaa Tayari' : 'Finished Sales Goods'} ({finishedGoods.length})
            </button>
            <button
              className={`kds-nav-tab ${tab === 'requisitions' ? 'active' : ''}`}
              onClick={() => setTab('requisitions')}
            >
              🚚 {isSw ? 'Maombi ya Matawi' : 'Site Requisitions'} ({siteRequisitions.filter(r => r.status === 'pending').length})
            </button>
            <button
              className={`kds-nav-tab ${tab === 'traceability' ? 'active' : ''}`}
              onClick={() => setTab('traceability')}
            >
              🛡️ {isSw ? 'Ufuatiliaji Ubora' : 'Traceability Chain'}
            </button>
          </div>

          <div className="kds-nav-right">
            <button
              className="btn sm o"
              style={{ background: '#FF6B2C', padding: '7px 14px', borderRadius: 8, fontWeight: 700 }}
              onClick={() => setNewBatchModal(true)}
            >
              {isSw ? '+ Panga Awamu' : '+ Schedule Batch'}
            </button>
            <div className="kds-avatar-badge" title={isSw ? 'Meneja wa Jiko Kuu' : 'Central Kitchen Manager'}>
              JM
            </div>
          </div>
        </div>
      </div>

      {/* Work Orders Tab */}
      {tab === 'batches' && (
        <div>
          {/* Quick Filter Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--mut)' }}>{isSw ? 'Chuja Hatua:' : 'Stage Filter:'}</span>
              {[
                ['all', `${isSw ? 'Zote' : 'All'} (${productionOrders.length})`],
                ['planned', `${isSw ? 'Zilizopangwa' : 'Planned Schedule'} (${plannedBatches.length})`],
                ['in_production', `${isSw ? 'Zinapikwa' : 'In Production'} (${inProdBatches.length}) 🔥`],
                ['completed', `${isSw ? 'Zimekamilika' : 'Completed & Packaged'} (${completedBatches.length}) ✓`]
              ].map(([stKey, label]) => (
                <button
                  key={stKey}
                  className={`btn sm ghost ${statusFilter === stKey ? 'active-site' : ''}`}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8 }}
                  onClick={() => setStatusFilter(stKey)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 600 }}>
              {isSw ? 'Kituo Kikuu: Masaki Hub · Joto la Chumba Baridi: 2.6°C' : 'Central Facility: Masaki Flagship Hub · Cold Room Temp: 2.6°C'}
            </div>
          </div>

          {/* Batches Grid organized by High-Contrast Stage Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {filteredOrders.map(wo => {
              const isCompleted = wo.status === 'completed';
              const isInProd = wo.status === 'in_production';

              let headerBg = '#3182CE'; // planned blue
              let headerTitle = isSw ? 'RATIBA ILIYOPANGWA' : 'PLANNED SCHEDULE';
              if (isInProd) {
                headerBg = '#ED8936'; // in production orange
                headerTitle = isSw ? 'INAZALISHWA 🔥' : 'IN PRODUCTION 🔥';
              } else if (isCompleted) {
                headerBg = '#16A34A'; // completed green
                headerTitle = isSw ? 'IMEKAMILIKA & IMEFUNGWA ✓' : 'COMPLETED & PACKAGED ✓';
              }

              return (
                <div key={wo.id} className="kds-card" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {/* Card Header matching KDS aesthetic */}
                  <div style={{ background: headerBg, color: '#fff', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{wo.batchNo}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(0,0,0,0.25)', padding: '2px 8px', borderRadius: 4 }}>
                        {headerTitle}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                      {isSw ? 'Msimamizi:' : 'Lead Operator:'} <b>{wo.operator}</b> · WO #{wo.id}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1E293B' }}>
                      {wo.productName}
                    </h3>

                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 10, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div className="row">
                        <span style={{ color: 'var(--mut)' }}>{isSw ? 'Kiwango Lengwa:' : 'Target Yield:'}</span>
                        <b>{wo.plannedYield} {wo.uom}</b>
                      </div>

                      {isCompleted && (
                        <div className="row">
                          <span style={{ color: 'var(--mut)' }}>{isSw ? 'Matokeo Halisi:' : 'Actual Output:'}</span>
                          <b style={{ color: wo.yieldVariancePct < 0 ? '#DC2626' : '#16A34A' }}>
                            {wo.actualYield} {wo.uom} ({wo.yieldVariancePct >= 0 ? '+' : ''}{wo.yieldVariancePct}%)
                          </b>
                        </div>
                      )}

                      <div className="row">
                        <span style={{ color: 'var(--mut)' }}>{isSw ? 'Gharama ya Awamu:' : 'Total Batch Cost:'}</span>
                        <b>{fmt(wo.totalBatchCost)} ({fmt(wo.unitCost)}/{wo.uom})</b>
                      </div>

                      <div className="row">
                        <span style={{ color: 'var(--mut)' }}>{isSw ? 'Joto la Uhifadhi:' : 'Storage Temp:'}</span>
                        <span style={{ color: '#0E5A47', fontWeight: 700 }}>{wo.tempLog || '2.8°C'}</span>
                      </div>

                      <div className="row">
                        <span style={{ color: 'var(--mut)' }}>{isSw ? 'Tarehe ya Mwisho:' : 'Expiry Date:'}</span>
                        <span>{wo.expiryDate}</span>
                      </div>
                    </div>

                    {wo.notes && (
                      <div style={{ fontSize: 12, color: 'var(--mut)', fontStyle: 'italic', paddingLeft: 4 }}>
                        {isSw ? 'Maelezo ya Ubora:' : 'QA Note:'} {wo.notes}
                      </div>
                    )}

                    {/* Operational CTA Button */}
                    <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                      {wo.status === 'planned' && (
                        <button
                          className="kds-btn-start"
                          onClick={() => A.startProduction(wo.id, sess?.name || 'Central Kitchen Operator')}
                        >
                          🔥 {isSw ? 'ANZA UZALISHAJI' : 'START PRODUCTION BATCH'}
                        </button>
                      )}

                      {isInProd && (
                        <button
                          className="kds-btn-done-all"
                          onClick={() => handleOpenCompleteModal(wo)}
                        >
                          ✓ {isSw ? 'KAMILISHA & THIBITISHA UBORA' : 'COMPLETE & QA SIGN-OFF'}
                        </button>
                      )}

                      {isCompleted && (
                        <button
                          className="kds-btn-reopen"
                          onClick={() => setLabelModalWO(wo)}
                        >
                          🏷️ {isSw ? 'CHAPISHA LEBO YA AWAMU' : 'PRINT BATCH LABEL & TRACE'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOMs & Recipe Costing Tab */}
      {tab === 'boms' && (
        <div>
          <div className="kds-card" style={{ padding: 14, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>{isSw ? 'Orodha ya Viungo (BOM) & Gharama za Uzalishaji' : 'Bill of Materials (BOM) & Industrial Cost Formulation'}</b>
            <p style={{ fontSize: 13, color: 'var(--mut)', margin: '4px 0 0' }}>
              {isSw
                ? 'Mapishi ya kawaida ya viungo, vipimo vya uzalishaji, gharama za wafanyakazi na uendeshaji kwa jiko kuu.'
                : 'Standard ingredient recipes, yield conversion factors, labor allocation, and overhead absorption for central kitchen production.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {boms.map(bom => {
              const materialsCost = bom.ingredients.reduce((acc, ing) => {
                const stk = (S.stock || []).find(x => x.id === ing.stockId);
                return acc + (ing.qty * (stk?.unitCost || 5000));
              }, 0);
              const totalCost = materialsCost + bom.laborCost + bom.overheadCost;
              const costPerUnit = Math.round(totalCost / bom.targetYield);

              return (
                <div key={bom.id} className="kds-card">
                  <div style={{ background: '#0E5A47', color: '#fff', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: 16 }}>{bom.name}</b>
                      <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        {isSw ? 'Kiwango:' : 'Yield:'} {bom.targetYield} {bom.uom}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                      {isSw ? 'Bidhaa:' : 'Output Item:'} <b>{bom.outputName}</b> · {isSw ? 'Maandalizi:' : 'Prep:'} {bom.prepTimeMins}m
                    </div>
                  </div>

                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <b style={{ fontSize: 13, color: '#1E293B' }}>{isSw ? 'Viungo Ghafi Vinavyotumika:' : 'Raw Ingredients Consumed:'}</b>
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8 }}>
                      {bom.ingredients.map((ing, idx) => {
                        const stk = (S.stock || []).find(x => x.id === ing.stockId);
                        const lineCost = ing.qty * (stk?.unitCost || 5000);
                        return (
                          <div key={idx} className="row" style={{ fontSize: 12, padding: '3px 0' }}>
                            <span>{ing.qty} {ing.uom} {ing.name}</span>
                            <b>{fmt(lineCost)}</b>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ background: '#F1F5F9', padding: 8, borderRadius: 8, fontSize: 12 }}>
                      <div className="row"><span>{isSw ? 'Gharama ya Viungo:' : 'Materials Cost:'}</span><span>{fmt(materialsCost)}</span></div>
                      <div className="row"><span>{isSw ? 'Gharama ya Kazi:' : 'Labor Cost:'}</span><span>{fmt(bom.laborCost)}</span></div>
                      <div className="row"><span>{isSw ? 'Gharama za Ziada:' : 'Overhead:'}</span><span>{fmt(bom.overheadCost)}</span></div>
                      <div className="row" style={{ borderTop: '1px solid #CBD5E1', paddingTop: 4, fontWeight: 800 }}>
                        <span>{isSw ? 'Gharama kwa Kipimo:' : 'Unit Cost:'}</span>
                        <b style={{ color: '#16A34A', fontSize: 13 }}>{fmt(costPerUnit)} / {bom.uom}</b>
                      </div>
                    </div>

                    <button
                      className="kds-btn-start"
                      style={{ marginTop: 'auto' }}
                      onClick={() => {
                        setSelBomId(bom.id);
                        setTargetYield(String(bom.targetYield));
                        setNewBatchModal(true);
                      }}
                    >
                      {isSw ? '+ Panga Awamu' : '+ Schedule Batch'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Finished Goods Tab */}
      {tab === 'finished' && (
        <div>
          <div className="kds-card" style={{ padding: 14, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>{isSw ? 'Stoo ya Bidhaa Tayari & Zilizopikwa' : 'Finished & Prepared Goods Inventory Storage'}</b>
            <p style={{ fontSize: 13, color: 'var(--mut)', margin: '4px 0 0' }}>
              {isSw
                ? 'Idadi halisi ya vyakula vilivyoandaliwa jikoni na kuhifadhiwa kwenye majokofu yenye udhibiti wa joto.'
                : 'Real-time stock of kitchen-manufactured finished and semi-finished food items stored in temperature-controlled chillers.'}
            </p>
          </div>

          <div className="kds-card" style={{ overflowX: 'auto', padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: 10 }}>{isSw ? 'Bidhaa Tayari' : 'Finished Product'}</th>
                  <th style={{ padding: 10 }}>{isSw ? 'Kundi' : 'Category'}</th>
                  <th style={{ padding: 10 }}>{isSw ? 'Stoo Iliyopo' : 'On-Hand Stock'}</th>
                  <th style={{ padding: 10 }}>{isSw ? 'Kiwango Lengwa (PAR)' : 'PAR Target'}</th>
                  <th style={{ padding: 10 }}>{isSw ? 'Namba ya Awamu' : 'Batch Lot'}</th>
                  <th style={{ padding: 10 }}>{isSw ? 'Gharama' : 'Unit Cost'}</th>
                  <th style={{ padding: 10 }}>{isSw ? 'Tarehe ya Mwisho' : 'Expiry Date'}</th>
                  <th style={{ padding: 10 }}>{isSw ? 'Mahali' : 'Location'}</th>
                  <th style={{ padding: 10 }}>{isSw ? 'Hali' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {finishedGoods.map(fg => {
                  const isLow = fg.onHand < fg.reorder;
                  return (
                    <tr key={fg.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: 10 }}>
                        <b>{fg.name}</b>
                        {fg.menuId && <div style={{ fontSize: 11, color: 'var(--mut)' }}>{isSw ? 'Imeunganishwa na Menyu:' : 'Linked Sales Item:'} #{fg.menuId} {M[fg.menuId]?.n}</div>}
                      </td>
                      <td style={{ padding: 10 }}>{fg.category}</td>
                      <td style={{ padding: 10 }}><b style={{ fontSize: 14 }}>{fmtNum(fg.onHand)} {fg.uom}</b></td>
                      <td style={{ padding: 10 }}>{fg.par} {fg.uom}</td>
                      <td style={{ padding: 10 }}><code>{fg.batchNo}</code></td>
                      <td style={{ padding: 10 }}>{fmt(fg.unitCost)}</td>
                      <td style={{ padding: 10 }}>{fg.expiry}</td>
                      <td style={{ padding: 10 }}>{fg.loc}</td>
                      <td style={{ padding: 10 }}>
                        <span
                          style={{
                            background: isLow ? '#FEE2E2' : '#DCFCE7',
                            color: isLow ? '#DC2626' : '#16A34A',
                            fontWeight: 800,
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 4
                          }}
                        >
                          {isLow ? (isSw ? 'INAHITAJI KUAGIZWA' : 'REORDER NEEDED') : (isSw ? 'IPO STOO ✓' : 'IN STOCK ✓')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Requisitions Tab */}
      {tab === 'requisitions' && (
        <div>
          <div className="kds-card" style={{ padding: 14, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>{isSw ? 'Maombi ya Matawi & Usafirishaji wa Jokofu' : 'Branch Outlets Internal Requisitions & Temperature-Monitored Dispatch'}</b>
            <p style={{ fontSize: 13, color: 'var(--mut)', margin: '4px 0 0' }}>
              {isSw
                ? 'Maombi ya uhamisho wa bidhaa kutoka matawi kwenda kituo kikuu cha Masaki kwa magari yenye majokofu.'
                : 'Transfer requests from satellite branches to Masaki central facility with refrigerated vehicle monitoring.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
            {siteRequisitions.map(req => {
              const isDispatched = req.status === 'dispatched';
              const isReceived = req.status === 'received';

              return (
                <div key={req.id} className="kds-card">
                  <div style={{ background: isReceived ? '#16A34A' : isDispatched ? '#3182CE' : '#ED8936', color: '#fff', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: 15 }}>{req.id} · {req.fromSiteName.split('·')[1] || req.fromSiteName}</b>
                      <span style={{ fontSize: 11, background: 'rgba(0,0,0,0.25)', padding: '2px 8px', borderRadius: 4, fontWeight: 800 }}>
                        {req.status === 'received' ? (isSw ? 'IMEPOKELEWA' : 'RECEIVED') : req.status === 'dispatched' ? (isSw ? 'IMETUMWA' : 'DISPATCHED') : (isSw ? 'INASUBIRI' : 'PENDING')}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--mut)' }}>
                      {isSw ? 'Imeombwa na:' : 'Requested by:'} {req.requestedBy}
                    </div>

                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8 }}>
                      {(req.items || []).map((it, idx) => (
                        <div key={idx} className="row" style={{ fontSize: 13, padding: '3px 0' }}>
                          <span>{it.qty} {it.uom} {it.name}</span>
                          <span style={{ color: '#16A34A', fontWeight: 700 }}>{isSw ? 'Imetengwa ✓' : 'Allocated ✓'}</span>
                        </div>
                      ))}
                    </div>

                    {isDispatched && (
                      <div style={{ fontSize: 12, color: '#334155', background: '#EFF6FF', padding: 8, borderRadius: 6 }}>
                        🚚 {isSw ? 'Dereva:' : 'Driver:'} <b>{req.driver}</b> · {isSw ? 'Joto la Gari:' : 'Van Temp:'} <b>{req.transportTemp}</b>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                      {req.status === 'pending' && (
                        <button className="kds-btn-start" onClick={() => setDispatchModalReq(req)}>
                          🚚 {isSw ? 'TUMA GARI LA JOKOFU' : 'DISPATCH REFRIGERATED VAN'}
                        </button>
                      )}

                      {isDispatched && (
                        <button
                          className="kds-btn-done-all"
                          onClick={() => A.receiveRequisition(req.id, sess?.name || 'Branch Receiver')}
                        >
                          ✓ {isSw ? 'THIBITISHA UPOKEAJI TAWINI' : 'CONFIRM BRANCH RECEIPT'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Traceability Tab */}
      {tab === 'traceability' && (
        <div style={{ maxWidth: 800 }}>
          <div className="kds-card" style={{ padding: 14, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>{isSw ? 'Ufuatiliaji wa Ubora Kutoka Shambani Hadi Mezani' : 'Farm-to-Table Quality & Batch Traceability Explorer'}</b>
            <p style={{ fontSize: 13, color: 'var(--mut)', margin: '4px 0 0' }}>
              {isSw
                ? 'Tafuta namba ya tiketi ya mteja au awamu ya uzalishaji kukagua msambazaji, joto la maandalizi na kumbukumbu za huduma.'
                : 'Search any Customer Ticket # or Production Batch to audit source supplier lots, preparation temperature, and serving logs.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              className="inp"
              style={{ margin: 0, flex: 1 }}
              placeholder={isSw ? 'Tafuta Namba ya Oda (mf. #0001, #0009)...' : 'Search Order # (e.g. #0001, #0009)...'}
              value={traceQuery}
              onChange={e => setTraceQuery(e.target.value)}
            />
            <button className="btn sm o" style={{ width: 'auto', background: '#0E5A47' }}>
              {isSw ? 'Fuatilia Mlolongo' : 'Trace Chain'}
            </button>
          </div>

          {searchedOrder ? (
            <div className="kds-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
                <div>
                  <b style={{ fontSize: 18 }}>{isSw ? 'Oda' : 'Order'} {searchedOrder.no} · {searchedOrder.tb}</b>
                  <div style={{ fontSize: 12, color: 'var(--mut)' }}>{isSw ? 'Mhudumu:' : 'Server:'} {searchedOrder.by} · {isSw ? 'Muda:' : 'Placed:'} {fmtTime(searchedOrder.t)}</div>
                </div>
                <span className="kds-guests-badge">👥 {isSw ? 'Wageni' : 'Guests'} {searchedOrder.guests}</span>
              </div>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ borderLeft: '3px solid #16A34A', paddingLeft: 12 }}>
                  <b style={{ fontSize: 13, color: '#16A34A' }}>{isSw ? 'Hatua 1: Upokeaji wa Malighafi' : 'Step 1: Raw Material Receiving'}</b>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                    {isSw ? 'Imesambazwa na' : 'Supplied by'} <b>Serengeti Meats &amp; Poultry</b> ({isSw ? 'Awamu' : 'Batch'} LOT-20261028-A) · {isSw ? 'Joto la upokeaji:' : 'Received temp:'} 2.1°C
                  </div>
                </div>

                <div style={{ borderLeft: '3px solid #ED8936', paddingLeft: 12 }}>
                  <b style={{ fontSize: 13, color: '#ED8936' }}>{isSw ? 'Hatua 2: Uzalishaji wa Jiko Kuu' : 'Step 2: Central Kitchen Production'}</b>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                    {isSw ? 'Imeandaliwa chini ya' : 'Marinated & prepped under'} <b>WO-101 (BATCH-20261101-01)</b> · {isSw ? 'Kiongozi:' : 'Lead:'} Chef Baraka · HACCP: 2.6°C
                  </div>
                </div>

                <div style={{ borderLeft: '3px solid #3182CE', paddingLeft: 12 }}>
                  <b style={{ fontSize: 13, color: '#3182CE' }}>{isSw ? 'Hatua 3: Upikaji & Utoaji Mezani' : 'Step 3: Station Cooking & Pass Expo'}</b>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                    {isSw ? 'Imepikwa kwenye Jiko la Mkaa · Imethibitishwa na' : 'Fired on Charcoal Grill Station · Checked out by'} <b>Ammie</b> {isSw ? 'kwenye POS' : 'at POS'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="kds-card" style={{ padding: 24, textAlign: 'center', color: 'var(--mut)' }}>
              {isSw ? `Hakuna oda iliyopatikana kwa "${traceQuery}". Jaribu kutafuta #0001 au #0009.` : `No order found matching "${traceQuery}". Try searching #0001 or #0009.`}
            </div>
          )}
        </div>
      )}

      {/* New Batch Modal */}
      {newBatchModal && (
        <Sheet t={isSw ? 'Panga Awamu ya Uzalishaji Jiko Kuu' : 'Schedule Central Kitchen Batch'} c={() => setNewBatchModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700 }}>{isSw ? 'Chagua Kichocheo (BOM)' : 'Select Recipe BOM'}</label>
              <select
                className="inp"
                value={selBomId}
                onChange={e => {
                  setSelBomId(e.target.value);
                  const b = boms.find(x => x.id === e.target.value);
                  if (b) setTargetYield(String(b.targetYield));
                }}
              >
                {boms.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({isSw ? 'Matokeo:' : 'Output:'} {b.outputName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700 }}>{isSw ? 'Kiwango Lengwa Kinachotarajiwa' : 'Target Planned Yield'}</label>
              <input
                className="inp"
                type="number"
                value={targetYield}
                onChange={e => setTargetYield(e.target.value)}
              />
            </div>

            <button className="kds-btn-start" style={{ marginTop: 8 }} onClick={handleCreateBatch}>
              {isSw ? 'Panga Oda ya Uzalishaji' : 'Schedule Production Work Order'}
            </button>
          </div>
        </Sheet>
      )}

      {/* Complete Batch Modal */}
      {completeModalWO && (
        <Sheet t={`${isSw ? 'Kamilisha & Ukaguzi wa Ubora' : 'Complete & QA Audit'} · ${completeModalWO.batchNo}`} c={() => setCompleteModalWO(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700 }}>{isSw ? 'Matokeo Halisi Yaliyopatikana' : 'Actual Yield Output'} ({completeModalWO.uom})</label>
              <input
                className="inp"
                type="number"
                value={actualYieldInput}
                onChange={e => setActualYieldInput(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700 }}>{isSw ? 'Kumbukumbu ya Joto la Jokofu' : 'Cold Chain Temperature Log'}</label>
              <input
                className="inp"
                value={tempLogInput}
                onChange={e => setTempLogInput(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700 }}>{isSw ? 'Maelezo ya Ubora (QA)' : 'QA Quality & Sensory Notes'}</label>
              <textarea
                className="inp"
                rows={2}
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
              />
            </div>

            <button className="kds-btn-done-all" onClick={handleConfirmComplete}>
              {isSw ? 'Thibitisha Ubora & Ongeza Kwenye Stoo' : 'Confirm QA Pass & Add to Finished Goods Stock'}
            </button>
          </div>
        </Sheet>
      )}

      {/* Dispatch Modal */}
      {dispatchModalReq && (
        <Sheet t={`${isSw ? 'Usafirishaji wa Gari la Jokofu' : 'Refrigerated Van Dispatch'} · ${dispatchModalReq.id}`} c={() => setDispatchModalReq(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700 }}>{isSw ? 'Jina la Dereva & Namba ya Gari' : 'Driver Name & Vehicle Plate'}</label>
              <input
                className="inp"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700 }}>{isSw ? 'Joto la Shehena Kwenye Gari' : 'Refrigerated Cargo Temp Log'}</label>
              <input
                className="inp"
                value={transportTemp}
                onChange={e => setTransportTemp(e.target.value)}
              />
            </div>

            <button className="kds-btn-start" onClick={handleConfirmDispatch}>
              {isSw ? 'Thibitisha Safari & Chapisha Orodha' : 'Sign-Off Dispatch & Print Manifest'}
            </button>
          </div>
        </Sheet>
      )}

      {/* Batch Label Modal */}
      {labelModalWO && (
        <Sheet t={isSw ? 'Chapisha Lebo ya Awamu ya Uzalishaji' : 'Print Industrial Batch Label'} c={() => setLabelModalWO(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="receipt-paper" style={{ padding: 20 }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 8 }}>
                <b style={{ fontSize: 16 }}>SAFARI GRILL MANUFACTURING</b>
                <div style={{ fontSize: 12 }}>{isSw ? 'Kituo Kikuu cha Uzalishaji Chakula Masaki' : 'Masaki Central Food Production Hub'}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <b>{labelModalWO.productName}</b>
                <b>{labelModalWO.actualYield} {labelModalWO.uom}</b>
              </div>

              <div style={{ fontSize: 12, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div>{isSw ? 'Namba ya Awamu:' : 'Batch Lot:'} <code>{labelModalWO.batchNo}</code></div>
                <div>{isSw ? 'Uhifadhi:' : 'Storage:'} <b>{isSw ? 'Jokofu 0°C hadi 3°C' : 'Chiller 0°C to 3°C'}</b> ({isSw ? 'Imerekodiwa:' : 'Logged:'} {labelModalWO.tempLog})</div>
                <div>{isSw ? 'Tarehe ya Maandalizi:' : 'Prep Date:'} <b>{new Date().toLocaleDateString()}</b></div>
                <div>{isSw ? 'Matumizi Kabla ya:' : 'Best Before:'} <b>{labelModalWO.expiryDate}</b></div>
                <div>{isSw ? 'Msimamizi:' : 'Operator:'} <b>{labelModalWO.operator}</b></div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px dashed #000' }}>
                <span style={{ fontSize: 24, letterSpacing: 4 }}>||| | |||| | ||| |||| |</span>
                <div style={{ fontSize: 10 }}>BARCODE: {labelModalWO.batchNo.replace('-', '')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn o sm"
                style={{ background: '#0E5A47' }}
                onClick={() => {
                  window.print();
                  setLabelModalWO(null);
                }}
              >
                🖨️ {isSw ? 'Chapisha Lebo' : 'Print Label Sticker'}
              </button>
              <button className="btn sm ghost" onClick={() => setLabelModalWO(null)}>
                {isSw ? 'Funga' : 'Close'}
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
