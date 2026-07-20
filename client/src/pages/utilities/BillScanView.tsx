import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GeminiStatus, ScanBillResult } from '@/types/api/Ai';

// The steps we show while Gemini reads the bill — purely cosmetic pacing so the wait
// reads as real work rather than a dead spinner.
const SCAN_STEPS = [
  'Uploading image…',
  'Reading the bill…',
  'Extracting line items & totals…',
  'Matching ledgers & stock items…',
  'Drafting the voucher…',
];

// Read a File into { base64, mimeType, dataUrl } for preview + the Gemini call.
function readImage(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve({ base64, mimeType: file.type || 'image/jpeg', dataUrl });
    };
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

export default function BillScanView() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [status, setStatus] = useState<GeminiStatus | null>(null);
  const [image, setImage] = useState<{ base64: string; mimeType: string; dataUrl: string } | null>(
    null,
  );
  const [fileName, setFileName] = useState('');
  const [scanning, setScanning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.api.ai.scanBillStatus().then(setStatus);
  }, []);

  // Advance the cosmetic step label while a scan is in flight.
  useEffect(() => {
    if (!scanning) return;
    setStepIdx(0);
    const t = setInterval(() => setStepIdx((i) => Math.min(i + 1, SCAN_STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, [scanning]);

  const pickFile = useCallback(async (file?: File | null) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, HEIC, …).');
      return;
    }
    try {
      const img = await readImage(file);
      setImage(img);
      setFileName(file.name);
    } catch (e: any) {
      setError(e?.message || 'Could not read the image.');
    }
  }, []);

  // Paste-an-image support (Cmd/Ctrl+V a screenshot of the bill).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) =>
        i.type.startsWith('image/'),
      );
      if (item) pickFile(item.getAsFile());
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [pickFile]);

  const scan = useCallback(async () => {
    if (!image || scanning) return;
    if (!selectedCompany?.company_id) {
      setError('No active company.');
      return;
    }
    setScanning(true);
    setError(null);
    try {
      const res: ScanBillResult = await window.api.ai.scanBill({
        company_id: selectedCompany.company_id,
        fy_id: activeFY?.fy_id,
        imageBase64: image.base64,
        mimeType: image.mimeType,
      });
      if (!res.success || !res.draft) {
        setScanning(false);
        setError(res.error || 'Could not read a voucher from this image.');
        return;
      }
      // Hand the draft to the real voucher entry screen for review + Accept.
      navigate('/transactions/vouchers', {
        state: {
          scanDraft: res.draft,
          scanMeta: {
            warnings: res.warnings || [],
            unresolvedLedgers: res.unresolvedLedgers || [],
            unresolvedItems: res.unresolvedItems || [],
            model: res.model,
          },
        },
      });
    } catch (e: any) {
      setScanning(false);
      setError(e?.message || 'Scan failed.');
    }
  }, [image, scanning, selectedCompany, activeFY, navigate]);

  const configured = status?.hasKey ?? false;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-zinc-50">
      {!configured && status !== null && (
        <div className="mx-auto mt-6 max-w-md border border-zinc-200 border-l-2 border-l-zinc-900 bg-white px-4 py-3 space-y-1">
          <div className="font-bold text-zinc-900">Gemini is not configured</div>
          <div className="text-zinc-600 leading-relaxed text-[11px]">
            Set <code className="text-zinc-900">GEMINI_API_KEY</code> in the server{' '}
            <code className="text-zinc-900">.env</code> and restart the app to enable bill scanning.
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Left — drop zone / preview with scan overlay */}
        <div
          className={cn(
            'relative flex flex-col items-center justify-center border-2 border-dashed bg-white overflow-hidden',
            dragOver ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-300',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
        >
          {image ? (
            <>
              <img
                src={image.dataUrl}
                alt="Bill preview"
                className="max-h-full max-w-full object-contain"
              />
              {scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-zinc-900/10 to-transparent animate-[billscan_1.6s_ease-in-out_infinite]" />
                  <div className="absolute inset-0 border-2 border-zinc-900/30" />
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-800 p-8"
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <path d="M3 15l4-4 5 5M14 12l3-3 4 4" />
                <circle cx="8.5" cy="8.5" r="1.5" />
              </svg>
              <span className="text-[11px] font-medium">Click, drop, or paste a bill image</span>
              <span className="text-[10px] text-zinc-400">JPG · PNG · HEIC · screenshot</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        {/* Right — instructions / status / actions */}
        <div className="flex flex-col justify-between bg-white border border-zinc-200 p-5">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-bold text-zinc-900">Scan a bill into a voucher</div>
              <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Gemini reads the bill and drafts a voucher against your existing ledgers and stock
                items. You review and edit it in the normal entry screen, then Accept to save —
                nothing is written until you do.
              </div>
            </div>

            {fileName && (
              <div className="text-[11px] text-zinc-600">
                Selected: <span className="font-medium text-zinc-900">{fileName}</span>
              </div>
            )}

            {scanning && (
              <div className="space-y-2">
                {SCAN_STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      'flex items-center gap-2 text-[11px]',
                      i < stepIdx
                        ? 'text-zinc-400'
                        : i === stepIdx
                          ? 'text-zinc-900 font-medium'
                          : 'text-zinc-300',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block w-2 h-2 rounded-full',
                        i < stepIdx
                          ? 'bg-zinc-400'
                          : i === stepIdx
                            ? 'bg-zinc-900 animate-pulse'
                            : 'bg-zinc-200',
                      )}
                    />
                    {s}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-[11px] text-red-600 border border-red-200 bg-red-50 px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button
              variant="primary"
              className="flex-1"
              onClick={scan}
              disabled={!configured || !image || scanning}
            >
              {scanning ? 'Reading bill…' : 'Scan & draft voucher'}
            </Button>
            {image && !scanning && (
              <Button
                variant="secondary"
                onClick={() => {
                  setImage(null);
                  setFileName('');
                  setError(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>
          {status?.model && (
            <div className="text-[10px] text-zinc-400 mt-2 text-right">{status.model}</div>
          )}
        </div>
      </div>

      {/* Keyframes for the scan sweep. */}
      <style>{`@keyframes billscan {
        0% { top: -4rem; }
        100% { top: 100%; }
      }`}</style>
    </div>
  );
}
