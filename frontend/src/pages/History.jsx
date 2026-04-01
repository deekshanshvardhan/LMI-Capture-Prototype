import { useState, useEffect } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { api } from '../api';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'QC_PASS', label: 'QC Pass' },
  { value: 'QC_FAIL', label: 'QC Fail' },
  { value: 'CORRECTED', label: 'Corrected' },
  { value: 'VOIDED', label: 'Voided' },
];

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.listSessions(filter || undefined)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const statusChip = (status) => {
    const map = {
      QC_PASS: 'chip-pass',
      QC_FAIL: 'chip-fail',
      CORRECTED: 'chip-info',
      VOIDED: 'chip text-xs bg-gray-200 text-gray-500',
      IN_PROGRESS: 'chip-warn',
    };
    return map[status] || 'chip text-xs bg-gray-100 text-gray-600';
  };

  return (
    <div className="pb-20">
      <Header showBack />
      <div className="p-4 space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${filter === f.value
                  ? 'bg-fk-blue text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm text-gray-500">No receiving sessions found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{s.product_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.fsn} &middot; {s.document_id}</div>
                  </div>
                  <span className={`${statusChip(s.status)} text-xs shrink-0 ml-2`}>
                    {s.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                  {s.wid && <span>WID: <span className="font-mono text-fk-blue">{s.wid}</span></span>}
                  {s.shelf_life_days && <span>SL: {s.shelf_life_days}d</span>}
                  {s.validation_result && (
                    <span className={
                      s.validation_result === 'PASS' ? 'text-fk-green' :
                      s.validation_result === 'FAIL' ? 'text-fk-red' : 'text-gray-500'
                    }>
                      Val: {s.validation_result}
                    </span>
                  )}
                  <span>Qty: {s.quantity}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-1.5">
                  {s.created_at && new Date(s.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
