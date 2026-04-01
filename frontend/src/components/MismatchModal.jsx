export default function MismatchModal({ shelfLifeDays, onReenter, onContinue }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onReenter} />
      <div className="relative bg-white rounded-xl shadow-xl mx-6 w-full max-w-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Shelf Life Mismatch</h2>
          <button onClick={onReenter} className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-start gap-3 mb-5">
          <div className="w-8 h-8 rounded-full bg-fk-red flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-700 font-medium">
              Please re-enter details or continue with current entry
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Calculated Shelf Life: {shelfLifeDays} Days
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReenter}
            className="flex-1 py-2.5 px-4 rounded border-2 border-fk-blue text-fk-blue text-sm font-semibold
              active:bg-blue-50 transition-colors"
          >
            Re-enter Details
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 px-4 rounded border-2 border-fk-red text-fk-red text-sm font-semibold
              active:bg-red-50 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
