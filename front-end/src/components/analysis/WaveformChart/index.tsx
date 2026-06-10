//Manages state (activeLead)
import { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-basic-dist';

interface WaveformChartProps {
  signal: number[][];
  leadNames: string[];
}

const SAMPLE_RATE = 100;

export default function WaveformChart({ signal, leadNames }: WaveformChartProps) {
  const defaultLead = leadNames.indexOf('II') !== -1 ? leadNames.indexOf('II') : 0;
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(defaultLead);
  const chartRef = useRef<HTMLDivElement>(null);

  const selectedSignal = signal[selectedLeadIndex] ?? [];
  const selectedLeadName = leadNames[selectedLeadIndex] ?? '';
  const timeAxis = selectedSignal.map((_, i) => parseFloat((i / SAMPLE_RATE).toFixed(3)));

  useEffect(() => {
    if (!chartRef.current) return;

    Plotly.react(
      chartRef.current,
      [
        {
          x: timeAxis,
          y: selectedSignal,
          type: 'scatter',
          mode: 'lines',
          line: { color: '#2563EB', width: 1.2 },
          name: `Lead ${selectedLeadName}`,
          hovertemplate: 'Time: %{x}s<br>Amplitude: %{y:.4f}<extra></extra>',
        },
      ],
      {
        autosize: true,
        height: 280,
        margin: { t: 10, r: 20, b: 50, l: 60 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: '#FAFAFA',
        xaxis: {
          title: { text: 'Time (seconds)', font: { size: 12, color: '#64748B' } },
          tickfont: { size: 11, color: '#64748B' },
          gridcolor: '#E2E8F0',
          zerolinecolor: '#CBD5E1',
          range: [0, 10],
        },
        yaxis: {
          title: { text: 'Amplitude (mV)', font: { size: 12, color: '#64748B' } },
          tickfont: { size: 11, color: '#64748B' },
          gridcolor: '#E2E8F0',
          zerolinecolor: '#CBD5E1',
        },
        showlegend: false,
      },
      {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'toggleSpikelines'],
        displaylogo: false,
      }
    );
  }, [selectedLeadIndex, selectedSignal, selectedLeadName, timeAxis]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">

      <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-900">ECG Waveform</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Selected:{' '}
          <span className="font-medium text-blue-600">Lead {selectedLeadName}</span>
          <span className="ml-2 text-slate-400">— 10s recording at 100Hz</span>
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {leadNames.map((lead, index) => (
          <button
            key={lead}
            type="button"
            onClick={() => setSelectedLeadIndex(index)}
            className={`
              rounded-md px-3 py-2 text-sm font-medium transition-colors
              ${selectedLeadIndex === index
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
              }
            `}
          >
            {lead}
          </button>
        ))}
      </div>

      <div ref={chartRef} className="rounded-lg overflow-hidden w-full" />

    </div>
  );
}