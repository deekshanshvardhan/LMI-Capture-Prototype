import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';

export default function ResultScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { qcResult, product } = location.state || {};

  const isPass = qcResult?.qc_result === 'PASS';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 p-4 space-y-4">
        <div className={`text-center py-8 border rounded-sm ${isPass ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="text-5xl mb-3">{isPass ? '✅' : '❌'}</div>
          <h2 className={`text-xl font-bold ${isPass ? 'text-green-700' : 'text-red-700'}`}>
            {isPass ? 'Receive and QC Complete' : 'QC Failed'}
          </h2>
          <p className="text-sm text-gray-600 mt-2">{qcResult?.instructions}</p>
        </div>

        <div className="border border-gray-200 rounded-sm p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Details</h3>
          <div className="space-y-2">
            {[
              ['WID', qcResult?.wid, 'font-mono font-bold text-[#0065ff]'],
              ['GRN ID', qcResult?.grn_id, 'font-mono font-medium'],
              ['Product', qcResult?.product_name, 'font-medium'],
              ['FSN', qcResult?.fsn, 'font-mono'],
              ['Mfg Date', qcResult?.mfg_date || '—', ''],
              ['Expiry Date', qcResult?.expiry_date || '—', ''],
              ['Shelf Life', `${qcResult?.shelf_life_days} days`, 'font-medium'],
              ['Status', qcResult?.status, ''],
            ].map(([label, value, cls]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {!isPass && qcResult?.ticket_id && (
          <div className="border border-amber-200 bg-amber-50 rounded-sm p-3">
            <h3 className="font-semibold text-amber-800 text-sm mb-1">QC Ticket Generated</h3>
            <p className="text-xs text-amber-700">
              Ticket #{qcResult.ticket_id} — Resolution SLA: 48 hours.
            </p>
          </div>
        )}

        <div className="border border-dashed border-gray-300 rounded-sm bg-gray-50 text-center py-6">
          <div className="text-3xl mb-2">🖨️</div>
          <p className="text-sm font-medium text-gray-700">WID Sticker Ready to Print</p>
          <p className="text-lg font-mono font-bold text-[#0065ff] mt-1">{qcResult?.wid}</p>
        </div>

        <div className="space-y-2 pt-2 pb-4">
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="w-full py-2.5 rounded-sm bg-[#0065ff] text-white text-sm font-semibold uppercase active:bg-blue-700"
          >
            Receive More
          </button>
          <button
            type="button"
            onClick={() => navigate('/attach-detach-tote', { state: { documentId: qcResult?.document_id } })}
            className="w-full py-2.5 rounded-sm border-2 border-[#0065ff] text-[#0065ff] text-sm font-semibold uppercase
              active:bg-blue-50"
          >
            Attach / Detach Tote
          </button>
        </div>
      </div>
    </div>
  );
}
