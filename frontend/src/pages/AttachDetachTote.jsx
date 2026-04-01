import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';

export default function AttachDetachTote() {
  const navigate = useNavigate();
  const location = useLocation();
  const { documentId } = location.state || {};

  const [toteId, setToteId] = useState('');
  const [attached, setAttached] = useState(null);

  const handleAttach = () => {
    const id = toteId.trim() || `TOTE-${Date.now().toString(36).toUpperCase()}`;
    setToteId(id);
    setAttached(id);
  };

  const handleDetach = () => {
    setAttached(null);
    setToteId('');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showBack />

      <div className="flex-1 px-4 pt-4 space-y-4">
        <h2 className="text-[15px] font-medium text-gray-900">Attach / Detach Container</h2>
        {documentId && (
          <p className="text-xs text-gray-500">Document: {documentId}</p>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Container / Tote ID</label>
          <input
            type="text"
            value={toteId}
            onChange={(e) => setToteId(e.target.value)}
            placeholder="Scan or enter tote ID"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-sm text-sm text-gray-900 placeholder:text-gray-400
              focus:border-[#0065ff] focus:outline-none"
          />
        </div>

        {attached ? (
          <div className="bg-green-50 border border-green-200 rounded-sm p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-green-800">Container Attached</div>
                <div className="text-xs text-green-600 font-mono mt-0.5">{attached}</div>
              </div>
              <button type="button" onClick={handleDetach}
                className="px-3 py-1 rounded-sm border border-red-300 text-red-600 text-xs font-medium active:bg-red-50">
                Detach
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={handleAttach}
            className="w-full py-2.5 rounded-sm bg-[#0065ff] text-white text-sm font-semibold uppercase
              active:bg-blue-700">
            Attach Container
          </button>
        )}

        <button type="button" onClick={() => navigate(-1)}
          className="w-full py-2.5 rounded-sm border-2 border-gray-300 text-gray-600 text-sm font-semibold uppercase
            active:bg-gray-50">
          Back to Receive
        </button>
      </div>
    </div>
  );
}
