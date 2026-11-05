import React, { useState, useEffect, useContext } from 'react';
import { CATS, CAT_ICONS, fmtNum, M } from '../data';
import { Ctx } from '../store';

const ALLERGEN_OPTIONS = ['Gluten', 'Dairy', 'Nuts', 'Fish', 'Shellfish', 'Eggs', 'Soy', 'Chilli', 'Garlic'];

// Curated high-res food photo thumbnails for quick selection
const PHOTO_GALLERY = [
  { title: 'Nyama Choma / Steak', category: 'Grills', url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80' },
  { title: 'Kuku Choma / Roast Chicken', category: 'Grills', url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&auto=format&fit=crop&q=80' },
  { title: 'Mishkaki / Skewers', category: 'Grills', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80' },
  { title: 'Baga / Burger', category: 'Burgers', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80' },
  { title: 'Piza / Pizza', category: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80' },
  { title: 'Chipsi Masala / Fries', category: 'Snacks', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80' },
  { title: 'Soda 500ml', category: 'Drinks', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80' },
  { title: 'Bia / Safari Lager', category: 'Drinks', url: 'https://images.unsplash.com/photo-1608270191295-829d2b2ecbe3?w=600&auto=format&fit=crop&q=80' },
  { title: 'Maji ya Kilimanjaro', category: 'Drinks', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80' },
  { title: 'Keki ya Chokoleti', category: 'Desserts', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80' }
];

/* ── Clean 3-Step Wizard Modal for Creating / Editing Menu Items ── */
export function MenuItemDetailModal({
  isOpen,
  onClose,
  onSave,
  editItem = null,
  stockList = [],
  actor = 'Staff'
}) {
  const { lang, getCategoryName } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';

  if (!isOpen) return null;

  const isEditing = !!editItem;

  // Wizard Step State (1: Taarifa / Info, 2: Bei / Pricing & Stock, 3: Picha & Hakiki / Photo)
  const [step, setStep] = useState(1);
  const [validationErr, setValidationErr] = useState('');

  // Form Fields
  const [name, setName] = useState(editItem?.n || '');
  const [category, setCategory] = useState(editItem?.c || 'Grills');
  const [price, setPrice] = useState(editItem ? String(editItem.p) : '15000');
  const [costPrice, setCostPrice] = useState(editItem ? String(editItem.costPrice || 0) : '5000');
  const [description, setDescription] = useState(editItem?.d || '');
  const [station, setStation] = useState(editItem?.station || (category === 'Drinks' ? 'bar' : 'grill'));
  const [prepTime, setPrepTime] = useState(editItem ? String(editItem.t || 15) : '15');
  const [rating, setRating] = useState(editItem ? String(editItem.r || 4.8) : '4.8');
  const [image, setImage] = useState(
    editItem?.img || 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80'
  );
  const [selectedStockId, setSelectedStockId] = useState(editItem?.stockId || '');
  const [packMultiplier, setPackMultiplier] = useState(editItem ? String(editItem.packMultiplier || 1) : '1');
  const [allergens, setAllergens] = useState(editItem?.allergens || []);
  const [isSpecial, setIsSpecial] = useState(editItem ? !!editItem.isSpecial : true);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (editItem) {
      setName(editItem.n || '');
      setCategory(editItem.c || 'Grills');
      setPrice(String(editItem.p || 0));
      setCostPrice(String(editItem.costPrice || 0));
      setDescription(editItem.d || '');
      setStation(editItem.station || (editItem.c === 'Drinks' ? 'bar' : 'grill'));
      setPrepTime(String(editItem.t || 15));
      setRating(String(editItem.r || 4.8));
      setImage(editItem.img || 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80');
      setSelectedStockId(editItem.stockId || '');
      setPackMultiplier(String(editItem.packMultiplier || 1));
      setAllergens(editItem.allergens || []);
      setIsSpecial(!!editItem.isSpecial);
      setStep(1);
    }
  }, [editItem]);

  // Image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(isSw ? 'Tafadhali chagua picha halali (PNG, JPG, WebP).' : 'Please choose a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(isSw ? 'Ukubwa wa picha umezidi 5MB.' : 'Image size must be under 5MB.');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleAllergen = (al) => {
    setAllergens(prev =>
      prev.includes(al) ? prev.filter(x => x !== al) : [...prev, al]
    );
  };

  // Profit calculations
  const numPrice = Number(price) || 0;
  const numCost = Number(costPrice) || 0;
  const grossProfit = Math.max(0, numPrice - numCost);
  const marginPct = numPrice > 0 ? ((grossProfit / numPrice) * 100).toFixed(1) : '0.0';

  // Fast 1-tap template presets (clean pills)
  const quickPresets = [
    { name: isSw ? 'Nyama Choma Ribeye 350g' : 'Flame-Grilled Ribeye 350g', c: 'Grills', p: '28000', cost: '9500', st: 'grill', t: '18', icon: '🥩', img: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80' },
    { name: isSw ? 'Kuku Choma Nusu' : 'Roasted Chicken Half', c: 'Grills', p: '18000', cost: '6000', st: 'grill', t: '15', icon: '🍗', img: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&auto=format&fit=crop&q=80' },
    { name: isSw ? 'Mishkaki ya Ng\'ombe' : 'Swahili Beef Mishkaki', c: 'Grills', p: '16000', cost: '4800', st: 'grill', t: '12', icon: '🍢', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80' },
    { name: isSw ? 'Baga ya Nyama (Steakhouse)' : 'Gourmet Steakhouse Burger', c: 'Burgers', p: '15000', cost: '4500', st: 'grill', t: '10', icon: '🍔', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80' },
    { name: isSw ? 'Piza ya Jibini (Mozzarella)' : 'Stone-Baked Mozzarella Pizza', c: 'Pizza', p: '16000', cost: '4200', st: 'pizza', t: '12', icon: '🍕', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80' },
    { name: isSw ? 'Chipsi Masala' : 'Crispy Masala Fries', c: 'Snacks', p: '6000', cost: '1800', st: 'fry', t: '8', icon: '🍟', img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80' },
    { name: isSw ? 'Soda ya Chupa 500ml' : 'Soda 500ml Bottle', c: 'Drinks', p: '2000', cost: '1000', st: 'bar', t: '1', icon: '🥤', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80' },
    { name: isSw ? 'Bia ya Safari Lager' : 'Safari Lager Bottle', c: 'Drinks', p: '4500', cost: '2200', st: 'bar', t: '1', icon: '🍺', img: 'https://images.unsplash.com/photo-1608270191295-829d2b2ecbe3?w=600&auto=format&fit=crop&q=80' }
  ];

  const applyPreset = (p) => {
    setName(p.name);
    setCategory(p.c);
    setPrice(p.p);
    setCostPrice(p.cost);
    setStation(p.st);
    setPrepTime(p.t);
    setImage(p.img);
    setValidationErr('');
  };

  // Step transitions
  const handleNext = () => {
    setValidationErr('');
    if (step === 1) {
      if (!name.trim()) {
        setValidationErr(isSw ? 'Tafadhali weka jina la chakula au kinywaji.' : 'Please enter the item name.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!numPrice || numPrice <= 0) {
        setValidationErr(isSw ? 'Weka bei halali ya kuuza (zaidi ya 0 TSh).' : 'Please enter a valid selling price (> 0).');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setValidationErr('');
    if (step > 1) setStep(step - 1);
    else onClose();
  };

  const handleFinish = (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setStep(1);
      setValidationErr(isSw ? 'Tafadhali weka jina la chakula.' : 'Please enter the item name.');
      return;
    }

    const payload = {
      n: name.trim(),
      c: category,
      p: numPrice || 1000,
      costPrice: numCost,
      d: description.trim() || `${name.trim()} - Safari Grill & Lounge.`,
      station,
      t: Number(prepTime) || 12,
      r: Number(rating) || 4.8,
      img: image,
      stockId: selectedStockId || null,
      packMultiplier: Number(packMultiplier) || 1,
      allergens,
      isSpecial,
      needsReview: false,
      e: category === 'Drinks' ? '🍹' : category === 'Burgers' ? '🍔' : category === 'Pizza' ? '🍕' : '🍽️'
    };

    onSave(payload, editItem?.id);
    onClose();
  };

  return (
    <div className="ov" onClick={onClose} style={{ zIndex: 1200, padding: '20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="sh"
        style={{
          width: 'min(640px, 96vw)',
          maxWidth: 640,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          background: 'var(--card)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Clean Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #093B2F 0%, #0E5A47 100%)',
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.16)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22
              }}
            >
              🍽️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff' }}>
                {isEditing
                  ? (isSw ? `Hariri: ${editItem.n}` : `Edit: ${editItem.n}`)
                  : (isSw ? 'Ongeza Chakula / Kinywaji' : 'Create Menu Item')}
              </h3>
              <small style={{ color: '#cfe8df', fontSize: 12 }}>
                {isSw ? `Hatua ya ${step} ya 3` : `Step ${step} of 3`}
              </small>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: 14,
              fontWeight: 700
            }}
            title={isSw ? 'Funga' : 'Close'}
          >
            ✕
          </button>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)', padding: '10px 18px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            {[
              { num: 1, labelSw: 'Taarifa', labelEn: 'Basic Info', icon: '📝' },
              { num: 2, labelSw: 'Bei na Stoo', labelEn: 'Pricing', icon: '💰' },
              { num: 3, labelSw: 'Picha na Hakiki', labelEn: 'Photo & Review', icon: '📷' }
            ].map(s => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step || (step === 1 && name.trim())) {
                      setStep(s.num);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 12,
                    background: isActive ? '#0E5A47' : isDone ? '#E5F2EE' : 'transparent',
                    color: isActive ? '#fff' : isDone ? '#0E5A47' : 'var(--mut)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: (s.num <= step || name.trim()) ? 'pointer' : 'default',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: isActive ? 'rgba(255,255,255,0.25)' : isDone ? '#0E5A47' : 'rgba(0,0,0,0.08)',
                      color: isDone ? '#fff' : 'inherit',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 800
                    }}
                  >
                    {isDone ? '✓' : s.num}
                  </span>
                  <span>{isSw ? s.labelSw : s.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Progress Indicator line */}
          <div style={{ width: '100%', height: 3, background: 'var(--line)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
            <div
              style={{
                width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%',
                height: '100%',
                background: '#0E5A47',
                transition: 'width 0.25s ease'
              }}
            />
          </div>
        </div>

        {/* Validation Warning Alert */}
        {validationErr && (
          <div style={{ background: '#FEE2E2', borderLeft: '4px solid #EF4444', padding: '9px 16px', color: '#B91C1C', fontSize: 13, fontWeight: 600 }}>
            ⚠️ {validationErr}
          </div>
        )}

        {/* Wizard Step Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {/* ═════════════════ STEP 1: BASIC INFO ═════════════════ */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Quick Preset Chips */}
              <div>
                <small style={{ color: 'var(--mut)', fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 6 }}>
                  ⚡ {isSw ? 'Chagua Haraka Kiolezo (Hiari):' : '1-Tap Quick Templates (Optional):'}
                </small>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  {quickPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(p)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 10,
                        border: '1px solid var(--line)',
                        background: 'var(--bg)',
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <span>{p.icon}</span>
                      <span>{p.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 5 }}>
                  {isSw ? 'Jina la Chakula au Kinywaji *' : 'Dish or Drink Name *'}
                </label>
                <input
                  type="text"
                  className="inp"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (validationErr) setValidationErr('');
                  }}
                  placeholder={isSw ? 'Mfano: Nyama Choma ya Mbuzi, Kuku Kavu, Soda...' : 'e.g. Flame-Grilled Serengeti Ribeye 350g'}
                  style={{ fontSize: 15, fontWeight: 600, margin: 0, padding: '11px 14px' }}
                  autoFocus
                />
              </div>

              {/* Category Pills */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  {isSw ? 'Kitengo (Category) *' : 'Category *'}
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CATS.filter(x => x !== 'All').map(cat => {
                    const isSel = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategory(cat);
                          if (cat === 'Drinks') setStation('bar');
                          else if (cat === 'Pizza') setStation('pizza');
                          else if (cat === 'Salads') setStation('salad');
                          else if (cat === 'Desserts') setStation('dessert');
                          else setStation('grill');
                        }}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 12,
                          border: isSel ? '2px solid #0E5A47' : '1px solid var(--line)',
                          background: isSel ? '#E5F2EE' : 'var(--bg)',
                          color: isSel ? '#0E5A47' : 'var(--tx)',
                          fontWeight: isSel ? 800 : 600,
                          fontSize: 12.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span>{CAT_ICONS[cat] || '🍽️'}</span>
                        <span>{getCategoryName ? getCategoryName(cat) : cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kitchen Station & Prep Time Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 5 }}>
                    {isSw ? 'Sehemu ya Maandalizi' : 'Kitchen Station'}
                  </label>
                  <select
                    className="inp"
                    value={station}
                    onChange={e => setStation(e.target.value)}
                    style={{ margin: 0, padding: '10px 12px', fontSize: 13.5 }}
                  >
                    <option value="grill">🔥 {isSw ? 'Jiko la Choma (Grill)' : 'Grill Station'}</option>
                    <option value="bar">🍹 {isSw ? 'Kaunta ya Vinywaji (Bar)' : 'Bar & Beverage Counter'}</option>
                    <option value="pizza">🍕 {isSw ? 'Sehemu ya Piza (Pizza)' : 'Pizza Oven'}</option>
                    <option value="fry">🍟 {isSw ? 'Kaango (Fryer Station)' : 'Deep Fryer'}</option>
                    <option value="salad">🥗 {isSw ? 'Saladi na Baridi (Salad)' : 'Cold Pantry & Salad'}</option>
                    <option value="dessert">🍰 {isSw ? 'Vitamu (Desserts)' : 'Pastry & Dessert'}</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 5 }}>
                    {isSw ? 'Muda wa Kupika (Dakika)' : 'Prep Time (Minutes)'}
                  </label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {['5', '10', '15', '20'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPrepTime(m)}
                        style={{
                          flex: 1,
                          padding: '9px 0',
                          borderRadius: 10,
                          border: prepTime === m ? '1.5px solid #0E5A47' : '1px solid var(--line)',
                          background: prepTime === m ? '#E5F2EE' : 'var(--bg)',
                          color: prepTime === m ? '#0E5A47' : 'var(--tx)',
                          fontWeight: prepTime === m ? 800 : 600,
                          fontSize: 12,
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  {isSw ? 'Maelezo Mafupi (Hiari)' : 'Short Description (Optional)'}
                </label>
                <input
                  type="text"
                  className="inp"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={isSw ? 'Mfano: Inachomwa na viungo asilia na kachumbari...' : 'e.g. Served fresh with herb butter and seasonal greens'}
                  style={{ margin: 0, fontSize: 13, padding: '9px 12px' }}
                />
              </div>
            </div>
          )}

          {/* ═════════════════ STEP 2: PRICING & STOCK ═════════════════ */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Selling Price */}
              <div style={{ background: '#F8FAFC', border: '1.5px solid var(--line)', borderRadius: 16, padding: '16px' }}>
                <label style={{ fontSize: 13, fontWeight: 800, color: '#0E5A47', display: 'block', marginBottom: 6 }}>
                  {isSw ? 'Bei ya Kuuza kwa Mteja (TSh) *' : 'Customer Selling Price (TSh) *'}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 14, fontWeight: 800, fontSize: 16, color: '#0E5A47' }}>
                    TSh
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="inp"
                    value={price}
                    onChange={e => {
                      setPrice(e.target.value);
                      if (validationErr) setValidationErr('');
                    }}
                    placeholder="15000"
                    style={{
                      margin: 0,
                      padding: '12px 14px 12px 55px',
                      fontSize: 22,
                      fontWeight: 800,
                      color: '#0E5A47',
                      background: '#fff'
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Cost Price */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 5 }}>
                  {isSw ? 'Gharama ya Kutengeneza / Kununua (TSh)' : 'Cost Price (TSh)'}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 14, fontWeight: 700, fontSize: 14, color: 'var(--mut)' }}>
                    TSh
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="inp"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    placeholder="5000"
                    style={{ margin: 0, padding: '10px 14px 10px 52px', fontSize: 16, fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Live Profit Margin Card */}
              <div
                style={{
                  background: Number(marginPct) >= 50 ? '#F0FDF4' : Number(marginPct) >= 25 ? '#FFFBEB' : '#FEF2F2',
                  border: `1.5px solid ${Number(marginPct) >= 50 ? '#86EFAC' : Number(marginPct) >= 25 ? '#FCD34D' : '#FCA5A5'}`,
                  borderRadius: 14,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <small style={{ color: 'var(--mut)', fontWeight: 700, display: 'block' }}>
                    {isSw ? 'Faida ya Mauzo (Gross Profit):' : 'Estimated Gross Profit:'}
                  </small>
                  <b style={{ fontSize: 17, color: Number(marginPct) >= 50 ? '#15803D' : '#B45309' }}>
                    +TSh {fmtNum(grossProfit)}
                  </b>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small style={{ color: 'var(--mut)', fontWeight: 700, display: 'block' }}>
                    {isSw ? 'Asilimia ya Faida:' : 'Profit Margin:'}
                  </small>
                  <span
                    style={{
                      background: Number(marginPct) >= 50 ? '#DCFCE7' : '#FEF3C7',
                      color: Number(marginPct) >= 50 ? '#15803D' : '#B45309',
                      padding: '3px 10px',
                      borderRadius: 99,
                      fontWeight: 800,
                      fontSize: 14
                    }}
                  >
                    {marginPct}%
                  </span>
                </div>
              </div>

              {/* Link to Inventory Stock */}
              {stockList && stockList.length > 0 && (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>
                      📦 {isSw ? 'Unganisha na Stoo (Hiari):' : 'Link with Inventory Stock (Optional):'}
                    </label>
                    <small style={{ color: 'var(--mut)' }}>
                      {isSw ? 'Inapunguza stoo kiotomatiki' : 'Auto-deducts on order'}
                    </small>
                  </div>

                  <select
                    className="inp"
                    value={selectedStockId}
                    onChange={e => setSelectedStockId(e.target.value)}
                    style={{ margin: '0 0 10px', padding: '9px 12px', fontSize: 13.5 }}
                  >
                    <option value="">{isSw ? '-- Hakuna muunganisho wa stoo --' : '-- No inventory link --'}</option>
                    {stockList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.stock || s.qty || 0} {s.baseUnit || s.uom || 'pcs'} {isSw ? 'kwenye stoo' : 'in stock'})
                      </option>
                    ))}
                  </select>

                  {selectedStockId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', padding: '8px 12px', borderRadius: 10 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {isSw ? 'Idadi inayopunguzwa kwa kila oda:' : 'Deduction per order:'}
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={packMultiplier}
                        onChange={e => setPackMultiplier(e.target.value)}
                        style={{ width: 60, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--line)', fontWeight: 700, textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--mut)' }}>
                        {isSw ? 'chupa / vipande' : 'units'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═════════════════ STEP 3: PHOTO & REVIEW ═════════════════ */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* POS Card Live Preview */}
              <div>
                <small style={{ color: 'var(--mut)', fontWeight: 700, fontSize: 11, display: 'block', marginBottom: 6 }}>
                  📱 {isSw ? 'Muonekano Kwenye POS na Menyu:' : 'Live POS & Customer Menu Preview:'}
                </small>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    background: 'var(--bg)',
                    border: '1.5px solid var(--line)',
                    borderRadius: 18,
                    padding: '12px',
                    alignItems: 'center'
                  }}
                >
                  <img
                    src={image}
                    alt={name}
                    style={{ width: 80, height: 80, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#E5F2EE', color: '#0E5A47', fontWeight: 800 }}>
                        {category}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--mut)' }}>⏱️ {prepTime}m</span>
                      {isSpecial && (
                        <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 99, background: '#FFEDD5', color: '#C2410C', fontWeight: 800 }}>
                          ★ {isSw ? 'Maalum' : 'Special'}
                        </span>
                      )}
                    </div>
                    <b style={{ fontSize: 15, color: 'var(--tx)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {name || (isSw ? 'Jina la Chakula' : 'Item Name')}
                    </b>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#0E5A47' }}>
                      TSh {fmtNum(numPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Photo Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>
                    {isSw ? 'Chagua Picha ya Chakula:' : 'Choose Item Photo:'}
                  </label>
                  <label
                    htmlFor="wizard-photo-upload"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#0E5A47',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>📷</span>
                    <span>{isSw ? 'Pakia kutoka simu/kifaa' : 'Upload photo'}</span>
                  </label>
                  <input
                    id="wizard-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>

                {uploadError && (
                  <small style={{ color: '#EF4444', fontWeight: 700, display: 'block', marginBottom: 6 }}>{uploadError}</small>
                )}

                {/* 1-Tap Quick Photo Gallery */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {PHOTO_GALLERY.map((item, idx) => {
                    const isSel = image === item.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImage(item.url)}
                        style={{
                          position: 'relative',
                          padding: 0,
                          borderRadius: 12,
                          overflow: 'hidden',
                          border: isSel ? '2.5px solid #0E5A47' : '1px solid var(--line)',
                          cursor: 'pointer',
                          background: 'none',
                          aspectRatio: '1 / 1'
                        }}
                      >
                        <img
                          src={item.url}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {isSel && (
                          <div style={{ position: 'absolute', top: 4, right: 4, background: '#0E5A47', color: '#fff', width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}>
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Chef Feature Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg)',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid var(--line)'
                }}
              >
                <div>
                  <b style={{ fontSize: 13.5, display: 'block' }}>
                    ⭐ {isSw ? 'Weka kama Pendekezo Maalum (Special)' : 'Feature as Chef Special'}
                  </b>
                  <small style={{ color: 'var(--mut)', fontSize: 11.5 }}>
                    {isSw ? 'Itaonekana juu kwenye menyu ya mteja' : 'Appears prominently on digital menu'}
                  </small>
                </div>
                <input
                  type="checkbox"
                  checked={isSpecial}
                  onChange={e => setIsSpecial(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: '#0E5A47', cursor: 'pointer' }}
                />
              </div>

              {/* Allergen Chips */}
              <div>
                <small style={{ color: 'var(--mut)', fontWeight: 700, fontSize: 11.5, display: 'block', marginBottom: 6 }}>
                  ⚠️ {isSw ? 'Tahadhari ya Mzio (Allergens):' : 'Allergen Tags:'}
                </small>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ALLERGEN_OPTIONS.map(al => {
                    const isSel = allergens.includes(al);
                    return (
                      <button
                        key={al}
                        type="button"
                        onClick={() => toggleAllergen(al)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: 8,
                          border: isSel ? '1px solid #FF6B2C' : '1px solid var(--line)',
                          background: isSel ? '#FFEDD5' : 'var(--bg)',
                          color: isSel ? '#C2410C' : 'var(--mut)',
                          fontSize: 11.5,
                          fontWeight: isSel ? 700 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        {al} {isSel && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div
          style={{
            padding: '14px 20px',
            background: 'var(--bg)',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0
          }}
        >
          <button
            type="button"
            className="btn ghost sm"
            onClick={handleBack}
            style={{ borderRadius: 12, padding: '10px 18px', fontWeight: 700, fontSize: 13.5 }}
          >
            {step === 1 ? (isSw ? 'Ghairi' : 'Cancel') : (isSw ? '‹ Rudi' : '‹ Back')}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {step < 3 ? (
              <button
                type="button"
                className="btn sm"
                onClick={handleNext}
                style={{
                  background: '#0E5A47',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '10px 22px',
                  fontWeight: 800,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{isSw ? 'Endelea' : 'Next'}</span>
                <span>➔</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn o sm"
                onClick={handleFinish}
                style={{
                  background: 'linear-gradient(135deg, #0E5A47, #15803D)',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '11px 24px',
                  fontWeight: 800,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(14,90,71,0.35)'
                }}
              >
                <span>✓</span>
                <span>
                  {isEditing
                    ? (isSw ? 'Hifadhi Mabadiliko' : 'Save Changes')
                    : (isSw ? 'Tengeneza Chakula' : 'Create Menu Item')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
