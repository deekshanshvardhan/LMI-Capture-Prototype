export default function Header({
  networkSpeed = '10 mbps',
  networkLatency = '50 ms',
  warehouseId = 'tes_sh_wh_nl_01nl',
}) {
  return (
    <header className="sticky top-0 z-50 bg-[#3f51b5] text-white px-3 py-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button type="button" className="p-0.5 shrink-0 active:opacity-70" aria-label="Menu">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold text-[15px] tracking-tight shrink-0">Flolite</span>
        <div className="text-[10px] leading-tight opacity-90 whitespace-nowrap">
          <div>{networkSpeed}</div>
          <div>{networkLatency}</div>
        </div>
      </div>

      <div className="flex-1 flex justify-center px-1 min-w-0">
        <span className="text-[11px] sm:text-xs font-medium truncate text-center opacity-95" title={warehouseId}>
          {warehouseId}
        </span>
      </div>

      <div className="flex items-center justify-end flex-1">
        <button type="button" className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center active:bg-white/25" aria-label="Profile">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
