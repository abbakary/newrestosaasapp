import React, { useState, useEffect, useContext } from 'react';
import { CATS, CAT_ICONS, fmt, fmtNum, M, MENU } from '../data';
import { Ctx } from '../store';
import { MenuItemDetailModal } from './CreateMenuItemModal';

// Re-export MenuItemDetailModal for all consumers
export { MenuItemDetailModal };

// Curated high-resolution finished good food & beverage imagery presets
export const FINISHED_GOOD_PRESETS = [
  {
    name: 'Flame-Grilled Ribeye & Steaks',
    category: 'Grills',
    station: 'grill',
    url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80',
    emoji: '🥩'
  },
  {
    name: 'Roasted Chicken Half',
    category: 'Grills',
    station: 'grill',
    url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&auto=format&fit=crop&q=80',
    emoji: '🍗'
  },
  {
    name: 'Swahili Beef Mishkaki Skewers',
    category: 'Grills',
    station: 'grill',
    url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    emoji: '🍢'
  },
  {
    name: 'Grilled Whole Tilapia',
    category: 'Grills',
    station: 'grill',
    url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80',
    emoji: '🐟'
  },
  {
    name: 'Gourmet Steakhouse Burger',
    category: 'Burgers',
    station: 'grill',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    emoji: '🍔'
  },
  {
    name: 'Crispy Buttermilk Chicken Burger',
    category: 'Burgers',
    station: 'fry',
    url: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=600&auto=format&fit=crop&q=80',
    emoji: '🥪'
  },
  {
    name: 'Stone-Baked Mozzarella Pizza',
    category: 'Pizza',
    station: 'pizza',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    emoji: '🍕'
  },
  {
    name: 'Creamy Chicken Alfredo Pasta',
    category: 'Pastas',
    station: 'grill',
    url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281098?w=600&auto=format&fit=crop&q=80',
    emoji: '🍝'
  },
  {
    name: 'Crispy Masala Fries & Bites',
    category: 'Snacks',
    station: 'fry',
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    emoji: '🍟'
  },
  {
    name: 'Greek Salad with Feta & Olives',
    category: 'Salads',
    station: 'salad',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    emoji: '🥗'
  },
  {
    name: 'Dark Chocolate Lava Cake',
    category: 'Desserts',
    station: 'dessert',
    url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
    emoji: '🧁'
  },
  {
    name: 'Chilled Passion Cooler Mocktail',
    category: 'Drinks',
    station: 'bar',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    emoji: '🍹'
  },
  {
    name: 'Coca-Cola / Soda 500ml Bottle',
    category: 'Drinks',
    station: 'bar',
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    emoji: '🥤'
  },
  {
    name: 'Cold Beer / Safari Lager Bottle',
    category: 'Drinks',
    station: 'bar',
    url: 'https://images.unsplash.com/photo-1608270191295-829d2b2ecbe3?w=600&auto=format&fit=crop&q=80',
    emoji: '🍺'
  },
  {
    name: 'Kilimanjaro Mineral Water 500ml',
    category: 'Drinks',
    station: 'bar',
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80',
    emoji: '💧'
  },
  {
    name: 'Red Bull Energy Drink',
    category: 'Drinks',
    station: 'bar',
    url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=600&auto=format&fit=crop&q=80',
    emoji: '⚡'
  }
];

export const ALLERGEN_OPTIONS = ['Gluten', 'Dairy', 'Nuts', 'Fish', 'Shellfish', 'Eggs', 'Soy', 'Chilli', 'Garlic'];

