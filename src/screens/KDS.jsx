import React, { useState, useContext, useEffect, useMemo } from 'react';
import { M, fmtTime, fmt, USERS } from '../data';
import { Ctx } from '../store';
import { Sheet, LanguageToggle } from '../components/ui';

export function KDS({ sess, out, setSess, setV }) {
  const { S, A, lang, getMenuName } = useContext(Ctx);
  const isSw = (lang || 'sw') === 'sw';

  // View Mode: 'board' (3-Column Kanban matching reference image) vs 'list'
  const [viewMode, setViewMode] = useState('board');

  // Station Filter: 'all', 'grill', 'fryer', 'cold', 'bar', 'chinese', 'pizza'
  const [stationFilter, setStationFilter] = useState('all');

  // Audio Alerts Toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live Auto-Sync Countdown (matches "Sync (8s)" in reference image)
  const [syncCountdown, setSyncCountdown] = useState(10);

  // Modals
  const [showServedModal, setShowServedModal] = useState(false);
  const [reprintOrder, setReprintOrder] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(null);

  // History Filter State covering ALL statuses from new to served, paid, and cancelled
  const [historyStatusTab, setHistoryStatusTab] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyChannel, setHistoryChannel] = useState('ALL');
  const [historySort, setHistorySort] = useState('recent');

  // List View Stage Filter
  const [listStageFilter, setListStageFilter] = useState('all');

  // Selected ticket for highlight
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Live Clock (matches "11:24 AM" in reference image)
  const [currentTimeStr, setCurrentTimeStr] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  });

  useEffect(() => {
    const clockTimer = setInterval(() => {
      const d = new Date();
      setCurrentTimeStr(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }));
    }, 1000);

    const syncTimer = setInterval(() => {
      setSyncCountdown(prev => (prev <= 1 ? 10 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(syncTimer);
    };
  }, []);

  // Web Audio Chimes
  const playKitchenChime = (type = 'chime') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'chime') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      } else if (type === 'done') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // Audio unsupported or blocked
    }
  };

  const orders = S.orders || [];

  // Station mapping helper
  const getDishStation = (item) => {
    if (!item) return isSw ? 'Jiko Kuu' : 'Main Kitchen';
    if (item.station) return item.station;
    const cat = (item.c || '').toLowerCase();
    if (cat.includes('drink') || cat.includes('bar')) return isSw ? 'Baa & Vinywaji' : 'Bar & Drinks';
    if (cat.includes('salad') || cat.includes('cold')) return isSw ? 'Saladi & Baridi' : 'Cold & Salad';
    if (cat.includes('pizza') || cat.includes('oven')) return isSw ? 'Piza & Tanuri' : 'Pizza & Oven';
    if (cat.includes('fry') || cat.includes('side')) return isSw ? 'Kaango' : 'Fryer';
    if (cat.includes('chinese') || cat.includes('noodle')) return isSw ? 'Tambi / Kichina' : 'Chinese';
    return isSw ? 'Jiko Kuu' : 'Main Kitchen';
  };

  // Base filter for stations
  const filterByStation = (o) => {
    if (stationFilter === 'all') return true;
    return (o.it || []).some(line => {
      const item = M[line.id];
      const station = getDishStation(item).toLowerCase();
      return station.includes(stationFilter.toLowerCase());
    });
  };

  // 1. PENDING (Placed or Accepted orders)
  const pendingOrders = useMemo(() => {
    return orders
      .filter(o => ['placed', 'accepted'].includes(o.st) && filterByStation(o))
      .sort((a, b) => (a.t || 0) - (b.t || 0));
  }, [orders, stationFilter]);

  // 2. PREPARING (In cooking orders)
  const preparingOrders = useMemo(() => {
    return orders
      .filter(o => o.st === 'preparing' && filterByStation(o))
      .sort((a, b) => (a.t || 0) - (b.t || 0));
  }, [orders, stationFilter]);

  // 3. READY (Ready at pass)
  const readyOrders = useMemo(() => {
    return orders
      .filter(o => o.st === 'ready' && filterByStation(o))
      .sort((a, b) => (a.t || 0) - (b.t || 0));
  }, [orders, stationFilter]);

  // 4. SERVED (Historical for modal)
  const servedOrders = useMemo(() => {
    return orders
      .filter(o => ['served', 'paid', 'closed'].includes(o.st) && filterByStation(o))
      .sort((a, b) => (b.t || 0) - (a.t || 0));
  }, [orders, stationFilter]);

  // Comprehensive Counts across ALL statuses
  const countsByStatus = useMemo(() => {
    return {
      all: orders.length,
      placed: orders.filter(o => o.st === 'placed').length,
      accepted: orders.filter(o => o.st === 'accepted').length,
      preparing: orders.filter(o => o.st === 'preparing').length,
      ready: orders.filter(o => o.st === 'ready').length,
      served: orders.filter(o => o.st === 'served').length,
      billreq: orders.filter(o => o.st === 'billreq').length,
      paid: orders.filter(o => o.st === 'paid').length,
      closed: orders.filter(o => o.st === 'closed').length,
      cancelled: orders.filter(o => o.st === 'cancelled').length,
    };
  }, [orders]);

  // Comprehensive History Orders Filtered across all statuses
  const filteredHistoryOrders = useMemo(() => {
    let list = [...orders];

    // Status filter
    if (historyStatusTab !== 'all') {
      if (historyStatusTab === 'new') {
        list = list.filter(o => o.st === 'placed');
      } else {
        list = list.filter(o => o.st === historyStatusTab);
      }
    }

    // Channel filter
    if (historyChannel !== 'ALL') {
      const target = historyChannel.toLowerCase();
      list = list.filter(o => {
        const type = (o.orderType || '').toLowerCase();
        if (target === 'dine in') return type.includes('dine') || type.includes('table');
        if (target === 'takeaway') return type.includes('take') || type.includes('ta');
        if (target === 'pickup') return type.includes('pickup');
        if (target === 'delivery') return type.includes('delivery');
        return true;
      });
    }

    // Text search
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter(o => {
        const orderNum = String(o.no || o.id).toLowerCase();
        const tb = (o.tb || '').toLowerCase();
        const by = (o.by || '').toLowerCase();
        const cust = (o.cust || '').toLowerCase();
        const items = (o.it || []).map(i => (M[i.id]?.n || '').toLowerCase()).join(' ');
        return orderNum.includes(q) || tb.includes(q) || by.includes(q) || cust.includes(q) || items.includes(q);
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (historySort === 'oldest') return (a.t || 0) - (b.t || 0);
      if (historySort === 'value') {
        const valA = (a.it || []).reduce((acc, l) => acc + (M[l.id]?.p || 0) * l.q, 0);
        const valB = (b.it || []).reduce((acc, l) => acc + (M[l.id]?.p || 0) * l.q, 0);
        return valB - valA;
      }
      if (historySort === 'prep') {
        const prepA = a.elapsedMins || Math.round((Date.now() - (a.t || 0)) / 60000);
        const prepB = b.elapsedMins || Math.round((Date.now() - (b.t || 0)) / 60000);
        return prepB - prepA;
      }
      return (b.t || 0) - (a.t || 0);
    });

    return list;
  }, [orders, historyStatusTab, historyChannel, historySearch, historySort]);

  // Actions
  const handleStart = (orderId) => {
    playKitchenChime('chime');
    A.st(orderId, 'preparing', sess?.name || 'Station Cook');
    setSelectedOrderId(orderId);
  };

  const handleReady = (orderId) => {
    playKitchenChime('done');
    if (A.doneAllOrder) A.doneAllOrder(orderId, sess?.name || 'Station Cook');
    else A.st(orderId, 'ready', sess?.name || 'Station Cook');
    setSelectedOrderId(orderId);
  };

  const handleServe = (orderId) => {
    playKitchenChime('done');
    A.st(orderId, 'served', sess?.name || 'Station Cook');
  };

  const handleRecall = (orderId) => {
    playKitchenChime('chime');
    if (A.reopenOrder) A.reopenOrder(orderId, sess?.name || 'Station Cook');
    else A.st(orderId, 'preparing', sess?.name || 'Station Cook');
    setSelectedOrderId(orderId);
  };

  const handleToggleItem = (orderId, idx) => {
    playKitchenChime('chime');
    if (A.toggleOrderItemDone) {
      A.toggleOrderItemDone(orderId, idx, sess?.name || 'Station Cook');
    }
  };

  // ── Active Orders across visible kitchen lanes ──
  const activeOrders = useMemo(() => {
    return [...pendingOrders, ...preparingOrders, ...readyOrders];
  }, [pendingOrders, preparingOrders, readyOrders]);

  // Selected Order for Bump Bar
  const effectiveSelectedOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = orders.find(o => o.id === selectedOrderId);
      if (found && ['placed', 'accepted', 'preparing', 'ready'].includes(found.st)) return found;
    }
    return activeOrders[0] || null;
  }, [selectedOrderId, orders, activeOrders]);

  // ── BUMP BAR ACTION HANDLERS (Matches Hardware Bump Bar) ──
  const handleBump = () => {
    if (!effectiveSelectedOrder) return;
    const { id, st } = effectiveSelectedOrder;
    if (['placed', 'accepted'].includes(st)) {
      handleStart(id);
    } else if (st === 'preparing') {
      handleReady(id);
    } else if (st === 'ready') {
      handleServe(id);
      // Auto advance to next active order
      const remaining = activeOrders.filter(o => o.id !== id);
      if (remaining.length > 0) setSelectedOrderId(remaining[0].id);
      else setSelectedOrderId(null);
    }
  };

  const handleCookSelected = () => {
    if (effectiveSelectedOrder) handleStart(effectiveSelectedOrder.id);
  };

  const handleReadySelected = () => {
    if (effectiveSelectedOrder) handleReady(effectiveSelectedOrder.id);
  };

  const handleServeSelected = () => {
    if (effectiveSelectedOrder) {
      handleServe(effectiveSelectedOrder.id);
      const remaining = activeOrders.filter(o => o.id !== effectiveSelectedOrder.id);
      if (remaining.length > 0) setSelectedOrderId(remaining[0].id);
      else setSelectedOrderId(null);
    }
  };

  const handleLeft = () => {
    if (!activeOrders.length) return;
    const curIdx = activeOrders.findIndex(o => o.id === effectiveSelectedOrder?.id);
    const prevIdx = curIdx <= 0 ? activeOrders.length - 1 : curIdx - 1;
    setSelectedOrderId(activeOrders[prevIdx].id);
    playKitchenChime('chime');
  };

  const handleRight = () => {
    if (!activeOrders.length) return;
    const curIdx = activeOrders.findIndex(o => o.id === effectiveSelectedOrder?.id);
    const nextIdx = curIdx >= activeOrders.length - 1 ? 0 : curIdx + 1;
    setSelectedOrderId(activeOrders[nextIdx].id);
    playKitchenChime('chime');
  };

  const handleRecallLatest = () => {
    const latestServed = orders
      .filter(o => ['served', 'closed'].includes(o.st))
      .sort((a, b) => (b.t || 0) - (a.t || 0))[0];
    if (latestServed) {
      handleRecall(latestServed.id);
    }
  };

  const handlePrintSelected = () => {
    if (effectiveSelectedOrder) setReprintOrder(effectiveSelectedOrder);
  };

  const handleInfoSelected = () => {
    if (effectiveSelectedOrder) setShowInfoModal(effectiveSelectedOrder);
  };

  // Keyboard Shortcuts for Bump Bar
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleBump();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleLeft();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleRight();
      } else if (e.key === 'c' || e.key === 'C') {
        handleCookSelected();
      } else if (e.key === 'r' || e.key === 'R') {
        handleReadySelected();
      } else if (e.key === 's' || e.key === 'S') {
        handleServeSelected();
      } else if (e.key === 'p' || e.key === 'P') {
        handlePrintSelected();
      } else if (e.key === 'i' || e.key === 'I') {
        handleInfoSelected();
      } else if (e.key === 'm' || e.key === 'M') {
        setSoundEnabled(prev => !prev);
      } else if (e.key === 'u' || e.key === 'U') {
        handleRecallLatest();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [effectiveSelectedOrder, activeOrders, soundEnabled]);

  // Expediter Aggregates across active cooking tickets for Summary Modal
  const summaryAggregates = useMemo(() => {
    const map = {};
    activeOrders.forEach(o => {
      (o.it || []).forEach(l => {
        const dish = M[l.id] || { n: `Item #${l.id}` };
        if (!map[l.id]) {
          map[l.id] = { id: l.id, name: dish.n, total: 0, pending: 0, preparing: 0, ready: 0 };
        }
        map[l.id].total += (l.q || 1);
        if (['placed', 'accepted'].includes(o.st)) map[l.id].pending += (l.q || 1);
        else if (o.st === 'preparing') map[l.id].preparing += (l.q || 1);
        else if (o.st === 'ready') map[l.id].ready += (l.q || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [activeOrders]);



  // Format Elapsed Time Badge
  const getElapsedBadge = (order) => {
    const mins = order.elapsedMins !== undefined
      ? order.elapsedMins
      : Math.max(0, Math.round((Date.now() - (order.t || Date.now())) / 60000));

    if (mins <= 2) {
      return { text: isSw ? 'Sasa hivi' : 'Just now', cls: 'green' };
    }
    if (mins > 15) {
      return { text: isSw ? `Dakika ${mins} zilizopita` : `${mins} min ago`, cls: 'red' };
    }
    return { text: isSw ? `Dakika ${mins} zilizopita` : `${mins} min ago`, cls: 'orange' };
  };

  // Format KOT Code
  const getKotCode = (order, index = 0) => {
    const baseId = order.no ? String(order.no).replace('#', '') : String(order.id).slice(-6);
    return `KOT-${baseId.padStart(6, '1')}-${(index % 2) + 1}`;
  };

  // Format Order & Table subtitle
  const getOrderSubtitle = (order) => {
    const num = order.no ? String(order.no).replace('#', '').padStart(6, '0') : String(order.id).slice(-4).padStart(6, '0');
    const tb = order.tb ? ` · ${order.tb}` : '';
    return `${isSw ? 'Oda' : 'Order'} ${num}${tb}`;
  };

  // Status visual label & class helper
  const getStatusBadgeInfo = (st) => {
    switch (st) {
      case 'placed':
        return { label: isSw ? '🟡 Mpya / Imepokelewa' : '🟡 New / Placed', cls: 'placed' };
      case 'accepted':
        return { label: isSw ? '✓ Imethibitishwa' : '✓ Accepted', cls: 'accepted' };
      case 'preparing':
        return { label: isSw ? '🔥 Inapikwa' : '🔥 Cooking', cls: 'preparing' };
      case 'ready':
        return { label: isSw ? '🟢 Iko Tayari' : '🟢 Ready at Pass', cls: 'ready' };
      case 'served':
        return { label: isSw ? '🍽️ Imehudumiwa Mezani' : '🍽️ Served to Table', cls: 'served' };
      case 'billreq':
        return { label: isSw ? '📄 Bili Inaombwa' : '📄 Bill Requested', cls: 'billreq' };
      case 'paid':
        return { label: isSw ? '💰 Imelipwa Kamili' : '💰 Paid & Settled', cls: 'paid' };
      case 'closed':
        return { label: isSw ? '📁 Imefungwa' : '📁 Closed / Archived', cls: 'closed' };
      case 'cancelled':
        return { label: isSw ? '✕ Imeghairiwa' : '✕ Cancelled / Void', cls: 'cancelled' };
      default:
        return { label: (st || '').toUpperCase(), cls: 'closed' };
    }
  };

  // Render a Single Ticket Card
  const renderCard = (order, lane, index) => {
    const kotCode = getKotCode(order, index);
    const orderSub = getOrderSubtitle(order);
    const timeBadge = getElapsedBadge(order);
    const isSelected = order.id === (effectiveSelectedOrder?.id);

    // Primary station for this order
    const firstDish = (order.it && order.it[0]) ? M[order.it[0].id] : null;
    const stationLabel = firstDish ? getDishStation(firstDish) : (isSw ? 'Jiko Kuu' : 'Main Kitchen');

    return (
      <div
        key={order.id}
        className={`fcx-card ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedOrderId(order.id)}
      >
        {/* Card Top Row */}
        <div className="fcx-card-head">
          <div>
            <div className="fcx-card-kot-no">{kotCode}</div>
            <div className="fcx-card-order-sub">{orderSub}</div>
          </div>
          <span className={`fcx-time-badge ${timeBadge.cls}`}>
            {timeBadge.text}
          </span>
        </div>

        {/* Note if available */}
        {order.note && (
          <div className="fcx-card-note">
            ⚠️ {order.note}
          </div>
        )}

        {/* Item Rows matching photo: "2 x Paneer Maggie" */}
        <div className="fcx-card-items">
          {(order.it || []).map((line, idx) => {
            const item = M[line.id] || { n: `Item #${line.id}` };
            const isDone = line.done;

            return (
              <div
                key={idx}
                className="fcx-card-item-row"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleItem(order.id, idx);
                }}
                title="Click to strike-through item"
              >
                <span className={`fcx-card-item-name ${isDone ? 'done' : ''}`}>
                  {line.q} x {getMenuName ? getMenuName(item) : item.n}
                  {line.sub && <small style={{ color: '#64748B', marginLeft: 4 }}>({line.sub})</small>}
                </span>
                {isDone && <span style={{ color: '#16A34A', fontSize: 11, fontWeight: 800 }}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Card Footer Actions Row */}
        <div className="fcx-card-actions">
          <div className="fcx-action-btn-group">
            {/* PENDING -> Start button */}
            {lane === 'pending' && (
              <button
                className="fcx-btn-start"
                onClick={(e) => { e.stopPropagation(); handleStart(order.id); }}
                title={isSw ? 'Anza kupika tiketi' : 'Start cooking ticket'}
              >
                <span>▶</span>
                <span>{isSw ? 'Anza' : 'Start'}</span>
              </button>
            )}

            {/* PREPARING -> Ready button */}
            {lane === 'preparing' && (
              <button
                className="fcx-btn-ready"
                onClick={(e) => { e.stopPropagation(); handleReady(order.id); }}
                title={isSw ? 'Weka tiketi tayari' : 'Mark ticket ready at pass'}
              >
                <span>✓</span>
                <span>{isSw ? 'Tayari' : 'Ready'}</span>
              </button>
            )}

            {/* READY -> Serve button */}
            {lane === 'ready' && (
              <button
                className="fcx-btn-serve"
                onClick={(e) => { e.stopPropagation(); handleServe(order.id); }}
                title={isSw ? 'Weka imehudumiwa mezani' : 'Mark ticket served to diner'}
              >
                <span>✓</span>
                <span>{isSw ? 'Hudumia' : 'Serve'}</span>
              </button>
            )}

            {/* Reprint button */}
            <button
              className="fcx-btn-reprint"
              onClick={(e) => { e.stopPropagation(); setReprintOrder(order); }}
              title={isSw ? 'Chapisha tena tiketi ya jikoni' : 'Reprint kitchen ticket slip'}
            >
              <span>🖨️</span>
              <span>{isSw ? 'Chapisha' : 'Reprint'}</span>
            </button>
          </div>

          {/* Station tag matching photo: "✂ Main Kitchen" or "✂ Chinese" */}
          <div className="fcx-station-label">
            <span>✂</span>
            <span>{stationLabel}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fcx-kds-root">
      
      {/* ── TOP HEADER (Single bar, clean, zero redundant navs) ── */}
      <header className="fcx-kds-header">
        
        {/* Left: Brand & Station Filter */}
        <div className="fcx-header-left">
          <div className="fcx-brand-badge" onClick={() => setShowRoleModal(true)} title="Safari Grill KDS">
            <div className="fcx-brand-icon">🍳</div>
            <div className="fcx-brand-title">
              Safari<span>Grill</span>
            </div>
          </div>

          {/* Single Station Dropdown */}
          <select
            className="fcx-station-dropdown"
            value={stationFilter}
            onChange={e => setStationFilter(e.target.value)}
          >
            <option value="all">🍴 {isSw ? 'Sehemu Zote za Jiko ▾' : 'All Stations ▾'}</option>
            <option value="grill">🥩 {isSw ? 'Jiko Kuu (Choma / Grill)' : 'Main Kitchen (Grill)'}</option>
            <option value="fryer">🍟 {isSw ? 'Kaango & Vyakula vya Pembeni' : 'Fryers & Sides'}</option>
            <option value="cold">🥗 {isSw ? 'Saladi & Baridi' : 'Cold & Salads'}</option>
            <option value="bar">🍹 {isSw ? 'Baa & Vinywaji' : 'Bar & Drinks'}</option>
            <option value="chinese">🍜 {isSw ? 'Tambi / Kichina' : 'Chinese / Noodles'}</option>
            <option value="pizza">🍕 {isSw ? 'Piza & Tanuri' : 'Pizza & Oven'}</option>
          </select>
        </div>

        {/* Center: Segmented View Switcher: [Board] [List] */}
        <div className="fcx-view-toggle">
          <button
            className={`fcx-toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
            onClick={() => setViewMode('board')}
          >
            {isSw ? 'Ubao' : 'Board'}
          </button>
          <button
            className={`fcx-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            {isSw ? 'Orodha' : 'List'}
          </button>
        </div>

        {/* Right: Sync countdown, Mute, Order History, Live Clock */}
        <div className="fcx-header-right">
          <LanguageToggle isLight={true} />
          {/* Sync countdown button */}
          <div
            className="fcx-sync-badge"
            onClick={() => setSyncCountdown(10)}
            title={isSw ? 'Bonyeza kusasisha sasa' : 'Click to force sync now'}
          >
            <span>↻</span>
            <span>{isSw ? 'Sasisha' : 'Sync'} ({syncCountdown}s)</span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            className="fcx-mute-btn"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playKitchenChime('chime');
            }}
            title={soundEnabled ? (isSw ? 'Zima sauti' : 'Click to Mute Audio') : (isSw ? 'Washa sauti' : 'Click to Enable Audio')}
          >
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <span>{soundEnabled ? (isSw ? 'Zima Sauti' : 'Mute') : (isSw ? 'Washa Sauti' : 'Unmuted')}</span>
          </button>

          {/* Served & All-Status Order History Button */}
          <button
            className="fcx-served-history-btn"
            onClick={() => setShowServedModal(true)}
            title={isSw ? 'Tazama historia yote ya oda' : 'View full order history and all statuses'}
          >
            <span>🕒</span>
            <span>{isSw ? 'Historia ya Oda' : 'Order History'}</span>
            <span className="fcx-served-count">{orders.length}</span>
          </button>

          {/* Live Clock */}
          <div className="fcx-clock">
            {currentTimeStr}
          </div>

          {/* Exit / Switch button */}
          <button
            className="fcx-exit-btn"
            onClick={() => setShowRoleModal(true)}
            title={isSw ? 'Badili Jukumu / Tawi' : 'Switch Workspace / Role'}
          >
            🔄
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      {viewMode === 'board' ? (
        /* 3-Column Board */
        <main className="fcx-board-container">
          
          {/* 1. PENDING COLUMN */}
          <div className="fcx-column">
            <div className="fcx-col-header">
              <div className="fcx-col-title-group">
                <span className="fcx-col-title">{isSw ? 'ZINAZOSUBIRI' : 'PENDING'}</span>
                <span className="fcx-col-badge pending">{pendingOrders.length}</span>
              </div>
            </div>

            <div className="fcx-col-cards-scroll">
              {pendingOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 16px', color: '#64748B' }}>
                  <b style={{ color: '#94A3B8', fontSize: 14 }}>{isSw ? 'Hakuna Tiketi Zinazosubiri' : 'No Pending Tickets'}</b>
                  <p style={{ fontSize: 12, margin: '4px 0' }}>{isSw ? 'Oda mpya zinazoingia zitaonekana hapa' : 'New incoming orders will appear here'}</p>
                </div>
              ) : (
                pendingOrders.map((o, idx) => renderCard(o, 'pending', idx))
              )}
            </div>
          </div>

          {/* 2. PREPARING COLUMN */}
          <div className="fcx-column">
            <div className="fcx-col-header">
              <div className="fcx-col-title-group">
                <span className="fcx-col-title">{isSw ? 'ZINAPIKWA' : 'PREPARING'}</span>
                <span className="fcx-col-badge preparing">{preparingOrders.length}</span>
              </div>
            </div>

            <div className="fcx-col-cards-scroll">
              {preparingOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 16px', color: '#64748B' }}>
                  <b style={{ color: '#94A3B8', fontSize: 14 }}>{isSw ? 'Hakuna Zinazopikwa Sasa' : 'No Tickets Cooking'}</b>
                  <p style={{ fontSize: 12, margin: '4px 0' }}>{isSw ? 'Bonyeza Anza kwenye oda inayohitaji kupikwa' : 'Tap Start on a pending order to cook'}</p>
                </div>
              ) : (
                preparingOrders.map((o, idx) => renderCard(o, 'preparing', idx))
              )}
            </div>
          </div>

          {/* 3. READY COLUMN */}
          <div className="fcx-column">
            <div className="fcx-col-header">
              <div className="fcx-col-title-group">
                <span className="fcx-col-title">{isSw ? 'ZIKO TAYARI' : 'READY'}</span>
                <span className="fcx-col-badge ready">{readyOrders.length}</span>
              </div>
            </div>

            <div className="fcx-col-cards-scroll">
              {readyOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 16px', color: '#64748B' }}>
                  <b style={{ color: '#94A3B8', fontSize: 14 }}>{isSw ? 'Kaunta ya Kutolea Iko Wazi' : 'Pass is Clear'}</b>
                  <p style={{ fontSize: 12, margin: '4px 0' }}>{isSw ? 'Vyakula vilivyoiva tayari kwa mezani vitaonekana hapa' : 'Plated dishes ready for service appear here'}</p>
                </div>
              ) : (
                readyOrders.map((o, idx) => renderCard(o, 'ready', idx))
              )}
            </div>
          </div>

        </main>
      ) : (
        /* Alternative Clean List View with Status Filtering */
        <main className="fcx-list-container">
          {/* Quick List Status Filter Row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'all', label: isSw ? `Oda Zote (${orders.length})` : `All Orders (${orders.length})` },
              { id: 'placed', label: isSw ? `🟡 Mpya (${countsByStatus.placed})` : `🟡 New (${countsByStatus.placed})` },
              { id: 'accepted', label: isSw ? `✓ Imethibitishwa (${countsByStatus.accepted})` : `✓ Accepted (${countsByStatus.accepted})` },
              { id: 'preparing', label: isSw ? `🔥 Inapikwa (${countsByStatus.preparing})` : `🔥 Cooking (${countsByStatus.preparing})` },
              { id: 'ready', label: isSw ? `🟢 Tayari (${countsByStatus.ready})` : `🟢 Ready at Pass (${countsByStatus.ready})` },
              { id: 'served', label: isSw ? `🍽️ Imehudumiwa (${countsByStatus.served})` : `🍽️ Served (${countsByStatus.served})` },
              { id: 'paid', label: isSw ? `💰 Imelipwa (${countsByStatus.paid})` : `💰 Paid (${countsByStatus.paid})` },
              { id: 'cancelled', label: isSw ? `✕ Imeghairiwa (${countsByStatus.cancelled})` : `✕ Void (${countsByStatus.cancelled})` },
            ].map(tab => (
              <button
                key={tab.id}
                className="fcx-toggle-btn"
                style={{
                  background: listStageFilter === tab.id ? '#2563EB' : '#1E293B',
                  color: listStageFilter === tab.id ? '#FFF' : '#94A3B8',
                  border: '1px solid #334155',
                  padding: '5px 12px',
                  fontSize: 12
                }}
                onClick={() => setListStageFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <table className="fcx-table">
            <thead>
              <tr>
                <th>{isSw ? 'KOT / Tiketi' : 'KOT / Ticket'}</th>
                <th>{isSw ? 'Oda & Meza' : 'Order & Table'}</th>
                <th>{isSw ? 'Vyakula Vilivyoagizwa' : 'Items Ordered'}</th>
                <th>{isSw ? 'Sehemu' : 'Station'}</th>
                <th>{isSw ? 'Muda' : 'Time Elapsed'}</th>
                <th>{isSw ? 'Hali' : 'Status'}</th>
                <th style={{ textAlign: 'right' }}>{isSw ? 'Hatua' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter(o => listStageFilter === 'all' ? true : o.st === listStageFilter)
                .filter(filterByStation)
                .map((o, idx) => {
                  const kotCode = getKotCode(o, idx);
                  const orderSub = getOrderSubtitle(o);
                  const timeBadge = getElapsedBadge(o);
                  const firstDish = (o.it && o.it[0]) ? M[o.it[0].id] : null;
                  const station = firstDish ? getDishStation(firstDish) : (isSw ? 'Jiko Kuu' : 'Main Kitchen');
                  const statusInfo = getStatusBadgeInfo(o.st);

                  return (
                    <tr key={o.id}>
                      <td>
                        <b style={{ color: '#FFFFFF', fontSize: 14 }}>{kotCode}</b>
                      </td>
                      <td>
                        <span style={{ color: '#94A3B8' }}>{orderSub}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {(o.it || []).map((l, i) => (
                            <span key={i} style={{ color: '#F1F5F9' }}>
                              <b>{l.q}x</b> {getMenuName ? getMenuName(M[l.id]) : (M[l.id]?.n || 'Dish')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#38BDF8', fontSize: 12 }}>{station}</span>
                      </td>
                      <td>
                        <span className={`fcx-time-badge ${timeBadge.cls}`}>
                          {timeBadge.text}
                        </span>
                      </td>
                      <td>
                        <span className={`fcx-status-tag ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                          {['placed', 'accepted'].includes(o.st) && (
                            <button className="fcx-btn-start" onClick={() => handleStart(o.id)}>
                              ▶ {isSw ? 'Anza' : 'Start'}
                            </button>
                          )}
                          {o.st === 'preparing' && (
                            <button className="fcx-btn-ready" onClick={() => handleReady(o.id)}>
                              ✓ {isSw ? 'Tayari' : 'Ready'}
                            </button>
                          )}
                          {o.st === 'ready' && (
                            <button className="fcx-btn-serve" onClick={() => handleServe(o.id)}>
                              ✓ {isSw ? 'Hudumia' : 'Serve'}
                            </button>
                          )}
                          {['served', 'billreq', 'paid', 'closed', 'cancelled'].includes(o.st) && (
                            <button
                              className="fcx-btn-reprint"
                              style={{ color: '#2563EB', fontWeight: 700 }}
                              onClick={() => handleRecall(o.id)}
                              title={isSw ? 'Rudisha tiketi jikoni' : 'Recall ticket back to cooking line'}
                            >
                              ↺ {isSw ? 'Rudisha' : 'Recall'}
                            </button>
                          )}
                          <button className="fcx-btn-reprint" onClick={() => setReprintOrder(o)}>
                            🖨️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </main>
      )}

      {/* ── HARDWARE & TOUCH BUMP BAR (Matching User Attached Hardware Bump Bar Image) ── */}
      <div className="fcx-bump-bar-container">
        <div className="fcx-bump-bar-group">
          {/* ⚡ BUMP Button (Orange) */}
          <button
            className="fcx-bump-btn btn-bump"
            onClick={handleBump}
            disabled={!effectiveSelectedOrder}
            title={isSw ? '[Space / Enter] Peleka tiketi iliyochaguliwa hatua inayofuata' : '[Space / Enter] Advance selected ticket to next stage'}
          >
            <span>⚡</span>
            <span>{isSw ? 'SONGEZA' : 'BUMP'}</span>
          </button>

          {/* 👨‍🍳 COOKING Button (Dark Forest Green) */}
          <button
            className="fcx-bump-btn btn-cooking"
            onClick={handleCookSelected}
            disabled={!effectiveSelectedOrder}
            title={isSw ? '[C] Weka tiketi iliyochaguliwa kuwa Inapikwa' : '[C] Mark selected ticket as Cooking / Preparing'}
          >
            <span>👨‍🍳</span>
            <span>{isSw ? 'INAPIKWA' : 'COOKING'}</span>
          </button>

          {/* ✓ READY Button (Bright Green) */}
          <button
            className="fcx-bump-btn btn-ready"
            onClick={handleReadySelected}
            disabled={!effectiveSelectedOrder}
            title={isSw ? '[R] Weka tiketi iliyochaguliwa kuwa Tayari' : '[R] Mark selected ticket Ready at Pass'}
          >
            <span>✓</span>
            <span>{isSw ? 'TAYARI' : 'READY'}</span>
          </button>

          {/* 🍽️ SERVE Button (Teal) */}
          <button
            className="fcx-bump-btn btn-serve"
            onClick={handleServeSelected}
            disabled={!effectiveSelectedOrder}
            title={isSw ? '[S] Weka tiketi iliyochaguliwa kuwa Imehudumiwa' : '[S] Mark selected ticket as Served to table'}
          >
            <span>🍽️</span>
            <span>{isSw ? 'HUDUMIA' : 'SERVE'}</span>
          </button>

          {/* 📊 SUMMARY Button (White) */}
          <button
            className="fcx-bump-btn btn-white"
            onClick={() => setShowSummaryModal(true)}
            title={isSw ? 'Onyesha Muhtasari wa Vyakula Vinavyopikwa' : 'Show Expediter & Cooking Line Item Totals'}
          >
            <span>📊</span>
            <span>{isSw ? 'MUHTASARI' : 'SUMMARY'}</span>
          </button>

          {/* 🖨️ PRINT Button (White) */}
          <button
            className="fcx-bump-btn btn-white"
            onClick={handlePrintSelected}
            disabled={!effectiveSelectedOrder}
            title={isSw ? '[P] Chapisha karatasi ya jikoni (KOT)' : '[P] Print or Reprint KOT chit for selected ticket'}
          >
            <span>🖨️</span>
            <span>{isSw ? 'CHAPISHA' : 'PRINT'}</span>
          </button>

          {/* 📄 INFO Button (White) */}
          <button
            className="fcx-bump-btn btn-white"
            onClick={handleInfoSelected}
            disabled={!effectiveSelectedOrder}
            title={isSw ? '[I] Tazama maelezo kamili ya tiketi na mzio' : '[I] View full ticket notes, allergies and diner details'}
          >
            <span>📄</span>
            <span>{isSw ? 'MAELEZO' : 'INFO'}</span>
          </button>

          {/* ↺ RECALL Button (White) */}
          <button
            className="fcx-bump-btn btn-white"
            onClick={handleRecallLatest}
            title={isSw ? '[U] Rudisha tiketi ya mwisho jikoni' : '[U] Recall last served ticket back to cooking lane'}
          >
            <span>↺</span>
            <span>{isSw ? 'RUDISHA' : 'RECALL'}</span>
          </button>

          {/* 🔊 MUTE Button (White) */}
          <button
            className="fcx-bump-btn btn-white"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playKitchenChime('chime');
            }}
            title={isSw ? '[M] Zima au washa sauti ya jikoni' : '[M] Mute or Unmute kitchen sound alerts'}
          >
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <span>{soundEnabled ? (isSw ? 'NYAMAZISHA' : 'MUTE') : (isSw ? 'WASHA SAUTI' : 'UNMUTE')}</span>
          </button>
        </div>

        <div className="fcx-bump-bar-group">
          {/* Selected Ticket Indicator */}
          <div className="fcx-bump-selected-indicator">
            <span>{isSw ? 'Tiketi:' : 'Ticket:'}</span>
            <b>
              {effectiveSelectedOrder
                ? (effectiveSelectedOrder.no ? `#${String(effectiveSelectedOrder.no).replace('#', '')}` : `#${effectiveSelectedOrder.id}`)
                : (isSw ? 'Hakuna' : 'None')}
            </b>
            {effectiveSelectedOrder && (
              <span style={{ opacity: 0.85, fontSize: 11, background: 'rgba(255,255,255,0.12)', padding: '2px 5px', borderRadius: 4 }}>
                {getStatusBadgeInfo(effectiveSelectedOrder.st).label}
              </span>
            )}
          </div>

          {/* ← LEFT Button */}
          <button
            className="fcx-bump-btn btn-nav"
            onClick={handleLeft}
            disabled={activeOrders.length <= 1}
            title={isSw ? '[← Mshale Kushoto] Chagua tiketi iliyopita' : '[← Left Arrow] Select previous active ticket'}
          >
            <span>←</span>
            <span>{isSw ? 'KUSHOTO' : 'LEFT'}</span>
          </button>

          {/* RIGHT → Button */}
          <button
            className="fcx-bump-btn btn-nav"
            onClick={handleRight}
            disabled={activeOrders.length <= 1}
            title={isSw ? '[→ Mshale Kulia] Chagua tiketi inayofuata' : '[→ Right Arrow] Select next active ticket'}
          >
            <span>{isSw ? 'KULIA' : 'RIGHT'}</span>
            <span>→</span>
          </button>
        </div>
      </div>


      {/* ── MODAL: Order History Covering ALL Statuses in Rich Cards ── */}
      {showServedModal && (
        <Sheet t={isSw ? `Oda Zote & Historia ya Jikoni (${filteredHistoryOrders.length})` : `All Orders & Kitchen History (${filteredHistoryOrders.length})`} c={() => setShowServedModal(false)}>
          <div className="fcx-history-sheet-body">
            
            {/* Filter Controls Row */}
            <div className="fcx-history-filter-bar">
              {/* All Status Filter Pills */}
              <div className="fcx-history-status-pills">
                {[
                  { id: 'all', label: isSw ? 'Oda Zote' : 'All Orders', count: countsByStatus.all },
                  { id: 'new', label: isSw ? '🟡 Mpya / Imetumwa' : '🟡 New / Placed', count: countsByStatus.placed },
                  { id: 'accepted', label: isSw ? '✓ Imekubaliwa' : '✓ Accepted', count: countsByStatus.accepted },
                  { id: 'preparing', label: isSw ? '🔥 Inapikwa' : '🔥 Cooking', count: countsByStatus.preparing },
                  { id: 'ready', label: isSw ? '🟢 Tayari Mezani' : '🟢 Ready at Pass', count: countsByStatus.ready },
                  { id: 'served', label: isSw ? '🍽️ Imehudumiwa' : '🍽️ Served', count: countsByStatus.served },
                  { id: 'billreq', label: isSw ? '📄 Bili Imeombwa' : '📄 Bill Req', count: countsByStatus.billreq },
                  { id: 'paid', label: isSw ? '💰 Imelipwa' : '💰 Paid', count: countsByStatus.paid },
                  { id: 'closed', label: isSw ? '📁 Imefungwa' : '📁 Archived', count: countsByStatus.closed },
                  { id: 'cancelled', label: isSw ? '✕ Imeghairiwa' : '✕ Cancelled', count: countsByStatus.cancelled },
                ].map(pill => (
                  <button
                    key={pill.id}
                    className={`fcx-history-status-pill ${historyStatusTab === pill.id ? 'active' : ''}`}
                    onClick={() => setHistoryStatusTab(pill.id)}
                  >
                    <span>{pill.label}</span>
                    <span className="fcx-history-pill-count">{pill.count}</span>
                  </button>
                ))}
              </div>

              {/* Search, Channel & Sort Row */}
              <div className="fcx-history-search-row">
                <div className="fcx-history-search-box">
                  <span style={{ position: 'absolute', left: 9, color: '#94A3B8' }}>🔍</span>
                  <input
                    type="text"
                    className="fcx-history-search-inp"
                    placeholder={isSw ? 'Tafuta namba ya tiketi, meza, chakula, mhudumu...' : 'Search ticket #, table, dish, server...'}
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      style={{ position: 'absolute', right: 8, background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  className="inp"
                  style={{ width: 'auto', margin: 0, padding: '7px 12px', fontSize: 13, background: '#FFF' }}
                  value={historyChannel}
                  onChange={e => setHistoryChannel(e.target.value)}
                >
                  <option value="ALL">{isSw ? 'Njia Zote za Oda' : 'All Dining Channels'}</option>
                  <option value="Dine In">{isSw ? '🍽️ Kula Hapa (Dine-In)' : '🍽️ Dine-In'}</option>
                  <option value="Takeaway">{isSw ? '🥡 Kubeba (Takeaway)' : '🥡 Takeaway'}</option>
                  <option value="Pickup">{isSw ? '📦 Kuchukua (Pickup)' : '📦 Pickup'}</option>
                  <option value="Delivery">{isSw ? '🛵 Usafirishaji (Delivery)' : '🛵 Delivery'}</option>
                </select>

                <select
                  className="inp"
                  style={{ width: 'auto', margin: 0, padding: '7px 12px', fontSize: 13, background: '#FFF' }}
                  value={historySort}
                  onChange={e => setHistorySort(e.target.value)}
                >
                  <option value="recent">{isSw ? 'Mpya Zaidi Kwanza' : 'Most Recent First'}</option>
                  <option value="oldest">{isSw ? 'Za Zamani Kwanza' : 'Oldest First'}</option>
                  <option value="value">{isSw ? 'Thamani ya Juu Zaidi' : 'Highest Total Value'}</option>
                  <option value="prep">{isSw ? 'Muda Mrefu wa Kupika' : 'Longest Prep Time'}</option>
                </select>
              </div>
            </div>

            {/* Rich Order Cards Grid */}
            {filteredHistoryOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B', background: '#F8FAFC', borderRadius: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                <b style={{ color: '#0F172A', fontSize: 15 }}>{isSw ? 'Hakuna Oda Zilizopatikana' : 'No Orders Found'}</b>
                <p style={{ fontSize: 13, margin: '4px 0 12px' }}>{isSw ? 'Jaribu kubadilisha kichupo cha hali au kufuta utafutaji' : 'Try switching the status tab or clearing your search filter'}</p>
                <button
                  className="btn sm ghost"
                  style={{ width: 'auto' }}
                  onClick={() => { setHistoryStatusTab('all'); setHistorySearch(''); setHistoryChannel('ALL'); }}
                >
                  {isSw ? 'Weka Upya Vichujio' : 'Reset All Filters'}
                </button>
              </div>
            ) : (
              <div className="fcx-history-cards-grid">
                {filteredHistoryOrders.map((o, idx) => {
                  const kotCode = getKotCode(o, idx);
                  const orderNum = String(o.no || o.id).replace('#', '');
                  const statusInfo = getStatusBadgeInfo(o.st);
                  const totalVal = (o.it || []).reduce((acc, l) => acc + (M[l.id]?.p || 0) * l.q, 0);
                  const elapsedMins = o.elapsedMins || Math.round((Date.now() - (o.t || 0)) / 60000);

                  const channelType = (o.orderType || 'Dine In').toLowerCase();
                  const channelIcon = channelType.includes('dine') ? '🍽️' : channelType.includes('take') ? '🥡' : channelType.includes('pickup') ? '📦' : '🛵';

                  return (
                    <div key={o.id} className="fcx-history-card">
                      {/* Top Row: Ticket Code, Table, and Status Badge */}
                      <div className="fcx-hcard-head">
                        <div>
                          <div className="fcx-hcard-title">
                            #{orderNum.padStart(4, '0')} · {kotCode}
                          </div>
                          <div className="fcx-hcard-sub">
                            {channelIcon} <b>{o.tb || (isSw ? 'Meza' : 'Table')}</b> ({o.orderType || (isSw ? 'Kula Hapa' : 'Dine-In')})
                          </div>
                        </div>

                        <span className={`fcx-status-tag ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Meta Information Line */}
                      <div className="fcx-hcard-meta">
                        <span>{isSw ? 'Mhudumu:' : 'Server:'} <b style={{ color: '#0F172A' }}>{o.by || 'Ammie'}</b></span>
                        <span>·</span>
                        <span>{isSw ? 'Wageni:' : 'Guests:'} {o.guests || 2}</span>
                        <span>·</span>
                        <span>{isSw ? 'Muda:' : 'Placed:'} {fmtTime(o.t)}</span>
                        <span>·</span>
                        <span>⏱️ {elapsedMins}{isSw ? 'dk zimepita' : 'm elapsed'}</span>
                      </div>

                      {/* Special Note or Cancellation Reason */}
                      {o.note && (
                        <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '6px 10px', borderRadius: 6, fontSize: 11.5, color: '#B45309', fontWeight: 600 }}>
                          ⚠️ {isSw ? 'Maelezo:' : 'Note:'} {o.note}
                        </div>
                      )}
                      {o.cancelReason && (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', padding: '6px 10px', borderRadius: 6, fontSize: 11.5, color: '#DC2626', fontWeight: 600 }}>
                          ✕ {isSw ? 'Sababu ya Kufuta:' : 'Void Reason:'} {o.cancelReason}
                        </div>
                      )}

                      {/* Dishes Breakdown List */}
                      <div className="fcx-hcard-items-box">
                        {(o.it || []).map((line, iIdx) => {
                          const item = M[line.id] || { n: `${isSw ? 'Chakula' : 'Item'} #${line.id}`, p: 0 };
                          const linePrice = item.p * line.q;

                          return (
                            <div key={iIdx} className="fcx-hcard-item-row">
                              <div>
                                <b style={{ color: '#0F172A' }}>{line.q}x</b> {getMenuName ? getMenuName(item) : item.n}
                                {line.sub && <small style={{ color: '#64748B', marginLeft: 4 }}>({line.sub})</small>}
                                {line.note && <small style={{ color: '#D97706', marginLeft: 4 }}>★ {line.note}</small>}
                                {line.voided && <small style={{ color: '#EF4444', marginLeft: 4 }}>[{isSw ? 'IMEFUTWA' : 'VOIDED'}]</small>}
                              </div>
                              <span style={{ fontWeight: 600, color: '#475569' }}>
                                {fmt(linePrice)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer: Total Amount, Payment Method & Action Buttons */}
                      <div className="fcx-hcard-foot">
                        <div>
                          <div className="fcx-hcard-total">
                            {isSw ? 'Jumla:' : 'Total:'} {fmt(totalVal)}
                          </div>
                          <small style={{ color: '#64748B', fontSize: 11 }}>
                            {isSw ? 'Malipo:' : 'Payment:'} {o.paid ? (isSw ? '✓ Imelipwa' : '✓ Paid') : (isSw ? 'Inasubiri' : 'Pending')} ({o.pm ? o.pm.toUpperCase() : (isSw ? 'TASLIMU' : 'CASH')})
                          </small>
                        </div>

                        <div className="fcx-hcard-actions">
                          {/* If order is completed/served/paid/cancelled: Offer 1-click Recall back to cooking line */}
                          {['served', 'billreq', 'paid', 'closed', 'cancelled'].includes(o.st) && (
                            <button
                              className="fcx-btn-reprint"
                              style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1D4ED8', fontWeight: 700 }}
                              onClick={() => {
                                handleRecall(o.id);
                                setShowServedModal(false);
                                setViewMode('board');
                              }}
                              title={isSw ? 'Rudisha tiketi jikoni kwenye ubao wa KDS' : 'Recall ticket back to cooking line on KDS board'}
                            >
                              ↺ {isSw ? 'Rudisha Jikoni' : 'Recall to Line'}
                            </button>
                          )}

                          {/* If order is currently active (placed, accepted, preparing, ready): Offer view on board */}
                          {['placed', 'accepted', 'preparing', 'ready'].includes(o.st) && (
                            <button
                              className="fcx-btn-reprint"
                              style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#15803D', fontWeight: 700 }}
                              onClick={() => {
                                setSelectedOrderId(o.id);
                                setShowServedModal(false);
                                setViewMode('board');
                              }}
                              title={isSw ? 'Tazama tiketi kwenye ubao wa jikoni' : 'Focus ticket on active kitchen board'}
                            >
                              👁️ {isSw ? 'Tazama Ubaoni' : 'View on Board'}
                            </button>
                          )}

                          {/* Reprint KOT Slip button */}
                          <button
                            className="fcx-btn-reprint"
                            onClick={() => setReprintOrder(o)}
                            title={isSw ? 'Chapisha karatasi ya jikoni' : 'Print thermal kitchen order slip'}
                          >
                            <span>🖨️ {isSw ? 'Karatasi' : 'Slip'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </Sheet>
      )}

      {/* ── MODAL: Thermal Reprint KOT Slip ── */}
      {reprintOrder && (
        <Sheet t={isSw ? `Karatasi ya Jikoni #${String(reprintOrder.no || reprintOrder.id).replace('#', '')}` : `Kitchen Slip #${String(reprintOrder.no || reprintOrder.id).replace('#', '')}`} c={() => setReprintOrder(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="thermal-receipt-container" style={{ width: '100%', maxWidth: 340 }}>
              <div className="kot-header">
                <span className="kot-badge">{isSw ? '*** TIKETI YA ODA YA JIKONI (KOT) ***' : '*** KITCHEN ORDER TICKET (KOT) ***'}</span>
                <h2 className="kot-table-giant">{reprintOrder.tb || (isSw ? 'KULA HAPA' : 'DINE-IN')}</h2>
                <span className="kot-type-tag">{reprintOrder.orderType || (isSw ? 'Kula Hapa' : 'Dine-In')} · {isSw ? 'Mhudumu:' : 'Server:'} {reprintOrder.by || 'Ammie'}</span>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

              <div className="kot-meta-grid">
                <div>{isSw ? 'Tiketi:' : 'Ticket:'} <b>#{String(reprintOrder.no || reprintOrder.id).replace('#', '')}</b></div>
                <div style={{ textAlign: 'right' }}>{isSw ? 'Muda:' : 'Time:'} <b>{fmtTime(reprintOrder.t)}</b></div>
                <div>{isSw ? 'Wageni:' : 'Guests:'} <b>{reprintOrder.guests || 2}</b></div>
                <div style={{ textAlign: 'right' }}>{isSw ? 'Hali:' : 'Status:'} <b>{getStatusBadgeInfo(reprintOrder.st).label}</b></div>
              </div>

              {reprintOrder.note && (
                <div style={{ margin: '8px 0', padding: 6, background: '#FFE4E6', border: '1px solid #FDA4AF', borderRadius: 4, fontWeight: 800, fontSize: 12 }}>
                  ⚠️ {isSw ? 'MAELEZO:' : 'NOTE:'} {reprintOrder.note}
                </div>
              )}

              <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

              <div>
                {(reprintOrder.it || []).map((l, i) => {
                  const dish = M[l.id] || { n: `${isSw ? 'Chakula' : 'Item'} #${l.id}` };
                  return (
                    <div key={i} className="kot-item-row">
                      <span className="kot-qty"><b>{l.q}x</b></span>
                      <div className="kot-item-details">
                        <span className="kot-item-title">{getMenuName ? getMenuName(dish) : dish.n}</span>
                        {l.sub && <div style={{ fontSize: 11, color: '#555' }}>({l.sub})</div>}
                        {l.mods && l.mods.length > 0 && <div style={{ fontSize: 11, color: '#555' }}>{isSw ? 'Nyongeza:' : 'Mods:'} {l.mods.join(', ')}</div>}
                        {l.note && <div className="kot-special-note">★ {l.note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />
              <div style={{ textAlign: 'center', fontSize: 11, color: '#666' }}>
                Safari Grill &amp; Lounge · {isSw ? 'Inaendeshwa na RestoERP' : 'Powered by RestoERP'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 340, marginTop: 14 }}>
              <button
                className="btn o"
                style={{ background: '#2563EB', flex: 1 }}
                onClick={() => window.print()}
              >
                🖨️ {isSw ? 'Chapisha KOT' : 'Print KOT Slip'}
              </button>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => setReprintOrder(null)}>
                {isSw ? 'Funga' : 'Close'}
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {/* ── MODAL: Kitchen Expediter Summary (📊 SUMMARY Bump Bar) ── */}
      {showSummaryModal && (
        <Sheet t={isSw ? 'Muhtasari wa Jikoni & Vyakula Vinavyopikwa' : 'Kitchen Expediter & Active Dishes Summary'} c={() => setShowSummaryModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Quick Lane Counts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#C2410C', fontWeight: 800 }}>{isSw ? 'INASUBIRI' : 'PENDING'}</span>
                <b style={{ fontSize: 24, display: 'block', color: '#9A3412' }}>{pendingOrders.length}</b>
              </div>
              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#B45309', fontWeight: 800 }}>{isSw ? 'INAPIKWA' : 'COOKING'}</span>
                <b style={{ fontSize: 24, display: 'block', color: '#78350F' }}>{preparingOrders.length}</b>
              </div>
              <div style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#15803D', fontWeight: 800 }}>{isSw ? 'TAYARI MEZANI' : 'READY AT PASS'}</span>
                <b style={{ fontSize: 24, display: 'block', color: '#166534' }}>{readyOrders.length}</b>
              </div>
            </div>

            {/* Aggregated Item Breakdown Table */}
            <div>
              <b style={{ fontSize: 14, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                🍳 {isSw ? `Jumla ya Vyakula Vinavyopikwa & Foleni (${summaryAggregates.reduce((a, b) => a + b.total, 0)} vyakula):` : `Total Dishes Cooking & In Queue (${summaryAggregates.reduce((a, b) => a + b.total, 0)} items):`}
              </b>
              {summaryAggregates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--mut)', fontSize: 13 }}>
                  {isSw ? 'Hakuna vyakula vinavyopikwa kwa sasa!' : 'No active dishes queued right now!'}
                </div>
              ) : (
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--line)', textAlign: 'left', color: '#64748B' }}>
                        <th style={{ padding: '8px 12px' }}>{isSw ? 'Jina la Chakula' : 'Dish Name'}</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>{isSw ? 'Inasubiri' : 'Pending'}</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>{isSw ? 'Inapikwa' : 'Cooking'}</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>{isSw ? 'Tayari' : 'Ready'}</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>{isSw ? 'Jumla' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryAggregates.map(row => {
                        const dishObj = M[row.id];
                        const dishLabel = dishObj && getMenuName ? getMenuName(dishObj) : row.name;
                        return (
                          <tr key={row.id} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{dishLabel}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#C2410C', fontWeight: 700 }}>{row.pending || '-'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#B45309', fontWeight: 700 }}>{row.preparing || '-'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#15803D', fontWeight: 700 }}>{row.ready || '-'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 900, fontSize: 14 }}>{row.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button className="btn ghost sm" onClick={() => setShowSummaryModal(false)}>
              {isSw ? 'Funga Muhtasari' : 'Close Summary'}
            </button>
          </div>
        </Sheet>
      )}

      {/* ── MODAL: Ticket Details & Special Notes (📄 INFO Bump Bar) ── */}
      {showInfoModal && (
        <Sheet t={isSw ? `Maelezo ya Tiketi #${String(showInfoModal.no || showInfoModal.id).replace('#', '')}` : `Ticket Details #${String(showInfoModal.no || showInfoModal.id).replace('#', '')}`} c={() => setShowInfoModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 18, color: '#0F172A' }}>{showInfoModal.tb || (isSw ? 'Meza ya Kula Hapa' : 'Dine-In Table')}</b>
                <span className={`fcx-status-tag ${showInfoModal.st}`}>{getStatusBadgeInfo(showInfoModal.st).label}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                {isSw ? 'Mhudumu:' : 'Server:'} <b>{showInfoModal.by || (isSw ? 'Mhudumu' : 'Staff')}</b> · {isSw ? 'Wageni:' : 'Guests:'} <b>{showInfoModal.guests || 2}</b> · {isSw ? 'Aina:' : 'Type:'} <b>{showInfoModal.orderType || (isSw ? 'Kula Hapa' : 'Dine-In')}</b> · {isSw ? 'Muda:' : 'Placed:'} <b>{fmtTime(showInfoModal.t)}</b>
              </div>
            </div>

            {showInfoModal.note && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: 12 }}>
                <b style={{ color: '#B91C1C', fontSize: 13, display: 'block', marginBottom: 2 }}>⚠️ {isSw ? 'Maelekezo Maalum ya Jikoni / Mzio:' : 'Special Kitchen Instructions / Allergies:'}</b>
                <span style={{ fontSize: 13, color: '#7F1D1D' }}>{showInfoModal.note}</span>
              </div>
            )}

            <div>
              <b style={{ fontSize: 13, color: '#475569', display: 'block', marginBottom: 6 }}>{isSw ? 'Vyakula Kwenye Tiketi:' : 'Dishes in Ticket:'}</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(showInfoModal.it || []).map((line, idx) => {
                  const dish = M[line.id] || { n: `${isSw ? 'Chakula' : 'Item'} #${line.id}` };
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px' }}>
                      <div>
                        <b style={{ fontSize: 13 }}>{line.q}x {getMenuName ? getMenuName(dish) : dish.n}</b>
                        {line.sub && <div style={{ fontSize: 11, color: 'var(--mut)' }}>{isSw ? 'Chaguo:' : 'Option:'} {line.sub}</div>}
                        {line.note && <div style={{ fontSize: 11, color: '#C2410C' }}>★ {line.note}</div>}
                      </div>
                      <span style={{ fontSize: 12, color: line.done ? '#16A34A' : '#94A3B8', fontWeight: 700 }}>
                        {line.done ? (isSw ? '✓ Tayari' : '✓ Done') : (isSw ? 'Inapikwa' : 'Cooking')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn o sm"
                style={{ background: '#2563EB', flex: 1 }}
                onClick={() => {
                  setReprintOrder(showInfoModal);
                  setShowInfoModal(null);
                }}
              >
                🖨️ {isSw ? 'Chapisha Karatasi' : 'Print Slip'}
              </button>
              <button className="btn sm ghost" style={{ flex: 1 }} onClick={() => setShowInfoModal(null)}>
                {isSw ? 'Funga' : 'Close'}
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {/* ── MODAL: Role & Site Switcher ── */}
      {showRoleModal && (
        <Sheet t={isSw ? 'Badili Nafasi ya Kazi (RestoERP)' : 'RestoERP Workspace & Role Switcher'} c={() => setShowRoleModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--mut)' }}>{isSw ? 'Kituo & Mtumiaji wa Sasa' : 'Current Station & User'}</div>
              <b style={{ fontSize: 16, color: '#0F172A' }}>{sess?.name || 'Chef Ammie'} · {sess?.r?.toUpperCase() || 'CHEF'}</b>
              <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 2 }}>{isSw ? 'Tawi:' : 'Branch:'} Safari Grill &amp; Lounge</div>
            </div>

            <div>
              <b style={{ fontSize: 14 }}>{isSw ? 'Chagua Sehemu ya ERP:' : 'Switch ERP Viewport:'}</b>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                {[
                  { r: 'chef', icon: '👨‍🍳', label: isSw ? 'Jikoni (KDS)' : 'Kitchen (KDS)', desc: isSw ? 'Ubao wa Mapishi' : 'Expo & Line Prep' },
                  { r: 'cashier', icon: '💳', label: isSw ? 'Keshia (POS)' : 'Cashier (POS)', desc: isSw ? 'Bili & Malipo' : 'Billing & Payments' },
                  { r: 'waiter', icon: '🧑‍🍳', label: isSw ? 'Wahudumu' : 'Waiters', desc: isSw ? 'Meza & Oda' : 'Floor Tables & Orders' },
                  { r: 'storekeeper', icon: '📦', label: isSw ? 'Stooni (Stoo)' : 'Inventory', desc: isSw ? 'Mzigo & Shehena' : 'Stock & Batches' },
                  { r: 'manager', icon: '👔', label: isSw ? 'Meneja' : 'Manager', desc: isSw ? 'Ripoti & Wafanyakazi' : 'P&L, Reports & Staff' },
                  { r: 'customer', icon: '🍽️', label: isSw ? 'Menyu ya Mteja' : 'Customer Menu', desc: isSw ? 'Kuagiza Mezani' : 'Guest Dine-In Ordering' }
                ].map(item => (
                  <button
                    key={item.r}
                    className="card"
                    style={{
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      border: sess?.r === item.r ? '2px solid #2563EB' : '1px solid var(--line)',
                      background: sess?.r === item.r ? '#EFF6FF' : 'var(--card)',
                      textAlign: 'left'
                    }}
                    onClick={() => {
                      setShowRoleModal(false);
                      if (setSess && USERS[item.r]) setSess(USERS[item.r]);
                      if (setV) setV(item.r);
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                    <div>
                      <b style={{ fontSize: 13, display: 'block' }}>{item.label}</b>
                      <small style={{ fontSize: 11, color: 'var(--mut)' }}>{item.desc}</small>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn o sm"
                style={{ background: '#EF4444', flex: 1 }}
                onClick={() => {
                  setShowRoleModal(false);
                  out && out();
                }}
              >
                {isSw ? 'Ondoka / Toka' : 'Sign Out / Exit'}
              </button>
              <button className="btn sm ghost" style={{ flex: 1 }} onClick={() => setShowRoleModal(false)}>
                {isSw ? 'Baki Kwenye KDS' : 'Stay on KDS'}
              </button>
            </div>
          </div>
        </Sheet>
      )}

    </div>
  );
}
