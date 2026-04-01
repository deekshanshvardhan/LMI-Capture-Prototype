import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { api } from '../api';

const QC_SECTIONS = [
  { type: 'PRODUCT_DETAILS', label: 'PRODUCT DETAILS', showCount: false },
  { type: 'DAMAGE', label: 'DAMAGE', showCount: true },
  { type: 'OTHER', label: 'OTHER', showCount: true },
  { type: 'LEGAL', label: 'LEGAL', showCount: true },
  { type: 'SPECIFICATION_MISMATCH', label: 'SPECIFICATION MISMATCH', showCount: true },
  { type: 'OTHERS', label: 'OTHERS', showCount: true },
];

const QC_REASON_OPTIONS = {
  DAMAGE: [
    { id: 'physical_damage', label: 'Physical Damage' },
    { id: 'water_damage', label: 'Water Damage' },
    { id: 'torn_packaging', label: 'Torn Packaging' },
  ],
  OTHER: [
    { id: 'wrong_item', label: 'Wrong Item' },
    { id: 'packaging_defect', label: 'Packaging Defect' },
  ],
  LEGAL: [
    { id: 'missing_label', label: 'Missing Label' },
    { id: 'missing_fssai', label: 'Missing FSSAI License' },
    { id: 'compliance_issue', label: 'Compliance Issue' },
  ],
  SPECIFICATION_MISMATCH: [
    { id: 'shelf_life_mismatch', label: 'Shelf Life Mismatch' },
    { id: 'weight_mismatch', label: 'Weight Mismatch' },
    { id: 'color_mismatch', label: 'Color Mismatch' },
  ],
  OTHERS: [
    { id: 'other_reason', label: 'Other' },
  ],
};

