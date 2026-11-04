import React, { useState, useContext, useEffect } from 'react';
import { M, fmt, tot, calcNet, calcTax } from '../data';
import { Ctx } from '../store';
import { Hd, Install, Pill, Receipt, Tabs, Track, TopBar } from '../components/ui';
import { CartBar, Checkout, Menu } from '../components/Ordering';

export function Customer({ sess, out, via, setVia, setSess, setV }) {
  const { S, A, wn, lang, getMenuName } = useContext(Ctx);
  const isSw = lang === 'sw';
  const [tab, setTab] = useState('menu');
  const [cart, setCart] = useState([]);
  const [co, setCo] = useState(false);
  const [busyPay, setBusyPay] = useState(0);
  const [rc, setRc] = useState(null);
  const [tb, setTb] = useState(via?.tb || '');
  const [billToast, setBillToast] = useState('');
  const [momoModal, setMomoModal] = useState(null);

  const mine = (S.orders || []).filter(o => o.cust === sess?.id);

  // Bill request action
  const requestBill = orderId => {
    A.st(orderId, 'billreq', sess?.name || (isSw ? 'Mteja' : 'Customer'));
    setBillToast(isSw ? 'Umeomba bili! Mhudumu au keshia atakuja mezani kwako sasa hivi.' : 'Bill requested! A waiter or cashier will attend to your table shortly.');
    setTimeout(() => setBillToast(''), 4000);
  };

  // Mobile money payment trigger
  const confirmMomoPayment = orderId => {
    setBusyPay(orderId);
    setTimeout(() => {
      const txRef = 'MP' + Math.random().toString(36).slice(2, 8).toUpperCase();
      A.pay(orderId, 'momo', txRef, 'Customer Mobile Push');
      setBusyPay(0);
      setMomoModal(null);
      setBillToast(isSw ? '✓ Malipo yamethibitishwa! Asante sana kwa kula nasi Safari Grill.' : '✓ Payment verified! Thank you for dining with Safari Grill.');
      setTimeout(() => setBillToast(''), 4500);
    }, 1200);
  };

  const hero = (
    <div className="hero">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <small>{isSw ? 'Safari Grill & Lounge · Wazi kila siku 11:00 – 23:00' : 'Safari Grill & Lounge · Open daily 11:00 – 23:00'}</small>
          <h2>{isSw ? 'Vyakula vitamu vya choma, mezani kwako' : 'Fire-grilled, shared, served to your table'}</h2>
        </div>
      </div>

      <div style={{ margin: '8px 0' }}>
        <span className="chip">★ 4.8 ({isSw ? 'maoni 312' : '312 reviews'})</span>
        <span className="chip">📍 Masaki, Dar es Salaam</span>
        {via?.wid && <span className="chip" style={{ background: '#FF6B2C' }}>{isSw ? 'Mhudumu:' : 'Served by'} {wn(via.wid)}</span>}
        {tb && <span className="chip" style={{ background: '#0E5A47', color: '#fff' }}>{isSw ? 'Meza' : 'Table'} {tb}</span>}
      </div>

      {!tb && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn sm o" onClick={() => { setTb('T4'); setVia({ ...via, qr: true }); }}>
            📷 {isSw ? 'Skani QR ya Meza (Mfano: Meza 4)' : 'Scan Table QR (Demo: Table 4)'}
          </button>
          <button className="btn sm ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => setTb('Takeaway')}>
            🛍️ {isSw ? 'Oda ya Kuchukua (Takeaway)' : 'Order Takeaway'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="app">
      <TopBar sess={sess} setSess={setSess} setV={setV} currentView="customer" />

      {billToast && <div className="toast">🔔 {billToast}</div>}

      {tab === 'menu' && (
        <>
          <Hd s={isSw ? `Karibu, ${sess?.name || 'Mgeni'}` : `Welcome, ${sess?.name || 'Guest'}`} t={isSw ? 'Menyu ya Vyakula na Vinywaji' : 'Food & Drinks Menu'} />
          <Menu cart={cart} setCart={setCart} hero={hero} isPosMode={false} onOpenCart={() => setCo(true)} />
        </>
      )}

      {tab === 'orders' && (
        <>
          <Hd s={isSw ? 'Ufuatiliaji wa Oda na Risiti' : 'Live Tracker & Receipts'} t={isSw ? 'Oda Zangu' : 'My Orders'} />
          {!mine.length && (
            <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🧾</div>
              <p style={{ fontWeight: 600 }}>{isSw ? 'Bado hujaweka oda yoyote' : 'No orders placed yet'}</p>
              <small>{isSw ? 'Angalia menyu, chagua vyakula unavyovipenda, na ufuatilie maandalizi jikoni kwa wakati halisi.' : 'Explore the menu, pick your favorite grilled dishes, and track cooking progress in real time.'}</small>
              <button className="btn o" style={{ marginTop: 14 }} onClick={() => setTab('menu')}>
                {isSw ? 'Fungua Menyu' : 'Browse Menu'}
              </button>
            </div>
          )}

          {mine.map(o => (
            <div key={o.id} className="card oc" style={{ borderLeft: `4px solid ${o.paid ? '#15803D' : '#FF6B2C'}` }}>
              <div className="row">
                <b>{o.no} · {isSw ? 'Meza' : 'Table'} {o.tb}</b>
                <Pill st={o.st} />
              </div>

              <div style={{ margin: '6px 0' }}>
                {(o.it || []).map((l, i) => {
                  const rawItem = M[l.id] || { n: `Item #${l.id}` };
                  const itemTitle = getMenuName ? getMenuName(rawItem) : rawItem.n;
                  return (
                    <span key={i} style={{ fontSize: 14 }}>
                      {l.q}× {itemTitle}{i < o.it.length - 1 ? ', ' : ''}
                    </span>
                  );
                })}
              </div>

              <small>
                {isSw ? 'Mhudumu:' : 'Waiter:'} <b>{wn(o.wid)}</b> · {isSw ? 'Chanzo:' : 'Source:'} {o.src.replace('_', ' ').toLowerCase()}
              </small>

              <Track o={o} />

              <div className="row" style={{ marginTop: 8 }}>
                <div>
                  <b style={{ fontSize: 20 }}>{fmt(tot(o))}</b>
                  {o.paid && <span style={{ color: '#15803D', fontSize: 13, marginLeft: 6 }}>✓ {isSw ? 'Imelipwa' : 'Paid'}</span>}
                </div>

                <div className="acts">
                  {o.st === 'served' && (
                    <button className="btn ghost sm" onClick={() => requestBill(o.id)}>
                      {isSw ? 'Omba Bili' : 'Ask for Bill'}
                    </button>
                  )}

                  {['served', 'billreq'].includes(o.st) && !o.paid && (
                    <button
                      className="btn o sm"
                      onClick={() => setMomoModal(o)}
                    >
                      📱 {isSw ? 'Lipa kwa Simu' : 'Pay Mobile Money'}
                    </button>
                  )}

                  {o.paid && (
                    <button className="btn ghost sm" onClick={() => setRc(o)}>
                      {isSw ? 'Risiti' : 'Receipt'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'me' && (
        <>
          <Hd s={isSw ? 'Zawadi na Mapendekezo' : 'Safari Rewards & Preferences'} t={isSw ? 'Wasifu Wangu' : 'My Profile'} />
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--g)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 24 }}>
                🍽️
              </div>
              <div>
                <b style={{ fontSize: 18 }}>{sess?.name || (isSw ? 'Mteja Mgeni' : 'Guest Diner')}</b>
                <div style={{ color: 'var(--mut)', fontSize: 13 }}>{sess?.ph || '0712000111'} · {isSw ? 'Mwanachama' : 'Member'}</div>
              </div>
            </div>

            <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr', margin: '14px 0' }}>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 12 }}>
                <small>{isSw ? 'Oda Zilizokamilika' : 'Completed Orders'}</small>
                <b>{mine.filter(o => o.paid).length}</b>
              </div>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 12 }}>
                <small>{isSw ? 'Pointi za Zawadi' : 'Loyalty Points'}</small>
                <b style={{ color: 'var(--g)' }}>{mine.filter(o => o.paid).length * 150} pts</b>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 14 }}>
              <p><b>{isSw ? 'Mifumo ya Kuagiza:' : 'Ordering Preferences:'}</b> {isSw ? 'QR ya Meza na Viungo vya Mhudumu vimewezeshwa' : 'Direct Table QR & Waiter Links enabled'}</p>
              <p><b>{isSw ? 'Tawi la Mgahawa:' : 'Dining Location:'}</b> Masaki Flagship Restaurant</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            <Install />
            <button className="btn ghost" onClick={out}>
              {isSw ? 'Ondoka / Toka' : 'Sign out / Exit'}
            </button>
          </div>
        </>
      )}

      {tab === 'menu' && <CartBar cart={cart} open={() => setCo(true)} />}

      {co && (
        <Checkout
          cart={cart}
          setCart={setCart}
          mode="customer"
          via={via}
          tb0={tb}
          sess={sess}
          close={() => setCo(false)}
          onPlaced={() => {
            setCo(false);
            setTab('orders');
          }}
        />
      )}

      {rc && <Receipt o={rc} close={() => setRc(null)} />}

      {momoModal && (
        <Sheet title={isSw ? `Lipa Oda ${momoModal.no}` : `Pay Order ${momoModal.no}`} onClose={() => setMomoModal(null)}>
          <div className="card">
            <div className="row" style={{ marginBottom: 8 }}>
              <span>{isSw ? 'Jumla ya Bili:' : 'Total Bill:'}</span>
              <b style={{ fontSize: 20 }}>{fmt(tot(momoModal))}</b>
            </div>
            <div className="row" style={{ marginBottom: 12 }}>
              <span>{isSw ? 'Meza / Oda:' : 'Table / Order:'}</span>
              <b>{isSw ? 'Meza' : 'Table'} {momoModal.tb} ({momoModal.no})</b>
            </div>

            <p style={{ margin: '8px 0' }}><small>{isSw ? 'Chagua mtandao kwa ombi la papo hapo (STK Push):' : 'Choose provider for instant push prompt (STK Push):'}</small></p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '8px 0' }}>
              <button className="btn sm ghost active-site">M-Pesa (Vodacom)</button>
              <button className="btn sm ghost">Tigo Pesa</button>
              <button className="btn sm ghost">Airtel Money</button>
            </div>

            <input
              className="inp"
              placeholder={isSw ? 'Thibitisha Nambari ya Simu' : 'Confirm Mobile Phone'}
              defaultValue={sess?.ph || '0712000111'}
            />

            <p style={{ fontSize: 13, color: 'var(--mut)', margin: '10px 0' }}>
              {isSw ? 'Inathibitisha malipo kupitia mfumo wa mtandao (SRS PAY-03).' : 'Simulates verified provider webhook callback (SRS PAY-03).'}
            </p>

            <button
              className="btn o"
              disabled={busyPay === momoModal.id}
              onClick={() => confirmMomoPayment(momoModal.id)}
            >
              {busyPay === momoModal.id ? (isSw ? 'Inathibitisha na mtandao wa simu…' : 'Verifying with Telco Gateway…') : (isSw ? `Tuma Ombi la Simu & Lipa ${fmt(tot(momoModal))}` : `Send USSD Push & Pay ${fmt(tot(momoModal))}`)}
            </button>
          </div>
        </Sheet>
      )}

      <Tabs
        cur={tab}
        set={setTab}
        tabs={[
          ['menu', isSw ? 'Menyu' : 'Menu', '🍽️', cart.reduce((a, l) => a + l.q, 0)],
          ['orders', isSw ? 'Oda Zangu' : 'My Orders', '🧾', mine.filter(o => !o.paid && o.st !== 'cancelled').length],
          ['me', isSw ? 'Wasifu' : 'Profile', '👤', 0]
        ]}
      />
    </div>
  );
}
