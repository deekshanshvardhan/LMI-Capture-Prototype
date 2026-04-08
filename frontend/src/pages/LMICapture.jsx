import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import Header from '../components/Header';
import BarcodeScanner from '../components/BarcodeScanner';
import { api } from '../api';

const UOM_OPTIONS = ['Days', 'Month', 'Year'];
const UOM_MAP = { Days: 'DAYS', Month: 'MONTHS', Year: 'YEARS' };

const STEP = { BIN: 1, SCAN: 2, LMI: 3 };

export default function LMICapture() {
  const captureMode = localStorage.getItem('lmi_capture_mode') || 'full';
  const isMfgOnly = captureMode === 'mfg_only';

  const [step, setStep] = useState(STEP.BIN);

  const [binId, setBinId] = useState('');
  const [scanValue, setScanValue] = useState('');
  const [scanType, setScanType] = useState('');

  const [offer, setOffer] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [shelfLifeValue, setShelfLifeValue] = useState('');
  const [shelfLifeUom, setShelfLifeUom] = useState('Days');
  const [mrp, setMrp] = useState('');
  const [monthYearMode, setMonthYearMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lmiStartTime, setLmiStartTime] = useState(null);
  const [completedCount, setCompletedCount] = useState(0);

  const [showScanner, setShowScanner] = useState(null);
  const showScannerRef = useRef(null);

  const binRef = useRef(null);
  const scanRef = useRef(null);

  useEffect(() => {
    if (step === STEP.BIN) binRef.current?.focus();
    if (step === STEP.SCAN) scanRef.current?.focus();
  }, [step]);

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

  const canComplete = isMfgOnly ? !!mfgDate : filledCount >= 2;

  const handleBinConfirm = (val) => {
    const v = val ?? binId;
    if (!v.trim()) return;
    setBinId(v.trim());
    setStep(STEP.SCAN);
    setError('');
  };

  const handleScan = (val) => {
    const v = (val ?? scanValue).trim();
    if (!v) return;
    setScanValue(v);
    const isEAN = /^\d{8,14}$/.test(v);
    const type = isEAN ? 'EAN' : v.toUpperCase().startsWith('WID') ? 'WID' : 'OTHER';
    setScanType(type);
    setStep(STEP.LMI);
    setLmiStartTime(Date.now());
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    const timeTaken = lmiStartTime ? Date.now() - lmiStartTime : null;
    try {
      await api.captureLmi({
        bin_id: binId.trim(),
        scan_value: scanValue.trim(),
        scan_type: scanType,
        offer: offer || null,
        mfg_date: mfgDate || null,
        expiry_date: isMfgOnly ? null : (expiryDate || null),
        shelf_life_value: isMfgOnly ? null : (shelfLifeValue ? parseInt(shelfLifeValue) : null),
        shelf_life_uom: isMfgOnly ? null : (shelfLifeValue ? UOM_MAP[shelfLifeUom] : null),
        mrp: mrp ? parseFloat(mrp) : null,
        month_year_mode: monthYearMode,
        capture_mode: captureMode,
        time_taken_ms: timeTaken,
      });
      setCompletedCount((c) => c + 1);
      resetToStep1();
    } catch (e) {
      setError(e.detail || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const resetToStep1 = useCallback(() => {
    setBinId('');
    setScanValue('');
    setScanType('');
    setOffer('');
    setMfgDate('');
    setExpiryDate('');
    setShelfLifeValue('');
    setShelfLifeUom('Days');
    setMrp('');
    setMonthYearMode(false);
    setError('');
    setLmiStartTime(null);
    setStep(STEP.BIN);
  }, []);

  const handleBarcodeScan = useCallback((value) => {
    const mode = showScannerRef.current;
    setShowScanner(null);
    showScannerRef.current = null;
    if (mode === 'bin') {
      setBinId(value);
      handleBinConfirm(value);
    } else if (mode === 'ean') {
      setScanValue(value);
      handleScan(value);
    }
  }, []);

  const stepLabel = (s) => {
    if (s === STEP.BIN) return 'Step 1 — Scan Bin';
    if (s === STEP.SCAN) return 'Step 2 — Scan EAN / WID';
    return 'Step 3 — Enter LMI Attributes';
  };

  const ScanIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Step indicator */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">{stepLabel(step)}</span>
        <div className="flex gap-1.5">
          {[STEP.BIN, STEP.SCAN, STEP.LMI].map((s) => (
            <div
              key={s}
              className={`w-8 h-1.5 rounded-full transition-colors
                ${step >= s ? 'bg-[#0065ff]' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-24">

        {/* STEP 1: Bin Scan */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">Bin ID</label>
          <div className="flex gap-2">
            <input
              ref={binRef}
              type="text"
              value={binId}
              onChange={(e) => setBinId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && step === STEP.BIN && handleBinConfirm()}
              readOnly={step > STEP.BIN}
              placeholder="Scan bin location"
              className={`flex-1 px-3 py-2.5 border rounded-sm text-sm
                focus:border-[#0065ff] focus:outline-none
                ${step > STEP.BIN
                  ? 'border-gray-200 bg-gray-50 text-gray-700'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'}`}
            />
            {step === STEP.BIN && (
              <>
                <button type="button" onClick={() => { showScannerRef.current = 'bin'; setShowScanner('bin'); }}
                  className="px-3 py-2.5 rounded-sm border border-gray-300 text-gray-600 active:bg-gray-50">
                  <ScanIcon />
                </button>
                <button type="button" onClick={() => handleBinConfirm()}
                  disabled={!binId.trim()}
                  className="px-4 py-2.5 rounded-sm bg-[#0065ff] text-white text-xs font-semibold uppercase
                    active:bg-blue-700 disabled:opacity-40">
                  OK
                </button>
              </>
            )}
            {step > STEP.BIN && (
              <button type="button" onClick={resetToStep1}
                className="px-3 py-2.5 rounded-sm border border-gray-300 text-gray-600 text-xs font-semibold
                  active:bg-gray-50">
                Change
              </button>
            )}
          </div>
        </div>

        {/* STEP 2: EAN / WID scan */}
        {step >= STEP.SCAN && (
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">EAN / WID</label>
            <div className="flex gap-2">
              <input
                ref={scanRef}
                type="text"
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && step === STEP.SCAN && handleScan()}
                readOnly={step > STEP.SCAN}
                placeholder="Scan EAN barcode or WID"
                className={`flex-1 px-3 py-2.5 border rounded-sm text-sm
                  focus:border-[#0065ff] focus:outline-none
                  ${step > STEP.SCAN
                    ? 'border-gray-200 bg-gray-50 text-gray-700'
                    : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'}`}
              />
              {step === STEP.SCAN && (
                <>
                  <button type="button" onClick={() => { showScannerRef.current = 'ean'; setShowScanner('ean'); }}
                    className="px-3 py-2.5 rounded-sm border border-gray-300 text-gray-600 active:bg-gray-50">
                    <ScanIcon />
                  </button>
                  <button type="button" onClick={() => handleScan()}
                    disabled={!scanValue.trim() || loading}
                    className="px-4 py-2.5 rounded-sm bg-[#0065ff] text-white text-xs font-semibold uppercase
                      active:bg-blue-700 disabled:opacity-40">
                    {loading ? '...' : 'OK'}
                  </button>
                </>
              )}
            </div>
            {step === STEP.SCAN && error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>
        )}

        {/* STEP 3: LMI fields */}
        {step === STEP.LMI && (
          <div className="space-y-4">
            {/* Mode badge */}
            <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold
              ${isMfgOnly ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {isMfgOnly ? 'Mfg-Only Mode' : 'Full Mode'}
            </div>

            {/* offer */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">offer</label>
              <div className="relative">
                <select value={offer} onChange={(e) => setOffer(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
                    focus:border-[#0065ff] focus:outline-none appearance-none">
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

            {/* mfg_date (always visible) */}
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
                type="number" step="0.01" value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="Enter mrp"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
                  focus:border-[#0065ff] focus:outline-none"
              />
            </div>

            {/* month/year toggle + expiry/shelf-life section */}
            <div className="border-t border-gray-200 pt-4">
              <label className="flex items-center gap-2.5 pb-3">
                <input type="checkbox" checked={monthYearMode}
                  onChange={(e) => { setMonthYearMode(e.target.checked); setMfgDate(''); setExpiryDate(''); }}
                  className="w-4 h-4 rounded border-gray-300 text-[#0065ff] focus:ring-[#0065ff]" />
                <span className="text-xs text-gray-600">Only Month/Year available</span>
              </label>

              {/* expiry_date + shelf_life (full mode only) */}
              {!isMfgOnly && (
                <>
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

                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-1">shelf_life</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number" min={1}
                        value={shelfLifeValue}
                        disabled={lockedField === 'shelf_life'}
                        onChange={(e) => setShelfLifeValue(e.target.value)}
                        placeholder="e.g. 12"
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-sm text-sm bg-white
                          focus:border-[#0065ff] focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
                      />
                      <div className="flex border border-gray-300 rounded-sm overflow-hidden">
                        {UOM_OPTIONS.map((u) => (
                          <button key={u} type="button"
                            onClick={() => setShelfLifeUom(u)}
                            disabled={lockedField === 'shelf_life'}
                            className={`px-3 py-2.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-300
                              disabled:opacity-50
                              ${shelfLifeUom === u ? 'text-[#0065ff] bg-blue-50' : 'text-gray-500 bg-white'}`}>
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-sm">{error}</div>}
          </div>
        )}

      </div>

      {/* Bottom: Complete button (only on step 3) */}
      {step === STEP.LMI && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white p-3 z-40"
          style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
          <button type="button" onClick={handleComplete}
            disabled={!canComplete || loading}
            className="w-full py-3 rounded-sm bg-[#0065ff] text-white font-semibold text-sm uppercase tracking-wide
              disabled:opacity-40 disabled:pointer-events-none active:bg-blue-700 transition-colors">
            {loading ? 'Saving...' : 'Complete'}
          </button>
        </div>
      )}

      {/* Session counter */}
      {completedCount > 0 && (
        <div className="fixed top-12 right-3 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow z-50">
          {completedCount} done
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(null)}
        />
      )}
    </div>
  );
}