/* ── 2. Unified Menu Management Drawer / Dashboard ── */
export function MenuManagementView({
  menuList = [],
  stockList = [],
  outOfStockIds = [],
  onToggle86,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  actor = 'Chef'
}) {
  const { lang, getCategoryName } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';

  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedStation, setSelectedStation] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filtered menu list
  const filteredItems = menuList.filter(item => {
    const matchCat = selectedCat === 'All' || item.c === selectedCat;
    const matchStation = selectedStation === 'All' || (item.station || 'grill').toLowerCase() === selectedStation.toLowerCase();
    const matchQuery =
      item.n.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.d || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.station || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchStation && matchQuery;
  });

  const totalCount = menuList.length;
  const count86 = outOfStockIds.length;
  const countNeedsReview = menuList.filter(m => m.needsReview).length;

  const handleDuplicate = (item) => {
    const copy = {
      ...item,
      n: `${item.n} (${isSw ? 'Nakala' : 'Copy'})`,
      needsReview: false
    };
    onCreateItem(copy, actor);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Banner & KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <div className="card" style={{ background: '#E5F2EE', border: '1.5px solid rgba(14,90,71,0.2)' }}>
          <small style={{ color: 'var(--g)', fontWeight: 700 }}>
            {isSw ? 'Jumla ya Vyakula kwenye Menyu' : 'Total Catalog Items'}
          </small>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--g)' }}>
            {totalCount} {isSw ? 'vyakula' : 'dishes'}
          </div>
          <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
            {isSw ? 'Vinavyopatikana kwenye POS na Menyu' : 'Active on POS & Mobile Web'}
          </small>
        </div>

        <div className="card" style={{ background: count86 > 0 ? '#FEF2F2' : '#F0FDF4', border: `1.5px solid ${count86 > 0 ? '#FCA5A5' : '#86EFAC'}` }}>
          <small style={{ color: count86 > 0 ? '#DC2626' : '#166534', fontWeight: 700 }}>
            {isSw ? 'Vilivyoisha Jikoni (86 / Sold Out)' : '86-List / Out of Stock'}
          </small>
          <div style={{ fontSize: 24, fontWeight: 800, color: count86 > 0 ? '#DC2626' : '#166534' }}>
            {count86} {isSw ? 'vitu' : 'items'}
          </div>
          <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
            {isSw ? 'Vimezuiwa kuagizwa na wateja' : 'Hidden from customer ordering'}
          </small>
        </div>

        <div className="card" style={{ background: countNeedsReview > 0 ? '#FFF9ED' : '#F8FAFC', border: `1.5px solid ${countNeedsReview > 0 ? '#FFE2A8' : '#E2E8F0'}` }}>
          <small style={{ color: countNeedsReview > 0 ? '#B45309' : '#64748B', fontWeight: 700 }}>
            {isSw ? 'Vinavyosubiri Mapitio' : 'Awaiting Stock Review'}
          </small>
          <div style={{ fontSize: 24, fontWeight: 800, color: countNeedsReview > 0 ? '#B45309' : '#0F172A' }}>
            {countNeedsReview} {isSw ? 'vitu' : 'items'}
          </div>
          <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>
            {isSw ? 'Vilivyoongezwa haraka kaunta' : 'Added on-site under 10s'}
          </small>
        </div>
      </div>

      {/* Main Menu Management Toolbar */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <b style={{ fontSize: 16 }}>
              {isSw ? 'Orodha ya Vyakula na Vinywaji (Safari Grill)' : 'Safari Grill Finished Goods & Menu Catalog'}
            </b>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--mut)' }}>
              {isSw ? 'Dhibiti bei, picha za vyakula, upatikanaji wa 86, na maeneo ya jikoni' : 'Manage dishes, finished goods imagery, prices, 86 availability, and kitchen station routing'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn sm o"
              onClick={() => {
                setEditingItem(null);
                setShowCreateModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>+</span>
              <span>{isSw ? 'Ongeza Chakula / Kinywaji' : 'Create New Dish / Drink'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder={isSw ? '🔍 Tafuta chakula, viungo, au sehemu ya jiko...' : '🔍 Search dishes, ingredients, stations...'}
              className="inp"
              style={{ margin: 0, padding: '8px 12px', fontSize: 13 }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 8, top: 9, color: 'var(--mut)', fontSize: 12 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {CATS.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCat(c)}
                style={{
                  fontSize: 11.5,
                  padding: '5px 9px',
                  borderRadius: 8,
                  fontWeight: selectedCat === c ? 800 : 500,
                  background: selectedCat === c ? 'var(--g)' : 'var(--bg)',
                  color: selectedCat === c ? '#fff' : 'var(--tx)',
                  border: '1px solid var(--line)',
                  cursor: 'pointer'
                }}
              >
                {CAT_ICONS[c] || ''} {getCategoryName ? getCategoryName(c) : c}
              </button>
            ))}
          </div>

          {/* Station Filter Dropdown */}
          <select
            className="inp"
            style={{ margin: 0, width: 'auto', fontSize: 12.5, padding: '6px 10px' }}
            value={selectedStation}
            onChange={e => setSelectedStation(e.target.value)}
          >
            <option value="All">{isSw ? 'Sehemu Zote za Jikoni ▾' : 'All Stations ▾'}</option>
            <option value="grill">🔥 {isSw ? 'Jiko la Choma (Grill)' : 'Grill & Charcoal'}</option>
            <option value="fry">🍟 {isSw ? 'Kaango (Fry Station)' : 'Fry Station'}</option>
            <option value="pizza">🍕 {isSw ? 'Piza (Pizza Oven)' : 'Pizza Oven'}</option>
            <option value="salad">🥗 {isSw ? 'Saladi na Baridi (Salad)' : 'Salad Bar'}</option>
            <option value="bar">🍹 {isSw ? 'Kaunta ya Vinywaji (Bar)' : 'Drink Bar'}</option>
            <option value="dessert">🧁 {isSw ? 'Vitamu (Desserts)' : 'Dessert Pass'}</option>
          </select>
        </div>

        {/* Dishes Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filteredItems.map(item => {
            const is86 = outOfStockIds.includes(item.id);
            const linkedStock = stockList.find(s => s.id === item.stockId);

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--card)',
                  borderRadius: 16,
                  border: is86 ? '1.5px solid #FCA5A5' : item.needsReview ? '1.5px solid #FCD34D' : '1px solid var(--line)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  opacity: is86 ? 0.75 : 1
                }}
              >
                {/* Image Banner */}
                <div style={{ position: 'relative', height: 130 }}>
                  <img
                    src={item.img || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'}
                    alt={item.n}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {is86 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: '#DC2626',
                        color: '#fff',
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontWeight: 800
                      }}
                    >
                      {isSw ? 'IMEISHA / SOLD OUT' : "86'D / SOLD OUT"}
                    </span>
                  )}
                  {item.needsReview && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: is86 ? 110 : 8,
                        background: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FCD34D',
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontWeight: 800
                      }}
                    >
                      ⚠️ {isSw ? 'Inasubiri Mapitio' : 'Needs Review'}
                    </span>
                  )}
                  {item.packMultiplier && item.packMultiplier > 1 && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        background: 'rgba(30,58,138,0.85)',
                        color: '#fff',
                        fontSize: 10,
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontWeight: 800
                      }}
                    >
                      📦 {item.packMultiplier}x Pack
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
                      padding: '2px 7px',
                      borderRadius: 99
                    }}
                  >
                    ★ {item.r || '4.8'}
                  </span>
                </div>

                {/* Body Content */}
                <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div>
                      <b style={{ fontSize: 14.5 }}>{item.n}</b>
                      <div style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 2 }}>
                        {item.c} · {isSw ? 'Sehemu:' : 'Station:'} <b>{(item.station || 'grill').toUpperCase()}</b> · {item.t || 12} {isSw ? 'dak' : 'mins'}
                      </div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--g)', whiteSpace: 'nowrap' }}>
                      {fmt(item.p)}
                    </span>
                  </div>

                  {item.d && (
                    <p style={{ margin: '6px 0', fontSize: 12, color: 'var(--mut)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.d}
                    </p>
                  )}

                  {/* Stock Link Feedback */}
                  <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 11.5 }}>
                    {linkedStock ? (
                      <span style={{ color: 'var(--g)', fontWeight: 600 }}>
                        🔗 {isSw ? 'Imeunganishwa:' : 'Linked:'} {linkedStock.name} ({linkedStock.baseUnit || linkedStock.uom})
                      </span>
                    ) : item.c === 'Drinks' ? (
                      <span style={{ color: '#B45309', fontWeight: 600 }}>
                        ⚠️ {isSw ? 'Haijaunganishwa na stoo' : 'Drink unlinked to stock'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--mut)' }}>
                        🥘 {isSw ? 'Inatengenezwa Jikoni' : 'Kitchen Made (Issued Stock)'}
                      </span>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button
                      type="button"
                      className={`btn sm ${is86 ? 'o' : 'ghost'}`}
                      style={{
                        flex: 1,
                        fontSize: 11.5,
                        padding: '6px 8px',
                        borderColor: is86 ? '#15803D' : '#FCA5A5',
                        color: is86 ? '#fff' : '#DC2626'
                      }}
                      onClick={() => onToggle86(item.id, actor)}
                    >
                      {is86 ? (isSw ? '🟢 Rejesha' : '🟢 Restore Item') : (isSw ? '🔴 Weka 86 (Imeisha)' : '🔴 86 (Sold Out)')}
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      style={{ fontSize: 11.5, padding: '6px 8px' }}
                      onClick={() => {
                        setEditingItem(item);
                        setShowCreateModal(true);
                      }}
                    >
                      ✏️ {isSw ? 'Hariri' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      style={{ fontSize: 11.5, padding: '6px 8px' }}
                      title="Duplicate dish into new item"
                      onClick={() => handleDuplicate(item)}
                    >
                      📋 {isSw ? 'Nakili' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      style={{ fontSize: 11.5, padding: '6px 8px', color: '#DC2626' }}
                      title="Delete item from menu"
                      onClick={() => {
                        if (window.confirm(isSw ? `Una uhakika unataka kufuta "${item.n}"?` : `Are you sure you want to delete "${item.n}"?`)) {
                          onDeleteItem(item.id, actor);
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--mut)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🍽️</div>
            <b>{isSw ? 'Hakuna vyakula vilivyopatikana' : 'No dishes found matching criteria'}</b>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              {isSw ? 'Jaribu kusafisha utafutaji au bonyeza "+ Ongeza Chakula" kuongeza kipya.' : 'Try clearing filters or click "+ Create New Dish" to add one.'}
            </p>
          </div>
        )}
      </div>

      {/* Clean Wizard Modal */}
      <MenuItemDetailModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingItem(null);
        }}
        editItem={editingItem}
        stockList={stockList}
        actor={actor}
        onSave={(data, id) => {
          if (id) {
            onUpdateItem(id, data, actor);
          } else {
            onCreateItem(data, actor);
          }
        }}
      />
    </div>
  );
}
