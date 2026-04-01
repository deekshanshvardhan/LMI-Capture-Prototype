import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { api } from '../api';

const UOM_OPTIONS = ['DAYS', 'MONTHS', 'YEARS'];

export default function ProductCorrection() {
  const navigate = useNavigate();

  const [qcFailedItems, setQcFailedItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [widInput, setWidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);

  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [shelfLifeValue, setShelfLifeValue] = useState('');
  const [shelfLifeUom, setShelfLifeUom] = useState('DAYS');
  const [monthYearMode, setMonthYearMode] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listQCFailed()
      .then(setQcFailedItems)
      .catch(console.error)
      .finally(() => setLoadingItems(false));
  }, []);

  const filledCount = [mfgDate, expiryDate, shelfLifeValue].filter(Boolean).length;

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setWidInput(item.wid);
    setMfgDate('');
    setExpiryDate('');
    setShelfLifeValue('');
    setResult(null);
    setError('');
  };

  const handleCorrection = async () => {
    if (filledCount !== 2) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.productCorrection({
        wid: selectedItem.wid,
        mfg_date: mfgDate || null,
        expiry_date: expiryDate || null,
        shelf_life_value: shelfLifeValue ? parseInt(shelfLifeValue) : null,
        shelf_life_uom: shelfLifeValue ? shelfLifeUom : null,
        month_year_mode: monthYearMode,
        corrected_by: 'OP-001',
        correction_reason: 'OPERATOR_ERROR',
      });
      setResult(res);
      if (res.success) {
        api.listQCFailed().then(setQcFailedItems).catch(console.error);
      }
    } catch (e) {
      setError(e.detail || 'Correction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-20">
      <Header showBack />
      <div className="p-4 space-y-4">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-1">QC Failed Items</h3>
          <p className="text-xs text-gray-500 mb-3">Select an item to correct lot attributes</p>

          {loadingItems ? (
            <div className="text-center py-4 text-gray-400">Loading...</div>
          ) : qcFailedItems.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm text-gray-500">No QC failed items pending correction.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {qcFailedItems.map((item) => (
                <button
                  key={item.wid}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all
                    ${selectedItem?.wid === item.wid
                      ? 'border-fk-blue bg-blue-50'
                      : 'border-gray-100 bg-gray-50 active:border-gray-300'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-sm font-semibold text-fk-blue">{item.wid}</div>
                      <div className="text-xs text-gray-700 mt-0.5">{item.product_name}</div>
                    </div>
                    <span className="chip-fail text-xs">QC Fail</span>
                  </div>
                  <div className="flex gap-2 mt-2 text-xs text-gray-500">
                    <span>SL: {item.shelf_life_days}d</span>
                    <span>&middot;</span>
                    <span>Catalog: {item.catalog_shelf_life_days || 'N/A'}d</span>
                    <span>&middot;</span>
                    <span>Dev: {item.deviation_days}d</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedItem && (
          <>
            <div className="card space-y-3">
              <h3 className="font-semibold text-gray-900">Current (Wrong) Attributes</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-gray-500">Mfg</div>
                  <div className="text-xs font-medium text-fk-red">{selectedItem.mfg_date || '—'}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-gray-500">Expiry</div>
                  <div className="text-xs font-medium text-fk-red">{selectedItem.expiry_date || '—'}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-gray-500">Shelf Life</div>
                  <div className="text-xs font-medium text-fk-red">{selectedItem.shelf_life_days}d</div>
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Enter Correct Lot Details</h3>
                <span className={`text-xs font-semibold ${filledCount === 2 ? 'text-fk-green' : 'text-gray-400'}`}>
                  {filledCount}/2
                </span>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <span className="text-sm text-gray-700">Month/Year only</span>
                <button
                  onClick={() => setMonthYearMode(!monthYearMode)}
                  className={`relative w-12 h-7 rounded-full transition-colors
                    ${monthYearMode ? 'bg-fk-blue' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform
                    ${monthYearMode ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing Date</label>
                <input
                  type="date"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Life</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={shelfLifeValue}
                    onChange={(e) => setShelfLifeValue(e.target.value)}
                    placeholder="Value"
                    className="input-field flex-1"
                  />
                  <select
                    value={shelfLifeUom}
                    onChange={(e) => setShelfLifeUom(e.target.value)}
                    className="input-field w-28"
                  >
                    {UOM_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u.charAt(0) + u.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="card border-fk-red/30 bg-red-50">
                <p className="text-sm text-fk-red">{error}</p>
              </div>
            )}

            {result && (
              <div className={`card ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{result.success ? '✅' : '❌'}</span>
                  <h3 className={`font-semibold ${result.success ? 'text-fk-green' : 'text-fk-red'}`}>
                    {result.success ? 'Correction Successful' : 'Correction Failed'}
                  </h3>
                </div>
                <p className="text-sm text-gray-700">{result.message}</p>
                {result.success && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Old WID</span>
                      <span className="font-mono line-through text-gray-400">{result.original_wid}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">New WID</span>
                      <span className="font-mono font-bold text-fk-blue">{result.new_wid}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">GRN (inherited)</span>
                      <span className="font-mono">{result.grn_id}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCorrection}
              disabled={filledCount !== 2 || loading}
              className="btn-primary"
            >
              {loading ? 'Validating...' : 'Submit Correction'}
            </button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
