import { useState, useEffect } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { api } from '../api';

function formatRange(min, max) {
  if (max >= 99999) return `${min}+ days`;
  return `${min}–${max} days`;
}

export default function SlabConfig() {
  const [slabs, setSlabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ min_days: '', max_days: '', tolerance_percentage: '', is_default: false });
  const [saving, setSaving] = useState(false);

  const loadSlabs = () => {
    setLoading(true);
    api.getSlabs().then(setSlabs).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadSlabs(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.createSlab({
        min_days: parseInt(form.min_days),
        max_days: parseInt(form.max_days),
        tolerance_percentage: parseFloat(form.tolerance_percentage),
        is_default: form.is_default,
      });
      setShowForm(false);
      setForm({ min_days: '', max_days: '', tolerance_percentage: '', is_default: false });
      loadSlabs();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteSlab(id);
      loadSlabs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="pb-20">
      <Header showBack />
      <div className="p-4 space-y-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">Tolerance Slabs</h3>
              <p className="text-xs text-gray-500">Universal slab-based tolerance configuration</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-3 py-1.5 rounded-lg bg-fk-blue text-white text-sm font-medium active:bg-blue-700"
            >
              {showForm ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {showForm && (
            <div className="border-2 border-fk-blue/20 rounded-xl p-3 mb-4 space-y-3 bg-blue-50/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Days</label>
                  <input
                    type="number"
                    value={form.min_days}
                    onChange={(e) => setForm({ ...form, min_days: e.target.value })}
                    className="input-field text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Days</label>
                  <input
                    type="number"
                    value={form.max_days}
                    onChange={(e) => setForm({ ...form, max_days: e.target.value })}
                    className="input-field text-sm"
                    placeholder="90"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tolerance %</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.tolerance_percentage}
                  onChange={(e) => setForm({ ...form, tolerance_percentage: e.target.value })}
                  className="input-field text-sm"
                  placeholder="5.0"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>Default fallback slab</span>
              </label>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2.5">
                {saving ? 'Saving...' : 'Save Slab'}
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-4 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              {slabs.map((slab) => (
                <div
                  key={slab.id}
                  className={`flex items-center justify-between p-3 rounded-xl border
                    ${slab.is_default ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div>
                    <div className="text-sm font-medium">
                      {slab.is_default ? 'Default Fallback' : formatRange(slab.min_days, slab.max_days)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Effective from: {slab.effective_from}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${slab.tolerance_percentage === 0 ? 'text-fk-red' : 'text-fk-green'}`}>
                      {slab.tolerance_percentage}%
                    </span>
                    <button
                      onClick={() => handleDelete(slab.id)}
                      className="text-gray-400 active:text-fk-red p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">How Tolerance Works</h3>
          <div className="text-xs text-gray-600 space-y-2">
            <p>The system validates entered shelf life against catalog shelf life using these slabs:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Find the slab matching the catalog shelf life (in days)</li>
              <li>Calculate: Allowed Deviation = Catalog SL x Tolerance %</li>
              <li>Round up to nearest whole day</li>
              <li>Compare: |Entered SL - Catalog SL| ≤ Allowed Deviation</li>
            </ol>
            <p className="text-gray-400 mt-2">
              0% tolerance means exact match required (e.g., short-shelf-life perishables).
            </p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
