import React, { useState } from 'react';
import type { MoneyFlowAnalysis, MoneyFlowInsight, MoneyFlowInsightType, MoneyFlowSeverity } from '../lib/ai';
import { Sparkles, Wallet, AlertTriangle, Layers, PiggyBank, Info, Loader2 } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';

const TYPE_META: Record<MoneyFlowInsightType, { label: string; icon: React.ReactNode }> = {
  idle_cash: { label: 'Idle cash', icon: <Wallet size={16} /> },
  timing_risk: { label: 'Timing risk', icon: <AlertTriangle size={16} /> },
  consolidation: { label: 'Consolidation', icon: <Layers size={16} /> },
  savings: { label: 'Savings', icon: <PiggyBank size={16} /> },
  general: { label: 'General', icon: <Info size={16} /> },
};

const SEVERITY_BADGE: Record<MoneyFlowSeverity, string> = {
  info: 'ha-badge-neutral',
  warning: 'ha-badge-red',
  opportunity: 'ha-badge-lime',
};

export const MoneyFlowInsights: React.FC = () => {
  const [analysis, setAnalysis] = useState<MoneyFlowAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/insights/money-flow', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'ok' && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setError(data.message || 'Failed to analyse money flow.');
      }
    } catch {
      setError('Failed to analyse money flow. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    <div className="ha-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: error ? '1.25rem' : 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="ha-badge ha-badge-blue">AI powered</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ha-ink)', lineHeight: 1.1 }}>
            Money flow analysis
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', maxWidth: '600px', marginTop: '0.25rem' }}>
            Idle cash, direct-debit timing risk, consolidation opportunities, and savings suggestions — based on your real accounts and logged transfers.
          </p>
        </div>
        <button onClick={runAnalysis} disabled={loading} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          {loading ? <Loader2 size={15} className="ha-spin" /> : <Sparkles size={15} />}
          <span>{loading ? 'Analysing…' : analysis ? 'Re-analyse' : 'Analyse my money flow'}</span>
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fbeceb',
          border: '1px solid var(--ha-red)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--ha-radius-sm)',
          fontSize: '0.85rem',
          color: '#a8332c',
        }}>
          {error}
        </div>
      )}
    </div>

      {analysis && (
        <CollapsibleSection id="moneyflow-results" title="Analysis results" bodyStyle={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            backgroundColor: 'var(--ha-blue-light)',
            border: '1px solid var(--ha-blue)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--ha-radius-md)',
            fontSize: '0.9rem',
            color: 'var(--ha-ink)',
            lineHeight: 1.5,
          }}>
            {analysis.summary}
          </div>

          {analysis.insights.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)' }}>
              No specific opportunities found — log more transfers in Transactions for a deeper analysis.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {analysis.insights.map((insight: MoneyFlowInsight, i: number) => {
                const meta = TYPE_META[insight.type] || TYPE_META.general;
                return (
                  <div key={i} style={{
                    border: '1px solid var(--ha-line)',
                    borderRadius: 'var(--ha-radius-md)',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--ha-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {meta.icon}
                        {meta.label}
                      </div>
                      <span className={`ha-badge ${SEVERITY_BADGE[insight.severity] || 'ha-badge-neutral'}`} style={{ fontSize: '0.68rem' }}>
                        {insight.severity}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ha-ink)' }}>
                      {insight.title}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--ha-muted)', lineHeight: 1.5 }}>
                      {insight.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </CollapsibleSection>
      )}
    </div>
  );
};
