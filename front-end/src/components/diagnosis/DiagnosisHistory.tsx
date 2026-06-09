// components/diagnosis/DiagnosisHistory.tsx
import type { DiagnosisResponse } from '../../types';

interface DiagnosisHistoryProps {
  diagnoses: DiagnosisResponse[];
}

const getResultBadge = (result: string): string => {
  const lower = result.toLowerCase();
  if (lower.includes('normal')) return 'bg-green-100 text-green-700';
  if (lower.includes('afib') || lower.includes('fibrillation')) return 'bg-red-100 text-red-700';
  if (lower.includes('mi') || lower.includes('infarction')) return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
};

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatConfidence = (confidence: number): string =>
  `${(confidence * 100).toFixed(1)}%`;

export default function DiagnosisHistory({ diagnoses }: DiagnosisHistoryProps) {
  if (diagnoses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-400">No diagnoses recorded yet</p>
        <p className="text-xs text-slate-300 mt-1">
          Upload ECG files above to run the first analysis
        </p>
      </div>
    );
  }

  // most recent first
  const sorted = [...diagnoses].reverse();

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {sorted.map((diagnosis, index) => (
        <div
          key={diagnosis.id}
          className={`
            flex items-center justify-between px-6 py-4
            ${index !== sorted.length - 1 ? 'border-b border-gray-100' : ''}
          `}
        >
          {/* Left: date and id */}
          <div>
            <p className="text-sm font-medium text-slate-900">
              {formatDate(diagnosis.created_at)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              #{diagnosis.id}
            </p>
          </div>

          {/* Right: confidence and badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {formatConfidence(diagnosis.confidence)}
            </span>
            <span
              className={`
                inline-flex items-center rounded-full px-2.5 py-0.5
                text-xs font-medium ${getResultBadge(diagnosis.result)}
              `}
            >
              {diagnosis.result}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}