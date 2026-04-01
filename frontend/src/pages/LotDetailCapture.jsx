import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import MismatchModal from '../components/MismatchModal';
import { api } from '../api';

const UOM_OPTIONS = ['Days', 'Month', 'Year'];
const UOM_MAP = { Days: 'DAYS', Month: 'MONTHS', Year: 'YEARS' };
const UOM_REVERSE = { DAYS: 'Days', MONTHS: 'Month', YEARS: 'Year' };

export default function LotDetailCapture() {
  const navigate = useNavigate();
  const location = useLocation();
  const { product, documentId } = location.state || {};

  const catalogUom = UOM_REVERSE[product?.shelf_life_uom] || 'Days';

  const [offer, setOffer] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [mrp, setMrp] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [shelfLifeValue, setShelfLifeValue] = useState('');
  const [shelfLifeUom, setShelfLifeUom] = useState(catalogUom);
  const [monthYearMode, setMonthYearMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mismatchData, setMismatchData] = useState(null);

  const filledCount = useMemo(() => {
    return [mfgDate, expiryDate, shelfLifeValue].filter(Boolean).length;
  }, [mfgDate, expiryDate, shelfLifeValue]);

  const lockedField = useMemo(() => {
    if (filledCount < 2) return null;
    if (mfgDate && expiryDate) return 'shelf_life';
    if (mfgDate && shelfLifeValue) return 'expiry';
    if (expiryDate && shelfLifeValue) return 'mfg';
    return null;
  }, [filledCount, mfgDate, expiryDate, shelfLifeValue]);

  const canProceed = filledCount === 2;

  const buildLotDetails = () => ({
    mrp: parseFloat(mrp) || 0,
    offer,
    fsn: product.fsn,
    mfg_date: mfgDate || null,
    expiry_date: expiryDate || null,
    shelf_life_value: shelfLifeValue ? parseInt(shelfLifeValue) : null,
    shelf_life_uom: shelfLifeValue ? UOM_MAP[shelfLifeUom] : null,
    month_year_mode: monthYearMode,
  });

  const returnToReceive = (lotDets, valResult, qcFail) => {
    navigate('/', {
      state: {
        returnFromCreateSku: true,
        product,
        documentId,
        lotDetails: lotDets,
        validationResult: valResult,
        forceQCFail: qcFail,
      },
    });
  };

  const handleCreateSku = async () => {
    setLoading(true);
    setError('');
    const lotDets = buildLotDetails();
    try {
      const result = await api.validateLotDetails({
        fsn: product.fsn,
        mfg_date: lotDets.mfg_date,
        expiry_date: lotDets.expiry_date,
        shelf_life_value: lotDets.shelf_life_value,
        shelf_life_uom: lotDets.shelf_life_uom,
        month_year_mode: lotDets.month_year_mode,
      });

      if (result.validation.result === 'PASS' || result.validation.result === 'SKIPPED') {
        returnToReceive(lotDets, result, false);
      } else {
        setMismatchData({ lotDetails: lotDets, validationResult: result });
      }
    } catch (e) {
      setError(e.detail || 'Validation failed. Please check your entries.');
    } finally {
      setLoading(false);
    }
  };

  const handleMismatchReenter = () => {
    setMismatchData(null);
    setMfgDate('');
    setExpiryDate('');
    setShelfLifeValue('');
    setError('');
  };

  const handleMismatchContinue = () => {
    const d = mismatchData;
    setMismatchData(null);
    returnToReceive(d.lotDetails, d.validationResult, true);
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="p-4 text-center text-gray-500">No product selected. Go back and scan an item.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showBack />

      {/* FSN bar */}
      <div className="mx-3 mt-3 border border-gray-200 rounded shadow-sm bg-white">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-bold text-[#0065ff]">FSN</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-800 font-mono tracking-tight">{product.fsn}</span>
            <svg className="w-[18px] h-[18px] text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <svg className="w-[18px] h-[18px] text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-24 space-y-4">
        {/* offer */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">offer</label>
          <div className="relative">
            <select
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
                focus:border-[#0065ff] focus:outline-none appearance-none"
            >
              <option value="">Select offer</option>
              <option value="No Offer">No Offer</option>
              <option value="Buy 2 Get 1">Buy 2 Get 1</option>
              <option value="10% Off">10% Off</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* mfg_date */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">mfg_date</label>
          <input
            type={monthYearMode ? 'month' : 'date'}
            value={mfgDate}
            disabled={lockedField === 'mfg'}
            onChange={(e) => setMfgDate(e.target.value)}
            placeholder="Select mfg_date"
            className={`w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
              focus:border-[#0065ff] focus:outline-none disabled:bg-gray-50 disabled:opacity-50
              ${!mfgDate ? 'text-gray-400' : 'text-gray-900'}`}
          />
        </div>

        {/* mrp */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">mrp</label>
          <input
            type="number"
            step="0.01"
            value={mrp}
            onChange={(e) => setMrp(e.target.value)}
            placeholder="Enter mrp"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
              focus:border-[#0065ff] focus:outline-none"
          />
        </div>

        {/* --- Expiry / Shelf Life fields (PRD addition) --- */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <label className="flex items-center gap-2.5 pb-3">
            <input
              type="checkbox"
              checked={monthYearMode}
              onChange={(e) => {
                setMonthYearMode(e.target.checked);
                setMfgDate('');
                setExpiryDate('');
              }}
              className="w-4 h-4 rounded border-gray-300 text-[#0065ff] focus:ring-[#0065ff]"
            />
            <span className="text-xs text-gray-600">Only Month/Year available</span>
          </label>

          {/* expiry_date */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">expiry_date</label>
            <input
              type={monthYearMode ? 'month' : 'date'}
              value={expiryDate}
              disabled={lockedField === 'expiry'}
              onChange={(e) => setExpiryDate(e.target.value)}
              placeholder="Select expiry_date"
              className={`w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
                focus:border-[#0065ff] focus:outline-none disabled:bg-gray-50 disabled:opacity-50
                ${!expiryDate ? 'text-gray-400' : 'text-gray-900'}`}
            />
          </div>

          <div className="text-center text-xs text-gray-400 py-1">— OR —</div>

          {/* shelf_life */}
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">shelf_life</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                value={shelfLifeValue}
                disabled={lockedField === 'shelf_life'}
                onChange={(e) => setShelfLifeValue(e.target.value)}
                placeholder="e.g. 12"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
                  focus:border-[#0065ff] focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
              />
              <div className="flex border border-gray-300 rounded-sm overflow-hidden">
                {UOM_OPTIONS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setShelfLifeUom(u)}
                    disabled={lockedField === 'shelf_life'}
                    className={`px-3 py-2.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-300
                      disabled:opacity-50
                      ${shelfLifeUom === u
                        ? 'text-[#0065ff] bg-blue-50'
                        : 'text-gray-500 bg-white'}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-sm">{error}</div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white p-3 z-40"
        style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
        <button
          type="button"
          onClick={handleCreateSku}
          disabled={!canProceed || loading}
          className="w-full py-3 rounded-sm bg-[#0065ff] text-white font-semibold text-sm uppercase tracking-wide
            disabled:opacity-40 disabled:pointer-events-none active:bg-blue-700 transition-colors"
        >
          {loading ? 'Validating...' : 'Create SKU'}
        </button>
      </div>

      {mismatchData && (
        <MismatchModal
          shelfLifeDays={mismatchData.validationResult?.shelf_life_days}
          onReenter={handleMismatchReenter}
          onContinue={handleMismatchContinue}
        />
      )}
    </div>
  );
}
