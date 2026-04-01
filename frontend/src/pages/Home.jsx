import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { api } from '../api';

const TABS = [{ id: 'fbe', label: 'FBE' }];

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab] = useState('fbe');
  const [documentId, setDocumentId] = useState('');
  const [fsnSku, setFsnSku] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searched, setSearched] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lotDetails, setLotDetails] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [forceQCFail, setForceQCFail] = useState(false);
  const [searchInContext, setSearchInContext] = useState(false);
  const [showUniqueEan, setShowUniqueEan] = useState(true);
  const [quantity, setQuantity] = useState('');
  const fsnRef = useRef(null);
  const qtyRef = useRef(null);

  useEffect(() => {
    const st = location.state;
    if (!st?.returnFromCreateSku) return;
    setSelectedProduct(st.product);
    setLotDetails(st.lotDetails);
    setValidationResult(st.validationResult || null);
    setForceQCFail(st.forceQCFail || false);
    setDocumentId(st.documentId || '');
    setFsnSku(st.product?.fsn || '');
    setSearchResults(null);
    setSearched(false);
    setTimeout(() => qtyRef.current?.focus(), 100);
    window.history.replaceState({}, '');
  }, [location.state]);

  const handleReset = () => {
    setDocumentId('');
    setFsnSku('');
    setError('');
    setSearchResults(null);
    setSearched(false);
    setSelectedProduct(null);
    setLotDetails(null);
    setValidationResult(null);
    setForceQCFail(false);
    setQuantity('');
  };

  const handleSearch = async () => {
    const scan = fsnSku.trim();
    if (!scan) return;
    setLoading(true);
    setError('');
    setSearchResults(null);
    setSearched(false);
    setSelectedProduct(null);
    setLotDetails(null);
    try {
      const p = await api.searchProduct({ q: scan });
      setSearchResults(p);
      setSearched(true);
    } catch (e) {
      setError(e.detail || 'Product not found');
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = () => {
    setSelectedProduct(null);
    setSearchResults(null);
    setSearched(false);
    setLotDetails(null);
    setValidationResult(null);
    setForceQCFail(false);
    setFsnSku('');
    setQuantity('');
    setTimeout(() => fsnRef.current?.focus(), 50);
  };

  const handleSelect = (product) => {
    setSelectedProduct(product);
    setSearchResults(null);
    setSearched(false);
    setFsnSku(product.fsn);
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  const handleGetSku = (product) => {
    navigate('/create-sku', {
      state: {
        product,
        documentId: documentId.trim() || 'PROTO-001',
      },
    });
  };

  const handleNext = () => {
    if (!selectedProduct || !quantity || parseInt(quantity) < 1) return;
    const consignment = {
      document_id: documentId.trim() || 'PROTO-001',
      vendor_name: 'Demo Vendor',
      po_number: 'PO-DEMO',
      warehouse_id: 'WH-BLR-01',
    };
    navigate('/qc', {
      state: {
        consignment,
        product: selectedProduct,
        quantity: parseInt(quantity),
        lotDetails,
        validationResult,
        forceQCFail,
      },
    });
  };

  const handleAttachDetach = () => {
    const docId = documentId.trim();
    navigate('/attach-detach-tote', {
      state: { documentId: docId, variant: 'ext' },
    });
  };

  const nextDisabled = !selectedProduct || !quantity || parseInt(quantity) < 1;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 flex px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`py-3 px-1 mr-6 text-sm font-medium border-b-[3px] -mb-px transition-colors
              ${activeTab === tab.id
                ? 'text-[#0065ff] border-[#0065ff]'
                : 'text-gray-500 border-transparent'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pt-4 pb-32">
        {/* Scan & Search header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-medium text-gray-900">Scan &amp; Search</h2>
          <button type="button" onClick={handleReset} className="text-sm font-medium text-[#0065ff]">
            Reset
          </button>
        </div>

        <div className="space-y-4">
          {/* Document ID */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Document ID</label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="Scan doc ID"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm text-gray-900 placeholder:text-gray-400
                focus:border-[#0065ff] focus:outline-none"
            />
          </div>

          {/* FSN / SKU */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">FSN / SKU</label>
            {selectedProduct ? (
              <div className="flex items-center justify-between border border-gray-300 rounded-sm px-3 py-2.5 bg-white">
                <span className="text-sm text-gray-900 font-mono">{selectedProduct.fsn}</span>
                <button type="button" onClick={handleChange} className="text-sm font-medium text-[#0065ff]">
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={fsnRef}
                  type="text"
                  value={fsnSku}
                  onChange={(e) => setFsnSku(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Scan FSN/SKU"
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-sm text-sm text-gray-900 placeholder:text-gray-400
                    focus:border-[#0065ff] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Quantity — shown when product is selected */}
          {selectedProduct && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quantity</label>
              <input
                ref={qtyRef}
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !nextDisabled && handleNext()}
                placeholder="Enter Quantity"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm text-gray-900 placeholder:text-gray-400
                  focus:border-[#0065ff] focus:outline-none"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>

        {/* Search Results */}
        {searched && searchResults && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[15px] font-medium text-gray-900">Search Results</span>
              <span className="text-sm font-medium text-[#0065ff] cursor-pointer">Dummy FSN</span>
            </div>

            <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={searchInContext} onChange={(e) => setSearchInContext(e.target.checked)}
                  className="rounded border-gray-300" />
                Enable Search In Context
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={showUniqueEan} onChange={(e) => setShowUniqueEan(e.target.checked)}
                  className="rounded border-gray-300" />
                Show unique EAN:FSN
              </label>
            </div>

            <div className="border border-gray-200 rounded bg-white">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="p-3 align-top w-[140px] border-r border-gray-100">
                      <div className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center text-4xl">
                        📦
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <ul className="space-y-1 text-[13px] text-gray-800">
                        <li><span className="font-medium">fsn:</span> {searchResults.fsn}</li>
                        <li><span className="font-medium">ean:</span> {searchResults.ean}</li>
                        <li><span className="font-medium">title:</span> {searchResults.name}</li>
                        <li><span className="font-medium">vertical:</span> {searchResults.vertical}</li>
                        <li><span className="font-medium">brand:</span> {searchResults.brand}</li>
                        <li><span className="font-medium">max_shelf_life_value:</span> {searchResults.catalog_shelf_life_days || 'N/A'}</li>
                        <li><span className="font-medium">max_shelf_life_qualifier:</span> {searchResults.shelf_life_uom || 'Days'}</li>
                        <li><span className="font-medium">lmi_preference:</span> {searchResults.lmi_preference}</li>
                        <li><span className="font-medium">lmi_enabled:</span> {String(searchResults.lmi_enabled)}</li>
                      </ul>
                      {searchResults.lmi_enabled ? (
                        <button
                          type="button"
                          onClick={() => handleGetSku(searchResults)}
                          className="mt-3 px-5 py-1.5 bg-[#0065ff] text-white text-xs font-semibold rounded active:bg-blue-700 uppercase"
                        >
                          Get SKU
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelect(searchResults)}
                          className="mt-3 px-5 py-1.5 bg-[#0065ff] text-white text-xs font-semibold rounded active:bg-blue-700 uppercase"
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom panel — matches StickyBottomPanel */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 p-3 z-40 space-y-2"
        style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
        <button
          type="button"
          onClick={handleAttachDetach}
          className="w-full py-2.5 rounded-sm border-2 border-[#0065ff] bg-white text-[#0065ff] text-xs font-bold tracking-wide uppercase
            active:bg-blue-50"
        >
          Attach / Detach Container
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={nextDisabled}
          className="w-full py-2.5 rounded-sm bg-[#0065ff] text-white text-xs font-bold tracking-wide uppercase
            active:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
