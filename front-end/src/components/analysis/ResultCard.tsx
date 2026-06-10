import { X } from "lucide-react";
import type { PredictionResponse } from "../../types";

interface ResultCardProps {
  result: PredictionResponse;
  onClose: () => void;
}

const LABEL_NAMES: Record<string, string> = {
  NORM: "Normal ECG",
  MI: "Myocardial Infarction",
  STTC: "ST/T Change",
  CD: "Conduction Disturbance",
  HYP: "Hypertrophy",
};

function getLabelName(label: string): string {
  return LABEL_NAMES[label] ?? label;
}

function getDiagnosisColor(label: string): string {
  switch (label) {
    case "NORM":
      return "text-emerald-600"; // Normal is safe (Green)
    case "MI":
      return "text-red-600"; // Heart attack is critical (Red)
    case "STTC":
    case "CD":
    case "HYP":
      return "text-amber-600"; // Other abnormalities are warnings (Orange/Amber)
    default:
      return "text-indigo-600"; // Fallback
  }
}

export default function ResultCard({
  result,
  onClose,
}: ResultCardProps) {
  // Sort predictions by confidence descending
  const sortedPredictions = [...result.predictions].sort(
    (a, b) => b.confidence - a.confidence
  );

  // FIX 2: Slice the array to only keep the top 3 predictions
  const topPredictions = sortedPredictions.slice(0, 3);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          ECG Analysis Result
        </h2>

        <button
          onClick={onClose}
          className="text-slate-400 transition hover:text-slate-700"
          aria-label="Close results"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Diagnosis */}
        <div>
          <p className="text-sm font-medium text-slate-500">
            Diagnosis
          </p>

          {/* FIX 1: Added the actual label name inside the h3 tag */}
          <h3
            className={`mt-2 text-3xl font-bold ${getDiagnosisColor(
              result.top_label
            )}`}
          >
            {getLabelName(result.top_label)}
          </h3>
        </div>

        {/* Confidence */}
        <div className="mt-8">
          <p className="text-sm font-medium text-slate-500">
            Confidence
          </p>

          <p
            className={`mt-2 text-2xl font-semibold ${getDiagnosisColor(
              result.top_label
            )}`}
          >
            {(result.top_confidence * 100).toFixed(1)}%
          </p>
        </div>

        {/* Predictions */}
        <div className="mt-8">
          <h4 className="mb-4 text-sm font-medium text-slate-500">
            Top Predictions
          </h4>

          <div className="space-y-3">
            {/* FIX 2: Map over topPredictions instead of the full sortedPredictions array */}
            {topPredictions.map((prediction) => (
              <div
                key={prediction.label}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
              >
                <span className="font-medium text-slate-700">
                  {getLabelName(prediction.label)}
                </span>

                <span className="text-slate-600">
                  {(prediction.confidence * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}