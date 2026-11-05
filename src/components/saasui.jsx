import React, { useContext } from 'react';
import { Sheet } from './ui';
import { Ctx } from '../store';

/* ── date helpers ── */
export const dShort  = t => t ? new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const dTime   = t => t ? new Date(t).toLocaleString('en-GB',     { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const daysLeft = t => t ? Math.ceil((t - Date.now()) / 86400000) : null;

/* ── status colour map ── */
const META = {
  active:    ['Active',           'Inatumika',          '#15803d', '#dcfce7'],
  trial:     ['Free trial',       'Jaribio la Bure',    '#1d4ed8', '#dbeafe'],
  expired:   ['Trial expired',    'Jaribio Limeisha',   '#b45309', '#fef3c7'],
  pending:   ['Awaiting payment', 'Inasubiri Malipo',   '#a16207', '#fef9c3'],
  past_due:  ['Past due',         'Imechelewa Kulipwa', '#c2410c', '#ffedd5'],
  suspended: ['Suspended',        'Imesimamishwa',      '#b91c1c', '#fee2e2'],
  cancelled: ['Cancelled',        'Imeghairiwa',        '#4b5563', '#e5e7eb'],
  paid:      ['Paid',             'Imelipwa',           '#15803d', '#dcfce7'],
  unpaid:    ['Unpaid',           'Haijalipwa',         '#c2410c', '#ffedd5'],
  overdue:   ['Overdue',          'Imepitiliza Muda',   '#b91c1c', '#fee2e2'],
  void:      ['Void',             'Batili',             '#4b5563', '#e5e7eb'],
  refunded:  ['Refunded',         'Imerudishwa',        '#7c3aed', '#ede9fe'],
  confirmed: ['Confirmed',        'Imethibitishwa',     '#15803d', '#dcfce7'],
  rejected:  ['Rejected',         'Imekataliwa',        '#b91c1c', '#fee2e2'],
  open:      ['Open',             'Wazi',               '#b91c1c', '#fee2e2'],
  resolved:  ['Resolved',         'Imetatuliwa',        '#15803d', '#dcfce7'],
  closed:    ['Closed',           'Imefungwa',          '#4b5563', '#e5e7eb'],
  high:      ['High',             'Juu',                '#b91c1c', '#fee2e2'],
  normal:    ['Normal',           'Kawaida',            '#1d4ed8', '#dbeafe'],
  low:       ['Low',              'Chini',              '#4b5563', '#e5e7eb'],
};

export function Badge({ s, label }) {
  const { lang } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  const m = META[s] || [s, s, '#374151', '#e5e7eb'];
  return (
    <span className="sa-badge" style={{ color: m[2], background: m[3] }}>
      {label || (isSw ? m[1] : m[0])}
    </span>
  );
}

/** Pending payment shows "Pending confirm" instead of "Awaiting payment" */
export const PayBadge = ({ s }) => {
  const { lang } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  return s === 'pending'
    ? <Badge s="pending" label={isSw ? 'Inasubiri Uthibitisho' : 'Pending confirm'} />
    : <Badge s={s} />;
};

/** Invoice status including overdue */
export const invStatus = i =>
  i.status === 'unpaid' && i.dueAt < Date.now() ? 'overdue' : i.status;

/* ── form field wrapper ── */
export const Field = ({ label, hint, children, style }) => (
  <label className="sa-field" style={style}>
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

/* ── KPI stat card ── */
export const Stat = ({ icon, label, value, sub, color = '#0E5A47' }) => (
  <div className="sa-stat">
    <div className="sa-stat-ic" style={{ background: color + '18', color }}>{icon}</div>
    <div>
      <b>{value}</b>
      <span>{label}</span>
      {sub && <em>{sub}</em>}
    </div>
  </div>
);

/* ── empty state ── */
export const Empty = ({ icon = '📭', text }) => (
  <div className="sa-empty">
    <div style={{ fontSize: 34 }}>{icon}</div>
    {text}
  </div>
);

/* ── confirm modal ── */
export function Confirm({ title, msg, yes, danger, onYes, onNo }) {
  const { lang } = useContext(Ctx) || {};
  const isSw = (lang || 'sw') === 'sw';
  const yesLabel = yes || (isSw ? 'Thibitisha' : 'Confirm');
  return (
    <Sheet title={title} onClose={onNo} maxWidth={420}>
      <p style={{ marginTop: 0 }}>{msg}</p>
      <div className="sa-actions">
        <button className="btn ghost sm" onClick={onNo}>{isSw ? 'Ghairi' : 'Cancel'}</button>
        <button
          className="btn sm"
          style={danger ? { background: '#dc2626' } : null}
          onClick={onYes}
        >
          {yesLabel}
        </button>
      </div>
    </Sheet>
  );
}

/* ── simple bar chart ── */
export function Bars({ data, h = 140, color = '#0E5A47', fmtV = v => v }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="sa-bars" style={{ height: h + 40 }}>
      {data.map((d, i) => (
        <div key={i} className="sa-bar-col" title={d.label + ': ' + fmtV(d.value)}>
          <small>{d.value ? fmtV(d.value) : ''}</small>
          <i style={{
            height: Math.max(3, (d.value / max) * h),
            background: color,
            opacity: i === data.length - 1 ? 1 : 0.6,
          }} />
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