export default function QCScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { consignment, product, quantity: initialQty, lotDetails, validationResult, forceQCFail } = location.state || {};

  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedReasons, setSelectedReasons] = useState({});
  const [quantity, setQuantity] = useState(initialQty ? String(initialQty) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isShelfLifeFail = forceQCFail || validationResult?.validation?.result === 'FAIL';

  const sectionCounts = useMemo(() => {
    const counts = {};
    for (const sec of QC_SECTIONS) {
      if (!sec.showCount) continue;
      counts[sec.type] = Object.values(selectedReasons[sec.type] || {}).filter(Boolean).length;
    }
    return counts;
  }, [selectedReasons]);

  const totalSelected = useMemo(() => {
    return Object.values(sectionCounts).reduce((s, c) => s + c, 0);
  }, [sectionCounts]);

  const toggleSection = (type) => {
    setExpandedSection((prev) => (prev === type ? null : type));
  };

  const toggleReason = (sectionType, reasonId) => {
    setSelectedReasons((prev) => {
      const section = { ...(prev[sectionType] || {}) };
      section[reasonId] = !section[reasonId];
      return { ...prev, [sectionType]: section };
    });
  };

  const handleResetReasons = () => {
    setSelectedReasons({});
    setExpandedSection(null);
  };

  const handleConfirmQC = async () => {
    const qcResult = (isShelfLifeFail || totalSelected > 0) ? 'FAIL' : 'PASS';
    setLoading(true);
    setError('');
    try {
      const session = await api.createReceiving({
        document_id: consignment?.document_id || 'PROTO-001',
        fsn: product.fsn,
        ean: product.ean,
        quantity: parseInt(quantity) || 1,
        mrp: lotDetails?.mrp || 0,
        offer: lotDetails?.offer || '',
        mfg_date: lotDetails?.mfg_date || null,
        expiry_date: lotDetails?.expiry_date || null,
        shelf_life_value: lotDetails?.shelf_life_value || null,
        shelf_life_uom: lotDetails?.shelf_life_uom || null,
        month_year_mode: lotDetails?.month_year_mode || false,
      });

      const allReasons = [];
      if (isShelfLifeFail) allReasons.push('SHELF_LIFE_MISMATCH');
      for (const [, reasons] of Object.entries(selectedReasons)) {
        for (const [id, checked] of Object.entries(reasons)) {
          if (checked) allReasons.push(id);
        }
      }

      const qcResponse = await api.performQC({
        session_id: session.session_id,
        qc_result: qcResult,
        qc_reasons: allReasons.join(',') || null,
        force_qc_fail: isShelfLifeFail,
      });

      navigate('/result', { state: { qcResult: qcResponse, product }, replace: true });
    } catch (e) {
      setError(e.detail || 'QC processing failed');
    } finally {
      setLoading(false);
    }
  };

  const hasQuantity = quantity && parseInt(quantity) > 0;
  const buttonDisabled = !hasQuantity || loading;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showBack />

      <div className="flex-1 px-4 pt-4 pb-24 space-y-3">
        {/* Document ID */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Document ID</label>
          <input
            type="text"
            readOnly
            value={consignment?.document_id || ''}
            placeholder="Document Id"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-sm text-sm text-gray-900 bg-gray-50"
          />
        </div>

        {/* FSN */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">FSN</label>
          <input
            type="text"
            readOnly
            value={product?.fsn || ''}
            placeholder="FSN"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-sm text-sm text-gray-900 bg-gray-50"
          />
        </div>

        {/* NA badge */}
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold text-white"
            style={{ backgroundColor: '#c2185b' }}>
            NA
          </span>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter Quantity"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm text-gray-900 placeholder:text-gray-400
              focus:border-[#0065ff] focus:outline-none"
          />
        </div>

        {/* QC instance info + Reset */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-gray-900 font-medium">This is the first QC instance</span>
          <button type="button" onClick={handleResetReasons} className="text-sm font-medium text-[#0065ff]">
            Reset QC reasons
          </button>
        </div>

        {isShelfLifeFail && (
          <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-sm text-red-700">
            Shelf life mismatch detected — item will be QC Failed.
          </div>
        )}

        {/* Accordion sections */}
        <div className="space-y-2 pt-1">
          {QC_SECTIONS.map((section) => {
            const isExpanded = expandedSection === section.type;
            const count = sectionCounts[section.type] || 0;
            const reasons = QC_REASON_OPTIONS[section.type];

            return (
              <div key={section.type} className="border border-gray-200 rounded shadow-sm bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(section.type)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-[#0065ff]">{section.label}</span>
                  <div className="flex items-center gap-3">
                    {section.showCount && (
                      <span className="text-sm text-gray-500">{count}</span>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {section.type === 'PRODUCT_DETAILS' ? (
                      <div className="space-y-1 text-[13px] text-gray-700">
                        <div><span className="text-gray-500">FSN:</span> {product?.fsn}</div>
                        <div><span className="text-gray-500">Name:</span> {product?.name}</div>
                        <div><span className="text-gray-500">Brand:</span> {product?.brand}</div>
                        <div><span className="text-gray-500">EAN:</span> {product?.ean}</div>
                        <div><span className="text-gray-500">Shelf Life:</span> {product?.catalog_shelf_life_days || 'N/A'} days</div>
                        <div><span className="text-gray-500">LMI:</span> {product?.lmi_preference}</div>
                        {validationResult && (
                          <>
                            <div><span className="text-gray-500">Entered SL:</span> {validationResult.shelf_life_days}d</div>
                            <div><span className="text-gray-500">Mfg Date:</span> {validationResult.mfg_date || '—'}</div>
                            <div><span className="text-gray-500">Expiry Date:</span> {validationResult.expiry_date || '—'}</div>
                          </>
                        )}
                      </div>
                    ) : reasons ? (
                      <div className="space-y-2 max-h-[7.5rem] overflow-y-auto">
                        {reasons.map((r) => {
                          const checked = selectedReasons[section.type]?.[r.id] || false;
                          return (
                            <label key={r.id} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleReason(section.type, r.id)}
                                className="w-4 h-4 rounded border-gray-300 text-[#0065ff] focus:ring-[#0065ff]"
                              />
                              {r.label}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No options available</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-sm">
            {error}
          </div>
        )}
      </div>

      {/* Bottom CTA — bg changes based on selected reasons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white p-3 z-40"
        style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
        <button
          type="button"
          onClick={handleConfirmQC}
          disabled={buttonDisabled}
          className={`w-full py-3 rounded-sm text-white font-semibold text-sm uppercase tracking-wide
            transition-colors disabled:opacity-40 disabled:pointer-events-none
            ${(isShelfLifeFail || totalSelected > 0)
              ? 'bg-red-600 active:bg-red-700'
              : 'bg-[#0065ff] active:bg-blue-700'}`}
        >
          {loading
            ? 'Processing...'
            : (isShelfLifeFail || totalSelected > 0)
              ? 'Confirm QC Fail'
              : 'Confirm QC'}
        </button>
      </div>
    </div>
  );
}
