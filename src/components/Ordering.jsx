import React, { useState, useContext, useMemo } from 'react';
import { CATS, CAT_ICONS, M, MENU, TABLES, TW, SEATS, fmt, calcNet, calcTax } from '../data';
import { Ctx } from '../store';
import { Sheet, TableMap } from './ui';
import { TableSlideSelector } from './TableSlideSelector';
import { QuickAddMenuItemModal } from './FastDrinksAndInventory';
import { MenuItemDetailModal } from './MenuManagement';

export function Menu({ cart, setCart, hero, isPosMode = false, onPlaced = null, sess = null, onOpenCart = null, allowStaffMenuActions = false }) {
  const { S, A, wn, lang, t, getMenuName, getMenuDesc, getCategoryName } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  const [c, setC] = useState('All');
  const [q, setQ] = useState('');
  const [d, setD] = useState(null);
  const [n, setN] = useState(1);
  const [note, setNote] = useState('');

  // POS / Side Panel State (Image 1)
  const [customerName, setCustomerName] = useState('Judith Rodriguez');
  const [tableCount, setTableCount] = useState(4);
  const [tableNo, setTableNo] = useState('T1');
  const [showTableMap, setShowTableMap] = useState(false);
  const [showSlideSelector, setShowSlideSelector] = useState(false);
  const [orderType, setOrderType] = useState('dine_in'); // dine_in, takeaway, online
  const [paymentMethod, setPaymentMethod] = useState('ewallet'); // cash, card, ewallet
  const [discountPercent, setDiscountPercent] = useState(20);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccessToast, setOrderSuccessToast] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [detailedModalOpen, setDetailedModalOpen] = useState(false);

  const outOfStockIds = S.outOfStockIds || [];
  const activeMenu = S.menu && S.menu.length ? S.menu : MENU;
  const menuMap = useMemo(() => ({
    ...M,
    ...Object.fromEntries(activeMenu.map(m => [m.id, m]))
  }), [activeMenu]);

  const list = activeMenu.filter(m => {
    const matchCat = c === 'All' || m.c === c;
    const matchQ = m.n.toLowerCase().includes(q.toLowerCase()) || (m.d || '').toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  const add = (id, k = 1, itemNote = '') => {
    if (outOfStockIds.includes(id)) return;
    setCart(prev => {
      const existing = prev.find(l => l.id === id && l.note === itemNote);
      if (existing) {
        return prev.map(l => l === existing ? { ...l, q: l.q + k } : l);
      }
      return [...prev, { id, q: k, note: itemNote }];
    });
  };

  const updateQty = (id, delta, itemNote = '') => {
    setCart(prev => {
      return prev.map(l => {
        if (l.id === id && (l.note || '') === (itemNote || '')) {
          return { ...l, q: l.q + delta };
        }
        return l;
      }).filter(l => l.q > 0);
    });
  };

  const removeItem = (id, itemNote = '') => {
    setCart(prev => prev.filter(l => !(l.id === id && (l.note || '') === (itemNote || ''))));
  };

  const getQtyInCart = id => {
    return cart.filter(l => l.id === id).reduce((acc, curr) => acc + curr.q, 0);
  };

  // Calculations for financial breakdown
  const vatSettings = S?.vatSettings || { enabled: true, rate: 18, inclusive: true, taxLabel: 'VAT 18%' };
  const isVatOn = vatSettings.enabled !== false;
  const subTotal = cart.reduce((a, l) => a + (menuMap[l.id]?.p || M[l.id]?.p || 0) * l.q, 0);
  const discountAmt = Math.round(subTotal * (discountPercent / 100));
  const payableBase = Math.max(0, subTotal - discountAmt);
  const taxAmt = isVatOn ? calcTax(payableBase, vatSettings) : 0;
  const finalTotal = isVatOn && vatSettings.inclusive === false
    ? payableBase + taxAmt
    : payableBase;
  const cartTotalCount = cart.reduce((a, l) => a + l.q, 0);

  // Helper to determine if a physical table is currently occupied with active unpaid orders
  const isTableOccupied = t => {
    if (!t || t === 'Takeaway' || t === 'Online') return false;
    return (S.orders || []).some(o => o.tb === t && !['paid', 'closed', 'cancelled'].includes(o.st));
  };

  const handlePosCheckout = () => {
    if (!cart.length) return;

    const isOnline = orderType === 'online';
    const isTakeaway = orderType === 'takeaway';
    const assignedTable = isOnline ? 'Online' : isTakeaway ? 'Takeaway' : tableNo || 'T1';

    // Daily Operations Business Rule: Block order placement on occupied tables
    if (!isOnline && !isTakeaway && isTableOccupied(assignedTable)) {
      setOrderSuccessToast(isSw ? `❌ Haiwezekani: Meza ${assignedTable} ina wageni tayari. Tafadhali chagua meza iliyo wazi.` : `❌ Cannot seat: Table ${assignedTable} is currently OCCUPIED by active diners. Please select an available table.`);
      setShowSlideSelector(true);
      setTimeout(() => setOrderSuccessToast(''), 5500);
      return;
    }

    setIsCheckingOut(true);
    const assignedSrc = isOnline ? 'ONLINE_ORDER' : isTakeaway ? 'CASHIER' : 'TABLE_QR';

    A.place({
      src: assignedSrc,
      orderType: isOnline ? (isSw ? 'Oda ya Mtandaoni' : 'Online Order') : isTakeaway ? (isSw ? 'Pakiti' : 'Takeaway') : (isSw ? 'Kula Hapa' : 'Dine In'),
      tb: assignedTable,
      guests: tableCount,
      wid: isOnline ? 'w2' : 'w1',
      it: cart,
      pm: paymentMethod === 'ewallet' ? 'momo' : paymentMethod === 'card' ? 'card' : 'cash',
      cust: 'cust_' + Date.now().toString(36),
      by: customerName || (isSw ? 'Mgeni' : 'Judith Rodriguez'),
      discountPct: discountPercent,
      online: isOnline
    }, sess?.name || (isSw ? 'Keshia / POS' : 'Cashier / POS'));

    setTimeout(() => {
      setCart([]);
      setIsCheckingOut(false);
      setOrderSuccessToast(isSw ? `✓ Oda imethibitishwa kwa ${customerName} (${assignedTable})! Imetumwa jikoni.` : `✓ Order confirmed for ${customerName} (${assignedTable})! Ticket sent to kitchen queue.`);
      setTimeout(() => setOrderSuccessToast(''), 4500);
      if (onPlaced) onPlaced();
    }, 400);
  };

  return (
    <div className={`pos-layout-wrap ${isPosMode ? 'has-pos-panel' : 'customer-menu-wrap'}`}>
      {orderSuccessToast && (
        <div className="toast" style={{ background: '#15803D' }}>
          ✓ {orderSuccessToast}
        </div>
      )}

      {/* Main Left Section: Hero, Search, Categories, Food Grid */}
      <div style={{ minWidth: 0, width: '100%' }}>
        {/* Top Search bar with optional quick Cart status */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
          <div className="search" style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line)', padding: '10px 16px', borderRadius: 16 }}>
            <span style={{ fontSize: 18, color: 'var(--mut)' }}>🔍</span>
            <input
              placeholder={isSw ? 'Tafuta chakula, vinywaji, viungo...' : 'Search dishes, drinks, ingredients...'}
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ fontSize: 15 }}
            />
            {q && (
              <button onClick={() => setQ('')} style={{ color: 'var(--mut)', padding: '0 6px', fontSize: 14 }}>
                ✕
              </button>
            )}
          </div>

          {!isPosMode && cartTotalCount > 0 && onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              style={{
                background: 'linear-gradient(135deg, #FF6B2C, #E55A1F)',
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                padding: '10px 14px',
                fontWeight: 800,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(255,107,44,0.35)',
                transition: 'all 0.15s ease'
              }}
              title={isSw ? 'Tazama Kikapu na Malipo' : 'Review Cart & Checkout'}
            >
              <span>🛒</span>
              <span>{cartTotalCount}</span>
              <span>·</span>
              <span>{fmt(subTotal)}</span>
            </button>
          )}
        </div>

        {/* Hero banner (Image 1 style) */}
        {hero ? (
          hero
        ) : (
          <div className="pos-hero">
            <div className="pos-hero-content">
              <h2>{isSw ? 'Chakula Kizuri na Kitamu kwa Afya Yako' : 'Healthy Food is the key to your good mood'}</h2>
              <p>{isSw ? 'Wapenzi wa biryani pata punguzo la 20% kwa vyakula maalum vya choma.' : 'For all biryani lovers get 20% off all chef special fire-grilled meals.'}</p>
              <button
                className="pos-hero-btn"
                onClick={() => {
                  setC('Grills');
                  const biryani = activeMenu.find(m => m.id === 16);
                  if (biryani) add(biryani.id);
                }}
              >
                {isSw ? 'Weka Oda Sasa ➔' : 'Order Now ➔'}
              </button>
            </div>
            <img
              src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80"
              alt="Special Biryani"
              className="pos-hero-img-plate"
            />
          </div>
        )}

        {/* Category Carousel (Image 1 style) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
            {isSw ? 'Chagua Kitengo' : 'Choose Category'}
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(isPosMode || allowStaffMenuActions) && (
              <>
                <button
                  type="button"
                  onClick={() => setQuickAddOpen(true)}
                  style={{
                    background: '#0E5A47',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '7px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 2px 8px rgba(14,90,71,0.25)'
                  }}
                  title="Cashier / Kitchen quick menu item addition under 10 seconds"
                >
                  <span>⚡</span>
                  <span>+ {isSw ? 'Ongeza Haraka (<10s)' : 'Quick Add (<10s)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailedModalOpen(true)}
                  style={{
                    background: '#fff',
                    color: '#0E5A47',
                    border: '1.5px solid #0E5A47',
                    borderRadius: 12,
                    padding: '7px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                  title="Create full detailed menu item with finished goods image upload"
                >
                  <span>📷</span>
                  <span>+ {isSw ? 'Chakula (Picha)' : 'Dish (Photo Upload)'}</span>
                </button>
              </>
            )}
            <button
              onClick={() => setC('All')}
              style={{ fontSize: 13, color: '#FF5A43', fontWeight: 700, cursor: 'pointer' }}
            >
              {isSw ? 'Tazama Vyote ➔' : 'See All ➔'}
            </button>
          </div>
        </div>

        <div className="pos-cat-row">
          {CATS.map(x => (
            <div
              key={x}
              className={`pos-cat-card ${c === x ? 'active' : ''}`}
              onClick={() => setC(x)}
            >
              <div className="pos-cat-icon">{CAT_ICONS[x] || '🍽️'}</div>
              <span className="pos-cat-name">{getCategoryName ? getCategoryName(x) : x}</span>
            </div>
          ))}
        </div>

        {/* Special Menu All Items Header & Grid (Image 1 style) */}
        <div style={{ margin: '18px 0 8px' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
            {c === 'All' ? (isSw ? 'Vyakula na Vinywaji Vyote' : 'Special Menu All Items') : (getCategoryName ? getCategoryName(c) : `${c} Menu`)}
          </h3>
        </div>

        <div className="pos-items-grid">
          {list.map(m => {
            const is86 = outOfStockIds.includes(m.id);
            const inCartQty = getQtyInCart(m.id);
            return (
              <div
                key={m.id}
                className={`pos-item-card ${is86 ? 'sold-out' : ''}`}
                onClick={() => {
                  setD(m);
                  setN(1);
                  setNote('');
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={m.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'}
                    alt={m.n}
                    className="pos-item-thumb"
                    loading="lazy"
                  />
                  {is86 && <span className="sold-out-badge">{isSw ? 'IMEISHA / SOLD OUT' : "86'D / SOLD OUT"}</span>}
                  {m.needsReview && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FCD34D',
                        fontSize: 10,
                        padding: '2px 7px',
                        borderRadius: 99,
                        fontWeight: 800,
                        zIndex: 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                      title={isSw ? 'Imeongezwa haraka, inasubiri mapitio ya meneja' : 'Item added on-site, awaiting manager stock cost review'}
                    >
                      ⚠️ {isSw ? 'Inasubiri Mapitio' : 'Needs Review'}
                    </span>
                  )}
                  {m.packMultiplier && m.packMultiplier > 1 && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        background: 'rgba(30,58,138,0.88)',
                        color: '#fff',
                        fontSize: 10,
                        padding: '2px 7px',
                        borderRadius: 99,
                        fontWeight: 800,
                        zIndex: 2,
                        backdropFilter: 'blur(4px)'
                      }}
                      title={isSw ? `Inapunguza chupa ${m.packMultiplier} kwenye friji ya baa` : `Direct link: deducts ${m.packMultiplier} bottles from bar fridge`}
                    >
                      📦 {m.packMultiplier}x {isSw ? 'Pakiti' : 'Pack'}
                    </span>
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 99,
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    ★ {m.r || '4.8'}
                  </span>
                </div>

                <div className="pos-item-body">
                  <h4 className="pos-item-title">{getMenuName ? getMenuName(m) : m.n}</h4>
                  {/* Menu item description removed per user request for ultra clean look */}

                  <div className="pos-item-footer">
                    <span className="pos-item-price">{fmt(m.p)}</span>

                    {inCartQty > 0 ? (
                      <div
                        className="pos-qty-pill"
                        onClick={e => e.stopPropagation()}
                      >
                        <button onClick={() => updateQty(m.id, -1)}>−</button>
                        <span>{inCartQty}</span>
                        <button onClick={() => updateQty(m.id, 1)}>+</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="pos-add-btn"
                        disabled={is86}
                        onClick={e => {
                          e.stopPropagation();
                          if (!is86) add(m.id);
                        }}
                      >
                        + {isSw ? 'Weka' : 'Add'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!list.length && (
          <div className="card" style={{ textAlign: 'center', padding: '36px 16px', margin: '20px 0' }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>🍽️</div>
            <p style={{ fontWeight: 700 }}>{isSw ? `Hakuna chakula kinacholingana na "${q}"` : `No dishes found matching "${q}"`}</p>
            <small style={{ color: 'var(--mut)' }}>{isSw ? 'Jaribu kuchagua kitengo kingine au futa utafutaji.' : 'Try selecting another category or clear the search input.'}</small>
          </div>
        )}
      </div>

      {/* Right Side Panel: Customer Information & Current Order (Image 1 style) */}
      {isPosMode && (
        <div className="pos-order-panel">
        <div className="pos-panel-sec-title">
          <span>{isSw ? 'Taarifa za Mteja' : 'Customer Information'}</span>
          <span style={{ fontSize: 16, cursor: 'pointer', opacity: 0.7 }} title={isSw ? 'Maelezo ya Oda' : 'Order Details'}>ℹ️</span>
        </div>

        {/* Customer Information Box */}
        <div className="pos-info-box">
          <div style={{ marginBottom: 10 }}>
            <small style={{ color: 'var(--mut)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              {isSw ? 'Jina la Mteja:' : 'Customer Name:'}
            </small>
            <input
              className="inp"
              style={{ margin: 0, padding: '8px 12px', fontSize: 14 }}
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder={isSw ? 'Jina la Mteja (Mgeni)' : 'Guest Customer Name'}
            />
          </div>

          {/* Selected Table Status Card */}
          <div style={{
            background: isTableOccupied(tableNo) ? '#FEF2F2' : '#F0FDF4',
            border: `1.5px solid ${isTableOccupied(tableNo) ? '#FCA5A5' : '#86EFAC'}`,
            borderRadius: 14,
            padding: '10px 12px',
            margin: '8px 0 10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b style={{ fontSize: 13.5, color: isTableOccupied(tableNo) ? '#DC2626' : '#166534' }}>
                  {tableNo === 'Takeaway' ? (isSw ? '🛵 Kaunta ya Kuchukua' : '🛵 Takeaway Counter') : tableNo === 'Online' ? (isSw ? '📱 Oda ya Mtandaoni' : '📱 Online Delivery') : (isSw ? `🪑 Meza ${tableNo} (Viti ${SEATS[tableNo] || 4})` : `🪑 Table ${tableNo} (${SEATS[tableNo] || 4} Seats)`)}
                </b>
                <span style={{
                  marginLeft: 8,
                  fontSize: 10.5,
                  padding: '2px 7px',
                  borderRadius: 99,
                  fontWeight: 700,
                  background: isTableOccupied(tableNo) ? '#FEE2E2' : '#DCFCE7',
                  color: isTableOccupied(tableNo) ? '#DC2626' : '#166534'
                }}>
                  {isTableOccupied(tableNo) ? (isSw ? '🔴 IMEJAA' : '🔴 OCCUPIED') : (isSw ? '🟢 WAZI' : '🟢 AVAILABLE')}
                </span>
              </div>
            </div>
            {isTableOccupied(tableNo) && (
              <small style={{ color: '#DC2626', display: 'block', marginTop: 4, fontWeight: 700, fontSize: 11 }}>
                {isSw ? '⚠️ Meza hii tayari inatumika. Lazima ukamilishe malipo kabla ya kuweka wageni wengine.' : '⚠️ Table is currently occupied. Normal operations require selecting an available table.'}
              </small>
            )}
          </div>

          {/* Trigger button for the Right Slide Drawer */}
          <button
            type="button"
            onClick={() => setShowSlideSelector(true)}
            style={{
              background: 'linear-gradient(135deg, #0E5A47, #15803D)',
              color: '#fff',
              borderRadius: 12,
              padding: '10px 12px',
              fontSize: 12.5,
              fontWeight: 700,
              width: '100%',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(14,90,71,0.25)'
            }}
          >
            <span>🪑</span>
            <span>{isSw ? 'Chagua Meza na Ramani ya Ukumbi ➔' : 'Select Table & Floor Plan (Slide Form) ➔'}</span>
          </button>

          {/* Quick Table Chips with Occupancy Lockouts */}
          <div style={{ margin: '6px 0 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <small style={{ color: 'var(--mut)', fontWeight: 700, fontSize: 11 }}>{isSw ? 'Chagua Meza Haraka:' : 'Quick Table Pick:'}</small>
              <small style={{ color: 'var(--mut)', fontSize: 11 }}>
                🟢 {TABLES.filter(t => !isTableOccupied(t)).length} {isSw ? 'Wazi' : 'Free'} · 🔴 {TABLES.filter(t => isTableOccupied(t)).length} {isSw ? 'Zimejaa' : 'Busy'}
              </small>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TABLES.map(t => {
                const busy = isTableOccupied(t);
                const isSel = tableNo === t;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={busy}
                    title={busy ? (isSw ? `Meza ${t} inatumika. Lipa bili kwanza.` : `Table ${t} is occupied. Settle bill before seating new guests.`) : (isSw ? `Chagua Meza ${t}` : `Select Table ${t}`)}
                    className={`action-btn ${isSel ? 'settle' : ''}`}
                    style={{
                      padding: '5px 8px',
                      fontSize: 11.5,
                      fontWeight: isSel ? 800 : 600,
                      background: busy ? 'rgba(239,68,68,0.1)' : isSel ? '#15803D' : 'var(--card)',
                      color: busy ? '#DC2626' : isSel ? '#fff' : 'var(--tx)',
                      borderColor: busy ? '#FCA5A5' : isSel ? '#15803D' : 'var(--line)',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      opacity: busy ? 0.65 : 1
                    }}
                    onClick={() => {
                      if (busy) return;
                      setTableNo(t);
                      if (t === 'Takeaway') setOrderType('takeaway');
                      else setOrderType('dine_in');
                    }}
                  >
                    {busy ? `🔒 ${t}` : t}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <small style={{ color: 'var(--mut)', fontWeight: 600, display: 'block' }}>{isSw ? 'Idadi ya Watu:' : 'Number of Person:'}</small>
              <b style={{ fontSize: 13.5 }}>{tableCount} {isSw ? `Watu (Meza ${tableNo})` : `Person Table (${tableNo})`}</b>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="pos-stepper-btn"
                onClick={() => setTableCount(Math.max(1, tableCount - 1))}
              >
                −
              </button>
              <span style={{ fontWeight: 800, fontSize: 15, minWidth: 20, textAlign: 'center' }}>
                {tableCount}
              </span>
              <button
                className="pos-stepper-btn"
                onClick={() => setTableCount(tableCount + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button
              type="button"
              className={`action-btn ${orderType === 'dine_in' ? 'view' : ''}`}
              style={{ flex: 1, padding: '5px 4px', fontSize: 11 }}
              onClick={() => setOrderType('dine_in')}
            >
              🍽️ {isSw ? 'Kula Hapa' : 'Dine In'}
            </button>
            <button
              type="button"
              className={`action-btn ${orderType === 'takeaway' ? 'edit' : ''}`}
              style={{ flex: 1, padding: '5px 4px', fontSize: 11 }}
              onClick={() => {
                setOrderType('takeaway');
                setTableNo('Takeaway');
              }}
            >
              🛵 {isSw ? 'Pakiti' : 'Takeaway'}
            </button>
            <button
              type="button"
              className={`action-btn ${orderType === 'online' ? 'settle' : ''}`}
              style={{ flex: 1, padding: '5px 4px', fontSize: 11 }}
              onClick={() => {
                setOrderType('online');
                setTableNo('Online');
              }}
            >
              📱 {isSw ? 'Mtandaoni' : 'Online'}
            </button>
          </div>
        </div>

        {/* Current Order Section */}
        <div className="pos-panel-sec-title">
          <span>{isSw ? 'Oda ya Sasa' : 'Current Order'} ({cart.reduce((a, l) => a + l.q, 0)})</span>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              style={{ color: '#FF3B30', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              {isSw ? 'Futa Yote' : 'Clear'}
            </button>
          )}
        </div>

        {!cart.length ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--mut)', background: 'var(--bg)', borderRadius: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🛒</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{isSw ? 'Bado hujaweka chakula chochote' : 'Your order is empty'}</div>
            <small>{isSw ? 'Bonyeza "+ Weka" kwenye chakula kuanza oda yako.' : 'Click "+ Add" on any menu dish to start your ticket.'}</small>
          </div>
        ) : (
          <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
            {cart.map((line, idx) => {
              const rawItem = menuMap[line.id] || M[line.id] || { n: `Item #${line.id}`, p: 0, img: '' };
              const itemTitle = getMenuName ? getMenuName(rawItem) : rawItem.n;
              return (
                <div key={idx} className="pos-cart-item">
                  <img
                    src={rawItem.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80'}
                    alt={itemTitle}
                    className="pos-cart-thumb"
                  />
                  <div className="pos-cart-meta">
                    <div className="pos-cart-name">{itemTitle}</div>
                    <div className="pos-cart-price">{fmt(rawItem.p * line.q)}</div>
                    <button
                      className="pos-remove-text"
                      onClick={() => removeItem(line.id, line.note)}
                    >
                      {isSw ? 'Ondoa' : 'Remove'}
                    </button>
                  </div>
                  <div className="pos-qty-pill">
                    <button onClick={() => updateQty(line.id, -1, line.note)}>−</button>
                    <span>{line.q}</span>
                    <button onClick={() => updateQty(line.id, 1, line.note)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Financial Breakdown (Image 1 style) */}
        <div style={{ margin: '16px 0 8px', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div className="row" style={{ padding: '3px 0', fontSize: 13, color: 'var(--mut)' }}>
            <span>{isSw ? 'Jumla Ndogo' : 'Sub Total'}</span>
            <b style={{ color: 'var(--tx)' }}>{fmt(subTotal)}</b>
          </div>
          {isVatOn && (
            <div className="row" style={{ padding: '3px 0', fontSize: 13, color: 'var(--mut)' }}>
              <span>{vatSettings.taxLabel || `VAT (${vatSettings.rate || 18}%)`}</span>
              <b style={{ color: 'var(--tx)' }}>{fmt(taxAmt)}</b>
            </div>
          )}
          {discountPercent > 0 && (
            <div className="row" style={{ padding: '3px 0', fontSize: 13, color: '#FF3B30' }}>
              <span>{isSw ? 'Punguzo' : 'Discount'} {discountPercent}%</span>
              <b style={{ color: '#FF3B30' }}>-{fmt(discountAmt)}</b>
            </div>
          )}
          <div
            className="row"
            style={{
              padding: '10px 0 4px',
              borderTop: '1px dashed var(--line)',
              marginTop: 6,
              alignItems: 'baseline'
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700 }}>{isSw ? 'Jumla Kuu' : 'Total'}</span>
            <b style={{ fontSize: 24, fontWeight: 800, color: '#15803D' }}>{fmt(finalTotal)}</b>
          </div>
        </div>

        {/* Payment Method Selector (Image 1 style) */}
        <div style={{ marginTop: 10 }}>
          <small style={{ color: 'var(--mut)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}>
            {isSw ? 'Njia ya Malipo' : 'Payment Method'}
          </small>
          <div className="pos-pay-methods">
            <button
              type="button"
              className={`pos-pay-card ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              <span style={{ fontSize: 22 }}>💵</span>
              <span>{isSw ? 'Taslimu (Cash)' : 'Cash'}</span>
            </button>
            <button
              type="button"
              className={`pos-pay-card ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              <span style={{ fontSize: 22 }}>💳</span>
              <span>{isSw ? 'Kadi ya Benki' : 'Debit Card'}</span>
            </button>
            <button
              type="button"
              className={`pos-pay-card ${paymentMethod === 'ewallet' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('ewallet')}
            >
              <span style={{ fontSize: 22 }}>📱</span>
              <span>{isSw ? 'Pesa ya Simu' : 'E-Wallet'}</span>
            </button>
          </div>
        </div>

        {/* Continue to Payment / Checkout CTA */}
        <button
          className="btn o"
          style={{
            background: '#FF5A43',
            fontSize: 15,
            fontWeight: 800,
            padding: '14px',
            borderRadius: 14,
            boxShadow: '0 4px 16px rgba(255,90,67,0.35)'
          }}
          disabled={!cart.length || isCheckingOut}
          onClick={handlePosCheckout}
        >
          {isCheckingOut ? (isSw ? 'Inachakata Oda...' : 'Processing Order...') : (isSw ? `Endelea na Malipo · ${fmt(finalTotal)}` : `Continue to Payment · ${fmt(finalTotal)}`)}
        </button>
      </div>
      )}

      {/* Item Details Sheet */}
      {d && (
        <Sheet onClose={() => setD(null)}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <img
              src={d.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'}
              alt={getMenuName ? getMenuName(d) : d.n}
              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 16, marginBottom: 12 }}
            />
            <h3 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 800 }}>{getMenuName ? getMenuName(d) : d.n}</h3>
            <p style={{ color: 'var(--mut)', margin: 0, fontSize: 14 }}>{getMenuDesc ? getMenuDesc(d) : d.d}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '14px 0' }}>
            <span className="chip" style={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--tx)' }}>★ {d.r} {isSw ? 'Kiwango' : 'Rating'}</span>
            <span className="chip" style={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--tx)' }}>⏱️ {d.t} {isSw ? 'dak' : 'mins'}</span>
            <span className="chip" style={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--tx)' }}>🔥 {isSw ? 'Sehemu' : 'Station'}: {d.station}</span>
          </div>

          {d.allergens && d.allergens.length > 0 && (
            <div style={{ marginBottom: 14, textAlign: 'center' }}>
              <small style={{ color: '#FF5A43', fontWeight: 600 }}>{isSw ? `⚠️ Tahadhari ya mzio: ${d.allergens.join(', ')}` : `⚠️ Contains allergens: ${d.allergens.join(', ')}`}</small>
            </div>
          )}

          <div style={{ margin: '12px 0' }}>
            <small style={{ fontWeight: 700 }}>{isSw ? 'Maelezo Maalum kwa Jikoni:' : 'Kitchen Preparation Notes:'}</small>
            <input
              className="inp"
              placeholder={isSw ? 'Mfano: Pilipili nyingi, mchuzi pembeni, bila kitunguu...' : 'e.g. Extra spicy, sauce on the side, no onion'}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="row" style={{ margin: '16px 0 20px' }}>
            <div className="step">
              <button onClick={() => setN(Math.max(1, n - 1))}>−</button>
              <b style={{ fontSize: 16 }}>{n}</b>
              <button onClick={() => setN(n + 1)}>+</button>
            </div>
            <b style={{ fontSize: 22, color: '#15803D' }}>{fmt(d.p * n)}</b>
          </div>

          <button
            className="btn o"
            style={{ background: '#FF5A43' }}
            disabled={outOfStockIds.includes(d.id)}
            onClick={() => {
              add(d.id, n, note);
              setD(null);
            }}
          >
            {outOfStockIds.includes(d.id) ? (isSw ? 'Imeisha Jikoni' : 'Sold Out in Kitchen') : (isSw ? `Weka ${n} kwenye Oda · ${fmt(d.p * n)}` : `Add ${n} to Ticket · ${fmt(d.p * n)}`)}
          </button>
        </Sheet>
      )}

      {/* Right Slide Drawer for Table Selection & Availability (POS Cashier only) */}
      {isPosMode && (
        <TableSlideSelector
          isOpen={showSlideSelector}
          onClose={() => setShowSlideSelector(false)}
          selectedTable={tableNo}
          onSelectTable={(t, cap) => {
            setTableNo(t);
            if (t === 'Takeaway') setOrderType('takeaway');
            else if (t === 'Online') setOrderType('online');
            else setOrderType('dine_in');
            if (cap > 0) setTableCount(Math.min(tableCount, cap) || cap);
          }}
          guestCount={tableCount}
          onChangeGuests={setTableCount}
          orderType={orderType}
          onChangeOrderType={setOrderType}
        />
      )}

      {/* Quick Add Menu Item Modal (<10s on-site setup) */}
      <QuickAddMenuItemModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSave={item => A.quickAddMenuItem(item, sess?.name || 'POS Staff')}
        actor={sess?.name || 'POS Staff'}
      />

      {/* Detailed Menu Item Modal (Finished Good Image Upload & Full Fields) */}
      <MenuItemDetailModal
        isOpen={detailedModalOpen}
        onClose={() => setDetailedModalOpen(false)}
        stockList={S.stock || []}
        actor={sess?.name || 'POS Staff'}
        onSave={(data) => {
          A.createMenuItem(data, sess?.name || 'POS Staff');
        }}
      />
    </div>
  );
}

export function CartBar({ cart, open }) {
  const { S, lang } = useContext(Ctx);
  const isSw = lang === 'sw';
  const n = cart.reduce((a, l) => a + l.q, 0);
  if (!n) return null;
  const menuMap = S?.menu ? Object.fromEntries(S.menu.map(m => [m.id, m])) : {};
  const total = cart.reduce((a, l) => a + (menuMap[l.id]?.p || M[l.id]?.p || 0) * l.q, 0);

  return (
    <div className="cbar">
      <button
        type="button"
        className="btn o"
        style={{
          background: 'linear-gradient(135deg, #FF6B2C, #E55A1F)',
          boxShadow: '0 8px 24px rgba(255,107,44,0.45)',
          borderRadius: 16,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          transition: 'transform 0.15s ease'
        }}
        onClick={open}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🛒</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', lineHeight: 1.2 }}>
              {isSw ? 'Tazama Oda' : 'View Ticket'} ({n} {isSw ? (n === 1 ? 'kitu' : 'vitu') : (n === 1 ? 'item' : 'items')})
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)' }}>
              {isSw ? 'Bonyeza kuthibitisha na kuagiza' : 'Tap to review & place order'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <b style={{ fontSize: 16, color: '#fff' }}>{fmt(total)}</b>
          <span style={{ background: 'rgba(255,255,255,0.25)', padding: '5px 10px', borderRadius: 99, fontSize: 12, fontWeight: 800, color: '#fff' }}>
            {isSw ? 'Endelea ➔' : 'Next ➔'}
          </span>
        </div>
      </button>
    </div>
  );
}

export function Checkout({ cart, setCart, mode, via, tb0, close, onPlaced, sess }) {
  const { S, A, wn, lang, getMenuName } = useContext(Ctx);
  const isSw = lang === 'sw';
  const [tb, setTb] = useState(tb0 || 'T1');
  const [wid, setWid] = useState('');
  const [pm, setPm] = useState('momo');
  const [momoProvider, setMomoProvider] = useState('mpesa');
  const [momoPhone, setMomoPhone] = useState(sess?.ph || '0712000111');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const menuMap = useMemo(() => ({
    ...M,
    ...Object.fromEntries((S?.menu || []).map(m => [m.id, m]))
  }), [S?.menu]);

  const vatSettings = S?.vatSettings || { enabled: true, rate: 18, inclusive: true, taxLabel: 'VAT 18%' };
  const isVatOn = vatSettings.enabled !== false;
  const subTotal = cart.reduce((a, l) => a + (menuMap[l.id]?.p || M[l.id]?.p || 0) * l.q, 0);
  const discount = Math.round(subTotal * 0.20);
  const payableBase = Math.max(0, subTotal - discount);
  const tax = isVatOn ? calcTax(payableBase, vatSettings) : 0;
  const total = isVatOn && vatSettings.inclusive === false
    ? payableBase + tax
    : payableBase;

  const chg = (idx, delta) => {
    setCart(prev => {
      const copy = [...prev];
      copy[idx].q += delta;
      return copy.filter(l => l.q > 0);
    });
  };

  const linkWid = via && via.wid;

  const place = () => {
    setIsSubmitting(true);
    const assignedW = linkWid || wid || TW[tb] || (mode === 'waiter' ? sess.wid : '') || 'w1';
    const isOnline = mode === 'customer' && (!tb || tb === 'Takeaway' || tb === 'Online');
    const src = mode === 'waiter' ? 'WALKIN_WAITER' : mode === 'cashier' ? 'CASHIER' : linkWid ? 'WAITER_LINK' : via && via.qr ? 'TABLE_QR' : 'ONLINE_ORDER';

    A.place({
      src,
      orderType: isOnline ? (isSw ? 'Oda ya Mtandaoni' : 'Online Order') : tb === 'Takeaway' ? (isSw ? 'Pakiti' : 'Takeaway') : (isSw ? 'Kula Hapa' : 'Dine In'),
      tb: tb || (isSw ? 'Oda ya Mtandaoni' : 'Online Order'),
      wid: mode === 'waiter' ? sess.wid : assignedW,
      it: cart,
      pm: mode === 'customer' ? pm : 'cashier',
      momoDetails: pm === 'momo' ? { provider: momoProvider, phone: momoPhone } : null,
      cust: sess?.id || 'guest_' + Date.now(),
      by: sess?.name || (mode === 'waiter' ? wn(sess.wid) : (isSw ? 'Mteja wa Mtandaoni' : 'Online Customer')),
      online: isOnline,
      discountPct: 20
    }, sess?.name || (isSw ? 'Mteja' : 'Customer'));

    setTimeout(() => {
      setCart([]);
      setIsSubmitting(false);
      onPlaced();
    }, 300);
  };

  return (
    <Sheet title={isSw ? 'Hakiki na Uagize' : 'Review & Place Order'} onClose={close}>
      {/* Table Selection with TableMap */}
      <div className="card" style={{ marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 8px' }}>
          {isSw ? 'Chagua Meza ya Kula au Sehemu ya Kuchukua:' : 'Select Dining Table or Takeaway:'}
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {TABLES.map(t => (
            <button
              key={t}
              type="button"
              className={`action-btn ${tb === t ? 'settle' : ''}`}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: tb === t ? 800 : 600,
                background: tb === t ? '#15803D' : 'var(--card)',
                color: tb === t ? '#fff' : 'var(--tx)'
              }}
              onClick={() => setTb(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <TableMap val={tb} set={setTb} />
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        {cart.map((l, idx) => {
          const rawItem = menuMap[l.id] || M[l.id] || { n: `Item #${l.id}`, p: 0, img: '' };
          const itemTitle = getMenuName ? getMenuName(rawItem) : rawItem.n;
          return (
            <div key={idx} className="row" style={{ padding: '8px 0', borderBottom: idx < cart.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <img
                  src={rawItem?.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80'}
                  alt={itemTitle}
                  style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }}
                />
                <div>
                  <b>{itemTitle}</b>
                  <br />
                  <small>{fmt(rawItem?.p)} {isSw ? 'kila moja' : 'each'}</small>
                  {l.note && <div style={{ fontSize: 12, color: '#FF5A43' }}>{isSw ? 'Maelezo' : 'Note'}: {l.note}</div>}
                </div>
              </div>
              <div className="step">
                <button type="button" onClick={() => chg(idx, -1)}>−</button>
                <b>{l.q}</b>
                <button type="button" onClick={() => chg(idx, 1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row" style={{ fontSize: 13, color: 'var(--mut)', padding: '2px 0' }}>
          <span>{isSw ? 'Jumla Ndogo' : 'Sub Total'}</span>
          <span>{fmt(subTotal)}</span>
        </div>
        {isVatOn && (
          <div className="row" style={{ fontSize: 13, color: 'var(--mut)', padding: '2px 0' }}>
            <span>{vatSettings.taxLabel || `VAT (${vatSettings.rate || 18}%)`}</span>
            <span>{fmt(tax)}</span>
          </div>
        )}
        <div className="row" style={{ fontSize: 13, color: '#FF3B30', padding: '2px 0' }}>
          <span>{isSw ? 'Punguzo Maalum 20%' : 'Special Offer Discount 20%'}</span>
          <span>-{fmt(discount)}</span>
        </div>
        <div className="row" style={{ borderTop: '1px dashed var(--line)', paddingTop: 8, marginTop: 6 }}>
          <b>{isSw ? 'Jumla ya Kulipa:' : 'Payable Total:'}</b>
          <b style={{ fontSize: 22, color: '#15803D' }}>{fmt(total)}</b>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn o"
          style={{ background: '#FF5A43', flex: 2 }}
          disabled={!cart.length || isSubmitting}
          onClick={place}
        >
          {isSubmitting ? (isSw ? 'Inatuma Jikoni...' : 'Transmitting to Kitchen…') : (isSw ? `Thibitisha na Tuma Jikoni · ${fmt(total)}` : `Confirm & Send to Kitchen · ${fmt(total)}`)}
        </button>
        <button className="btn ghost" style={{ flex: 1 }} onClick={close}>
          {isSw ? 'Ghairi' : 'Cancel'}
        </button>
      </div>
    </Sheet>
  );
}
