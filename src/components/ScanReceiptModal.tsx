import React, { useCallback, useRef, useState } from 'react';
import { X, ScanLine, Upload, CheckCircle2, Sparkles, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import type { ExpenseItem, ExpenseCategory, BillingCycle, CurrencyCode } from '../types/expense';
import { getCategoryMeta } from '../data/categories';
import { formatCurrency } from '../utils/formatters';

interface ReceiptScanResult {
  vendor: string;
  amount: number | null;
  currency: string | null;
  date: string | null;
  billingCycleGuess: BillingCycle | null;
  categoryGuess: string | null;
  isPaid: boolean;
  matchedName: string | null;
  notes: string | null;
}

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseMatch: (mergedExpense: ExpenseItem) => void;
  onUseNew: (draft: Partial<ExpenseItem>) => void;
  initialImage?: { dataUrl: string; base64: string; mimeType: string } | null;
  householdCurrency?: CurrencyCode;
}

interface ConversionResult {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  date: string;
  convertedAmount: number;
}

const VALID_CATEGORIES: ExpenseCategory[] = ['entertainment', 'ai-tech', 'utilities', 'housing', 'education', 'lifestyle', 'shopping', 'big-ticket', 'insurance'];
const VALID_CURRENCIES: CurrencyCode[] = ['EUR', 'GBP', 'USD', 'CAD', 'AUD', 'JPY'];

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  isOpen,
  onClose,
  onUseMatch,
  onUseNew,
  initialImage,
  householdCurrency = 'EUR',
}) => {
  const [image, setImage] = useState<{ dataUrl: string; base64: string; mimeType: string } | null>(initialImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ extracted: ReceiptScanResult; matchedExpense: ExpenseItem | null } | null>(null);
  const [conversion, setConversion] = useState<ConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState('');
  const [useConverted, setUseConverted] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannedRef = useRef(false);

  const reset = useCallback(() => {
    setImage(null);
    setIsScanning(false);
    setError('');
    setResult(null);
    setConversion(null);
    setIsConverting(false);
    setConversionError('');
    setUseConverted(true);
    scannedRef.current = false;
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const { dialogRef, dialogProps } = useModalA11y(isOpen, handleClose);

  const scanImage = useCallback(async (img: { dataUrl: string; base64: string; mimeType: string }) => {
    setIsScanning(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/assistant/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: img.base64, mimeType: img.mimeType }),
      });
      const data = await res.json();
      if (data.status !== 'ok') {
        setError(data.message || 'Failed to read that image.');
        return;
      }
      setResult({ extracted: data.extracted, matchedExpense: data.matchedExpense });
      setConversion(null);
      setConversionError('');
      setUseConverted(true);

      const detectedCurrency = data.extracted?.currency as CurrencyCode | null;
      if (
        detectedCurrency &&
        VALID_CURRENCIES.includes(detectedCurrency) &&
        detectedCurrency !== householdCurrency &&
        typeof data.extracted?.amount === 'number'
      ) {
        void convertAmount(detectedCurrency, householdCurrency, data.extracted.amount);
      }
    } catch {
      setError('Failed to read that image. Please try again.');
    } finally {
      setIsScanning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdCurrency]);

  const convertAmount = useCallback(async (from: CurrencyCode, to: CurrencyCode, amount: number) => {
    setIsConverting(true);
    setConversionError('');
    try {
      const res = await fetch(`/api/exchange-rate?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.status !== 'ok') {
        setConversionError(data.message || 'Could not fetch a live rate.');
        return;
      }
      setConversion({
        from,
        to,
        rate: data.rate,
        date: data.date,
        convertedAmount: Math.round(amount * data.rate * 100) / 100,
      });
      setUseConverted(true);
    } catch {
      setConversionError('Could not fetch a live rate. Try again in a moment.');
    } finally {
      setIsConverting(false);
    }
  }, []);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please use an image file (screenshot or photo).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      const img = { dataUrl, base64, mimeType: file.type };
      setImage(img);
      scanImage(img);
    };
    reader.readAsDataURL(file);
  }, [scanImage]);

  React.useEffect(() => {
    if (isOpen && initialImage && !scannedRef.current) {
      scannedRef.current = true;
      setImage(initialImage);
      scanImage(initialImage);
    }
  }, [isOpen, initialImage, scanImage]);

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const applyConversion = useConverted && conversion;

  const handleUseMatch = () => {
    if (!result?.matchedExpense) return;
    const { extracted, matchedExpense } = result;
    onUseMatch({
      ...matchedExpense,
      vendor: matchedExpense.vendor || extracted.vendor,
      amount: applyConversion
        ? conversion.convertedAmount
        : extracted.amount ?? matchedExpense.amount,
      currency: applyConversion
        ? conversion.to
        : (extracted.currency as CurrencyCode) && VALID_CURRENCIES.includes(extracted.currency as CurrencyCode)
        ? (extracted.currency as CurrencyCode)
        : matchedExpense.currency,
      nextRenewalDate: extracted.date || matchedExpense.nextRenewalDate,
      isPaidThisCycle: extracted.isPaid || matchedExpense.isPaidThisCycle,
      originalAmount: applyConversion ? extracted.amount ?? null : matchedExpense.originalAmount ?? null,
      originalCurrency: applyConversion ? conversion.from : matchedExpense.originalCurrency ?? null,
      exchangeRate: applyConversion ? conversion.rate : matchedExpense.exchangeRate ?? null,
      rateDate: applyConversion ? conversion.date : matchedExpense.rateDate ?? null,
    });
    handleClose();
  };

  const handleUseNew = () => {
    if (!result) return;
    const { extracted } = result;
    onUseNew({
      name: extracted.vendor,
      vendor: extracted.vendor,
      amount: applyConversion ? conversion.convertedAmount : extracted.amount ?? undefined,
      currency: applyConversion
        ? conversion.to
        : VALID_CURRENCIES.includes(extracted.currency as CurrencyCode) ? (extracted.currency as CurrencyCode) : 'EUR',
      billingCycle: extracted.billingCycleGuess || 'monthly',
      category: VALID_CATEGORIES.includes(extracted.categoryGuess as ExpenseCategory) ? (extracted.categoryGuess as ExpenseCategory) : 'utilities',
      nextRenewalDate: extracted.date || undefined,
      isPaidThisCycle: extracted.isPaid,
      notes: extracted.notes || undefined,
      originalAmount: applyConversion ? extracted.amount ?? null : null,
      originalCurrency: applyConversion ? conversion.from : null,
      exchangeRate: applyConversion ? conversion.rate : null,
      rateDate: applyConversion ? conversion.date : null,
    });
    handleClose();
  };

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} {...dialogProps} className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--ha-line)',
        }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
              Scan a bill
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '2px' }}>
              Paste, drop, or upload a screenshot — Tally will read it for you
            </p>
          </div>
          <button onClick={handleClose} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {!image && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? 'var(--ha-blue)' : 'var(--ha-line)'}`,
                borderRadius: 'var(--ha-radius-lg)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragging ? 'var(--ha-blue-light)' : '#fafaf7',
                transition: 'all 0.15s ease',
              }}
            >
              <ScanLine size={30} color="var(--ha-muted)" style={{ marginBottom: '0.6rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--ha-ink)', fontSize: '0.95rem' }}>
                Drop a screenshot here, or paste with ⌘V / Ctrl+V
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ha-muted)', marginTop: '0.35rem' }}>
                or click to choose a file
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadFile(file);
                }}
              />
            </div>
          )}

          {image && (
            <div style={{
              borderRadius: 'var(--ha-radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--ha-line)',
              maxHeight: '200px',
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: '#fafaf7',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.dataUrl} alt="Scanned bill" style={{ maxHeight: '200px', objectFit: 'contain' }} />
            </div>
          )}

          {isScanning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', color: 'var(--ha-muted)', fontSize: '0.85rem' }}>
              <Sparkles size={16} className="spin" />
              Reading your screenshot…
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: 'var(--ha-red-tint)',
              border: '1px solid var(--ha-red)',
              borderRadius: 'var(--ha-radius-sm)',
              padding: '0.75rem 1rem',
              color: 'var(--ha-red)',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {result && !isScanning && (
            <div style={{
              border: '1px solid var(--ha-line)',
              borderRadius: 'var(--ha-radius-md)',
              padding: '1rem 1.1rem',
              backgroundColor: result.matchedExpense ? 'var(--ha-blue-light)' : '#fafaf7',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CheckCircle2 size={16} color="var(--ha-blue)" />
                <span style={{ fontWeight: 700, color: 'var(--ha-ink)', fontSize: '0.9rem' }}>
                  {result.matchedExpense ? `Looks like "${result.matchedExpense.name}"` : `New bill detected: "${result.extracted.vendor}"`}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ha-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.85rem' }}>
                {result.extracted.amount != null && (
                  <span>Amount: <strong style={{ color: 'var(--ha-ink)' }}>{formatCurrency(result.extracted.amount, (result.extracted.currency as CurrencyCode) || 'EUR')}</strong></span>
                )}
                {result.extracted.date && <span>Date: {result.extracted.date}</span>}
                {result.extracted.categoryGuess && <span>Category guess: {getCategoryMeta(result.extracted.categoryGuess).name}</span>}
                <span>{result.extracted.isPaid ? 'Detected as already paid' : 'Detected as not yet paid'}</span>
                {result.extracted.notes && <span style={{ fontStyle: 'italic' }}>{result.extracted.notes}</span>}
              </div>

              {result.extracted.amount != null &&
                VALID_CURRENCIES.includes(result.extracted.currency as CurrencyCode) &&
                (result.extracted.currency as CurrencyCode) !== householdCurrency && (
                <div style={{
                  marginBottom: '0.85rem',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--ha-radius-sm)',
                  backgroundColor: '#fdf2e3',
                  border: '1px solid #f6dfb8',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#7C4A0B' }}>
                    <ArrowRightLeft size={14} color="#B45309" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>
                      Detected in {result.extracted.currency} — your household uses {householdCurrency}
                    </span>
                  </div>

                  {isConverting && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#7C4A0B', marginTop: '0.5rem' }}>
                      <Loader2 size={13} className="spin" />
                      Fetching live exchange rate…
                    </div>
                  )}

                  {!isConverting && conversion && conversion.from === result.extracted.currency && (
                    <>
                      <div style={{ fontSize: '0.85rem', color: 'var(--ha-ink)', marginTop: '0.5rem' }}>
                        ≈ <strong>{formatCurrency(conversion.convertedAmount, conversion.to)}</strong>
                        <span style={{ color: '#7C4A0B', fontWeight: 400 }}>
                          {' '}(1 {conversion.from} = {conversion.rate.toFixed(4)} {conversion.to}, ECB rate {conversion.date})
                        </span>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#7C4A0B', marginTop: '0.4rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={useConverted}
                          onChange={(e) => setUseConverted(e.target.checked)}
                        />
                        Use converted amount
                      </label>
                    </>
                  )}

                  {!isConverting && conversionError && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--ha-red)', marginTop: '0.5rem' }}>
                      {conversionError}
                    </div>
                  )}

                  {!isConverting && (!conversion || conversion.from !== result.extracted.currency) && (
                    <button
                      type="button"
                      onClick={() => convertAmount(result.extracted.currency as CurrencyCode, householdCurrency, result.extracted.amount!)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem', marginTop: '0.5rem' }}
                    >
                      <ArrowRightLeft size={12} />
                      Convert to {householdCurrency} (live rate)
                    </button>
                  )}
                </div>
              )}

              {result.matchedExpense ? (
                <button onClick={handleUseMatch} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Review & update &quot;{result.matchedExpense.name}&quot;
                </button>
              ) : (
                <button onClick={handleUseNew} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Review & add as new expense
                </button>
              )}
            </div>
          )}

          {image && !isScanning && (
            <button
              onClick={() => { reset(); }}
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-start', fontSize: '0.8rem' }}
            >
              <Upload size={13} />
              Try a different image
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
