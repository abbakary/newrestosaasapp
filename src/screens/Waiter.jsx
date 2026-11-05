import React, { useState, useEffect, useRef, useContext } from 'react';
import { fmt, tot } from '../data';
import { Ctx } from '../store';
import { Hd, OC, Pill, Tabs, TopBar } from '../components/ui';
import { CartBar, Checkout, Menu } from '../components/Ordering';

export function Waiter({ sess, out, preview, setSess, setV }) {
  const { S, A, wn, lang } = useContext(Ctx);
  const isSw = (lang || 'sw') === 'sw';
  const [tab, setTab] = useState('orders');
  const [f, setF] = useState('live');
  const [cart, setCart] = useState([]);
  const [co, setCo] = useState(false);
  const [toast, setToast] = useState('');
  const [cp, setCp] = useState(false);

  const me = (S.waiters || []).find(w => w.id === sess?.wid) || (S.waiters || [])[0] || { id: 'w1', name: 'Amani Juma', tok: 'amani-7QK2' };
  const sw = { ...sess, wid: me.id };

  const mine = (S.orders || []).filter(o => o.wid === me.id);
  const live = mine.filter(o => !['paid', 'closed', 'cancelled'].includes(o.st));

  // Audio/Visual toast on new order
  const pc = useRef(mine.length);
  useEffect(() => {
    if (mine.length > pc.current) {
      const latest = mine[0];
      setToast(isSw
        ? `🔔 Oda Mpya ${latest?.no || ''} kwa Meza ${latest?.tb || ''}!`
        : `🔔 New Order ${latest?.no || ''} for Table ${latest?.tb || ''}!`);
      setTimeout(() => setToast(''), 4500);
    }
    pc.current = mine.length;
  }, [mine.length, isSw]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://order.dukadigital.co.tz';
  const link = `${origin}/restaurant/safari-grill/w/${me.tok}`;

  const led = (S.ledger || []).filter(l => l.wid === me.id);
  const sum = s => led.filter(l => l.st === s).reduce((a, l) => a + l.amt, 0);

  const nxt = {
    placed: 'accepted',
    accepted: 'preparing',
    preparing: 'ready',
    ready: 'served'
  };

  const policy = S.policy || { method: 'percent', rate: 5, fixed: 2000, basis: 'gross' };
  const waiterRate = (policy.overrides && policy.overrides[me.id]) !== undefined ? policy.overrides[me.id] : policy.rate;

  return (
    <div className="app">
      <TopBar sess={sess} setSess={setSess} setV={setV} currentView="waiter" />

      {toast && <div className="toast">🔥 {toast}</div>}

      {tab === 'orders' && (
        <>
          <Hd s={isSw ? `Dashibodi ya Mhudumu · ${me.name}` : `Waiter Console · ${me.name}`} t={isSw ? 'Daftari la Oda Zangu' : 'My Orders Register'} />

          <div className="seg">
            {[
              ['live', isSw ? `Huduma Inaendelea (${live.length})` : `Live Service (${live.length})`],
              ['all', isSw ? `Oda Zote za Zamu (${mine.length})` : `All Shift Orders (${mine.length})`]
            ].map(([k, l]) => (
              <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>
                {l}
              </button>
            ))}
          </div>

          {!(f === 'live' ? live : mine).length && (
            <div className="card" style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🍽️</div>
              <p style={{ fontWeight: 600 }}>{isSw ? 'Hakuna oda katika mtazamo huu' : 'No orders in this view'}</p>
              <small>{isSw ? 'Chukua oda ya mteja wa kupita au shiriki kiungo chako na wageni.' : 'Take a walk-in order or share your personal link with diners.'}</small>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn sm o" onClick={() => setTab('new')}>+ {isSw ? 'Oda Mpya' : 'Walk-in Order'}</button>
                <button className="btn sm ghost" onClick={() => setTab('link')}>🔗 {isSw ? 'Shiriki Kiungo' : 'Share Link'}</button>
              </div>
            </div>
          )}

          {(f === 'live' ? live : mine).map(o => (
            <OC key={o.id} o={o}>
              {nxt[o.st] && (
                <button
                  className="btn ghost sm"
                  onClick={() => A.st(o.id, nxt[o.st], me.name)}
                >
                  {o.st === 'ready' ? (isSw ? '✓ Imekabidhiwa Mezani' : '✓ Mark Served') : (isSw ? 'Jikoni: Hatua Ijayo ▸' : 'Kitchen: Next ▸')}
                </button>
              )}

              {o.st === 'served' && !o.paid && (
                <button
                  className="btn ghost sm"
                  onClick={() => A.st(o.id, 'billreq', me.name)}
                >
                  {isSw ? 'Omba Bili' : 'Request Bill'}
                </button>
              )}

              {['served', 'billreq'].includes(o.st) && !o.paid && (
                <button
                  className="btn sm"
                  onClick={() => A.pay(o.id, 'cash', 'WAITER_CASH', me.name)}
                >
                  💵 {isSw ? 'Pokea Pesa Taslimu' : 'Take Cash'}
                </button>
              )}
            </OC>
          ))}

          <div style={{ marginTop: 14, padding: 10, background: 'rgba(0,0,0,0.03)', borderRadius: 12, fontSize: 13, color: 'var(--mut)' }}>
            💡 <b>{isSw ? 'Maelezo ya Mtiririko:' : 'Workflow Note:'}</b> {isSw ? 'Wateja wanapoagiza kupitia kiungo chako au QR ya meza, tiketi zinaonekana hapa papo hapo na kwenda moja kwa moja Jikoni (KDS).' : 'When customers order through your link or table QR, tickets appear here instantly and route directly to the Kitchen KDS.'}
          </div>
        </>
      )}

      {tab === 'new' && (
        <>
          <Hd s={isSw ? 'Kula Mezani au Kuchukua Nje' : 'Walk-in Dine-in or Takeaway'} t={isSw ? 'Chukua Oda' : 'Take Order'} />
          <Menu cart={cart} setCart={setCart} isPosMode={false} onOpenCart={() => setCo(true)} />
          <CartBar cart={cart} open={() => setCo(true)} />
        </>
      )}

      {tab === 'link' && (
        <>
          <Hd s={isSw ? 'Oda za Wateja Zinazohusishwa Nawe' : 'Customer Orders Attributed to You'} t={isSw ? 'Kiungo Changu cha Oda' : 'My Ordering Link'} />
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 32 }}>🔗</span>
              <div>
                <b style={{ fontSize: 17 }}>{isSw ? 'Kiungo Chako Maalum cha Mteja' : 'Your Dedicated Customer Link'}</b>
                <div style={{ color: 'var(--mut)', fontSize: 13 }}>{isSw ? 'Wateja wanaofungua kiungo hiki wanakupa kamisheni kiotomatiki.' : 'Customers who open this link automatically credit you with commission.'}</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 12, wordBreak: 'break-all', fontWeight: 600, fontSize: 14, margin: '12px 0', border: '1px solid var(--line)' }}>
              {link}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <button
                className="btn"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(link);
                  } catch (e) {}
                  setCp(true);
                  setTimeout(() => setCp(false), 2000);
                }}
              >
                {cp ? (isSw ? '✓ Kiungo Kimenakiliwa!' : '✓ Link Copied to Clipboard!') : (isSw ? '📋 Nakili Kiungo' : '📋 Copy Link')}
              </button>

              <a
                className="btn o"
                style={{ textDecoration: 'none' }}
                href={`https://wa.me/?text=${encodeURIComponent((isSw ? 'Habari! Tazama menyu ya Safari Grill na uagize moja kwa moja mezani kwako hapa: ' : 'Hi! View the Safari Grill menu and order directly to our table here: ') + link)}`}
                target="_blank"
                rel="noreferrer"
              >
                💬 {isSw ? 'Shiriki kwa WhatsApp' : 'Share on WhatsApp'}
              </a>

              <a
                className="btn ghost"
                style={{ textDecoration: 'none' }}
                href={`sms:?&body=${encodeURIComponent((isSw ? 'Agiza kutoka Safari Grill: ' : 'Order from Safari Grill: ') + link)}`}
              >
                ✉️ {isSw ? 'Shiriki kwa SMS' : 'Share by SMS'}
              </a>

              <button
                className="btn ghost"
                onClick={() => preview(me.id)}
              >
                👀 {isSw ? 'Hakiki Mtazamo wa Mteja (Mezani)' : 'Preview Customer View (As Table Diner)'}
              </button>

              <button
                className="btn ghost"
                style={{ color: '#FF3B30' }}
                onClick={() => {
                  A.rot(me.id, me.name);
                  setToast(isSw ? 'Kiungo kimebadilishwa! Msimbo mpya umetengenezwa na wa zamani umefungwa.' : 'Rotated link! A new token has been generated and the old link revoked.');
                }}
              >
                🔄 {isSw ? 'Badili Msimbo (Futa Kiungo cha Zamani)' : 'Rotate Token (Revoke Old Link)'}
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <b>{isSw ? 'Kanuni za Usalama na Msimbo (SRS NFR-21):' : 'Security & Token Rules (SRS NFR-21):'}</b>
            <p style={{ fontSize: 13, color: 'var(--mut)', margin: '6px 0' }}>
              {isSw ? 'Kiungo chako kinamtambulisha mhudumu wa kupewa kamisheni. Hakimuingizi mteja kwenye akaunti yako ya kazi, na ukikibadilisha, kiungo cha zamani kinacha kufanya kazi mara moja.' : 'Your link identifies the waiter to credit orders to. It never logs the customer into your staff account, and rotating it immediately renders old links invalid.'}
            </p>
          </div>
        </>
      )}

      {tab === 'earn' && (
        <>
          <Hd
            s={isSw ? `Sera: ${policy.method === 'fixed' ? fmt(policy.fixed) + ' kwa oda' : waiterRate + '% ya ' + policy.basis}` : `Policy: ${policy.method === 'fixed' ? fmt(policy.fixed) + ' per order' : waiterRate + '% of ' + policy.basis}`}
            t={isSw ? 'Kamisheni na Mapato' : 'Commission & Earnings'}
          />

          <div className="tiles">
            {[
              [isSw ? 'Inasubiri Idhini' : 'Pending Approval', 'pending', '#FF9500'],
              [isSw ? 'Imeidhinishwa Kulipwa' : 'Approved for Payout', 'approved', '#007AFF'],
              [isSw ? 'Imelipwa Kwako' : 'Paid Out to You', 'paid', '#15803D']
            ].map(([label, stKey, color]) => (
              <div key={stKey} className="card">
                <small>{label}</small>
                <b style={{ color, fontSize: 22 }}>{fmt(sum(stKey))}</b>
              </div>
            ))}
          </div>

          <p className="sec" style={{ marginTop: 16 }}>{isSw ? 'Miamala ya Kamisheni' : 'Ledger Activity'}</p>

          {!led.length && (
            <div className="card">
              <small>{isSw ? 'Kumbukumbu za kamisheni zinaingia mara tu malipo ya mteja yakithibitishwa na keshia au mtandao wa simu.' : 'Commission records post once customer payment is confirmed by cashier or mobile money.'}</small>
            </div>
          )}

          {led.map(l => {
            const o = (S.orders || []).find(x => x.id === l.oid) || { no: `#${l.oid}`, tb: '–' };
            const isRev = l.st === 'reversed';

            return (
              <div key={l.id} className="card row" style={{ marginBottom: 8, opacity: isRev ? 0.6 : 1 }}>
                <div>
                  <b>{o.no} · {o.tb}</b>
                  <br />
                  <small style={{ color: 'var(--mut)' }}>
                    {l.method === 'fixed' ? (isSw ? 'Kiwango maalum' : 'Fixed fee') : `${l.rate}% · ${l.basis}`} · {new Date(l.t).toLocaleTimeString()}
                  </small>
                  {l.note && <div style={{ fontSize: 12, color: 'var(--mut)' }}>{l.note}</div>}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <b style={{ color: isRev ? '#FF3B30' : 'inherit', fontSize: 17 }}>
                    {isRev ? `-${fmt(Math.abs(l.amt))}` : fmt(l.amt)}
                  </b>
                  <br />
                  <Pill st={l.st === 'pending' ? 'placed' : l.st === 'approved' ? 'ready' : l.st === 'paid' ? 'paid' : 'cancelled'} />
                </div>
              </div>
            );
          })}

          <button className="btn ghost" style={{ marginTop: 16 }} onClick={out}>
            {isSw ? 'Ondoka Kwenye Akaunti ya Mhudumu' : 'Sign Out of Waiter Console'}
          </button>
        </>
      )}

      {co && (
        <Checkout
          cart={cart}
          setCart={setCart}
          mode="waiter"
          sess={sw}
          close={() => setCo(false)}
          onPlaced={() => {
            setCo(false);
            setTab('orders');
          }}
        />
      )}

      <Tabs
        cur={tab}
        set={setTab}
        tabs={[
          ['orders', isSw ? 'Oda' : 'Orders', '🧾', live.filter(o => o.st === 'placed').length],
          ['new', isSw ? 'Chukua Oda' : 'Take Order', '➕', 0],
          ['link', isSw ? 'Shiriki Kiungo' : 'Share Link', '🔗', 0],
          ['earn', isSw ? 'Kamisheni' : 'Earnings', '💰', 0]
        ]}
      />
    </div>
  );
}
