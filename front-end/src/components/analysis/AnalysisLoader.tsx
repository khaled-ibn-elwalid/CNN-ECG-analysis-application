import { useEffect, useState } from 'react';

const STEPS = [
  'Preprocessing signal...',
  'Running inference...',
  'Compiling results...',
];

export default function AnalysisLoader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-xl border border-gray-200 bg-white p-10">

        {/* ECG Pulse Animation */}
        <div className="flex items-center justify-center mb-8">
          <svg
            viewBox="0 0 200 60"
            className="w-64 h-16 text-blue-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline
              points="0,30 30,30 40,10 50,50 60,20 70,40 80,30 200,30"
              className="ecg-line"
            />
          </svg>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">
            Analysing ECG Signal
          </h3>
          <p className="text-sm text-slate-500">
            This may take a few seconds
          </p>
        </div>

        {/* Cycling Steps */}
        <div className="mt-8 flex flex-col gap-2">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-500 ${
                index === stepIndex
                  ? 'bg-blue-50 text-blue-700'
                  : index < stepIndex
                  ? 'text-slate-400'
                  : 'text-slate-300'
              }`}
            >
              {/* Step indicator */}
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                {index < stepIndex ? (
                  <svg className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                ) : index === stepIndex ? (
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-200" />
                )}
              </span>
              <span className="text-sm font-medium">{step}</span>
            </div>
          ))}
        </div>

      </div>

      {/* CSS for ECG animation */}
      <style>{`
        .ecg-line {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: draw 1.8s ease-in-out infinite;
        }
        @keyframes draw {
          0%   { stroke-dashoffset: 300; opacity: 1; }
          70%  { stroke-dashoffset: 0;   opacity: 1; }
          90%  { stroke-dashoffset: 0;   opacity: 0; }
          100% { stroke-dashoffset: 300; opacity: 0; }
        }
      `}</style>
    </div>
  );
}