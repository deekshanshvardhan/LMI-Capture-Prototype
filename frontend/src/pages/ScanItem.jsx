import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { api } from '../api';

export default function ScanItem() {
  const navigate = useNavigate();
  const location = useLocation();
  const consignment = location.state?.consignment;
  const autoSearchDone = useRef(false);

  const [scanValue, setScanValue] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const st = location.state;
    if (!st?.initialScan || autoSearchDone.current) return;
    setScanValue(st.initialScan);
    if (st.autoSearch) {
      autoSearchDone.current = true;
      const v = String(st.initialScan).trim();
      if (!v) return;
      (async () => {
        setLoading(true);
        setError('');
        try {
          const isEAN = /^\d+$/.test(v);
          const p = await api.searchProduct(isEAN ? { ean: v } : { fsn: v });
          setProduct(p);
        } catch (e) {
          setError(e.detail || 'Product not found. Check EAN/FSN and try again.');
          setProduct(null);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [location.state]);

  const handleScan = async () => {
    if (!scanValue.trim()) return;
    setLoading(true);
    setError('');
    try {
      const isEAN = /^\d+$/.test(scanValue.trim());
      const p = await api.searchProduct(
        isEAN ? { ean: scanValue.trim() } : { fsn: scanValue.trim() }
      );
      setProduct(p);
    } catch (e) {
      setError(e.detail || 'Product not found. Check EAN/FSN and try again.');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!product || quantity < 1) return;
    navigate('/lot-details', {
      state: { consignment, product, quantity },
    });
  };

  return (
    <div>
      <Header showBack />
      <div className="p-4 space-y-4">
        {consignment && (
          <div className="card">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Document</div>
                <div className="font-semibold">{consignment.document_id}</div>
              </div>
              <span className="chip-info text-xs">{consignment.po_number}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">{consignment.vendor_name}</div>
          </div>
        )}

        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Scan EAN / Enter FSN</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                placeholder="Scan barcode or type FSN..."
                className="input-field flex-1"
                autoFocus
              />
              <button
                onClick={handleScan}
                disabled={loading || !scanValue.trim()}
                className="px-4 py-3 rounded-xl bg-fk-blue text-white font-medium active:bg-blue-700 disabled:opacity-40"
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>
            {error && <div className="text-sm text-fk-red mt-2">{error}</div>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 rounded-xl border-2 border-gray-200 flex items-center justify-center text-lg font-bold active:bg-gray-100"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field w-20 text-center text-lg font-semibold"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-11 h-11 rounded-xl border-2 border-gray-200 flex items-center justify-center text-lg font-bold active:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {product && (
          <div className="card">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                📦
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 leading-tight">{product.name}</h3>
                <div className="text-sm text-gray-500 mt-0.5">{product.brand} &middot; {product.vertical}</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="chip text-xs bg-gray-100 text-gray-600">FSN: {product.fsn}</span>
                  <span className="chip text-xs bg-gray-100 text-gray-600">EAN: {product.ean}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {product.catalog_shelf_life_days ? (
                    <span className="chip-info text-xs">
                      Catalog SL: {product.catalog_shelf_life_days} days
                    </span>
                  ) : (
                    <span className="chip-warn text-xs">No catalog shelf life</span>
                  )}
                  <span className="chip text-xs bg-purple-50 text-purple-700">
                    LMI: {product.lmi_preference === 'MFG_DATE' ? 'Mfg Date' : 'Expiry Date'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {product && (
          <button onClick={handleProceed} disabled={quantity < 1} className="btn-primary">
            Enter Lot Details
          </button>
        )}

        <div className="card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Test EANs</h3>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { ean: '8901030793905', label: 'Tata Salt (730d SL)' },
              { ean: '8901058853100', label: 'Maggi Noodles (270d SL)' },
              { ean: '8901262150309', label: 'Mother Dairy Curd (15d SL, 0% tol)' },
              { ean: '8904114611307', label: 'Dabur Honey (No catalog SL)' },
              { ean: '8901491101707', label: 'Lays Chips (90d SL, 0% tol)' },
            ].map((item) => (
              <button
                key={item.ean}
                onClick={() => { setScanValue(item.ean); }}
                className="text-left text-xs p-2 rounded-lg bg-gray-50 active:bg-gray-100 text-gray-600"
              >
                <span className="font-mono text-fk-blue">{item.ean}</span>
                <span className="text-gray-400 ml-2">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
