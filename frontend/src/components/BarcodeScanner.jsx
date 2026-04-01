import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [status, setStatus] = useState('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedValue, setScannedValue] = useState(null);

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  useEffect(() => {
    let stopped = false;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromConstraints(
      {
        audio: false,
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      },
      videoRef.current,
      (result) => {
        if (stopped || !result) return;
        stopped = true;
        const text = result.getText();
        setScannedValue(text);
      }
    )
      .then(() => { if (!stopped) setStatus('scanning'); })
      .catch((err) => {
        if (stopped) return;
        setStatus('error');
        setErrorMsg(
          err?.name === 'NotAllowedError'
            ? 'Camera permission denied. Allow camera in browser settings.'
            : 'Could not start camera: ' + (err?.message || 'unknown error')
        );
      });

    return () => {
      stopped = true;
      try { reader.reset(); } catch {}
    };
  }, []);

  // When a value is scanned, stop camera and deliver the value
  useEffect(() => {
    if (scannedValue === null) return;
    try { readerRef.current?.reset(); } catch {}
    // Small delay so React has time to process the cleanup
    const t = setTimeout(() => {
      onScanRef.current(scannedValue);
    }, 50);
    return () => clearTimeout(t);
  }, [scannedValue]);

  function handleClose() {
    try { readerRef.current?.reset(); } catch {}
    onCloseRef.current();
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', background: '#000',
    }}>
      <div style={{
        background: '#0065ff', color: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Scan Barcode</span>
        <button type="button" onClick={handleClose}
          style={{ color: '#fff', background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>
          ×
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {status === 'starting' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#000',
          }}>
            <p style={{ color: '#fff', fontSize: 14 }}>Starting camera…</p>
          </div>
        )}

        {status === 'scanning' && !scannedValue && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '78%', height: '22%',
              border: '3px solid #0065ff', borderRadius: 8,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            }} />
            <p style={{ color: '#fff', fontSize: 12, marginTop: 14, opacity: 0.85 }}>
              Point camera at barcode
            </p>
          </div>
        )}

        {scannedValue && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)', gap: 12,
          }}>
            <p style={{ color: '#22c55e', fontSize: 16, fontWeight: 600 }}>Scanned!</p>
            <p style={{ color: '#fff', fontSize: 18, fontFamily: 'monospace' }}>{scannedValue}</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: '#000', padding: 24, gap: 16,
          }}>
            <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center' }}>{errorMsg}</p>
            <button type="button" onClick={handleClose}
              style={{
                padding: '10px 24px', background: '#0065ff', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer',
              }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
