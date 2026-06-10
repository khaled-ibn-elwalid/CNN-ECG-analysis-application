// pages/PatientDetailPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getPatientById } from '../api/patients';
import { predictECG } from '../api/analysis';
import type { PredictionResponse } from '../types';
import DropZone from '../components/analysis/DropZone';
import AnalysisLoader from '../components/analysis/AnalysisLoader';
import ResultCard from '../components/analysis/ResultCard';
import WaveformChart from '../components/analysis/WaveformChart';
import DiagnosisHistory from '../components/diagnosis/DiagnosisHistory';

interface AnalysisVariables {
  datFile: File;
  heaFile: File;
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Fetch patient ─────────────────────────────────────
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatientById(Number(id)),
    enabled: !!id,
  });

  // ── Analysis mutation ─────────────────────────────────
  const mutation = useMutation({
    mutationFn: ({ datFile, heaFile }: AnalysisVariables): Promise<PredictionResponse> =>
      predictECG(datFile, heaFile, Number(id)),
    onSuccess: () => {
      // refresh both patient detail and patient list card badge
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const handleSubmit = (datFile: File, heaFile: File) => {
    mutation.mutate({ datFile, heaFile });
  };

  // ── Loading ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">Loading patient...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────
  if (error || !patient) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-600">Patient not found</p>
          <button
            onClick={() => navigate('/dashboard/patients')}
            className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Back to patients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">

      {/* ── Back button ── */}
      <button
        type="button"
        onClick={() => navigate('/dashboard/patients')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </button>

      {/* ── Section 1: Patient Info ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{patient.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {patient.age} years · <span className="capitalize">{patient.gender}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Patient ID
            </p>
            <p className="text-sm font-mono text-slate-600 mt-0.5">#{patient.id}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-slate-400">
            Registered on{' '}
            <span className="text-slate-600 font-medium">
              {new Date(patient.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </p>
        </div>
      </div>

      {/* ── Section 2: ECG Analysis ── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900">ECG Analysis</h2>

        {/* Idle state */}
        {!mutation.isPending && !mutation.data && (
          <DropZone onSubmit={handleSubmit} isLoading={mutation.isPending} />
        )}

        {/* Loading state */}
        {mutation.isPending && <AnalysisLoader />}

        {/* Result state */}
        {mutation.data && !mutation.isPending && (
          <div className="space-y-4">
            <ResultCard
              result={mutation.data}
              onClose={() => mutation.reset()}
            />
            <WaveformChart
              signal={mutation.data.signal}
              leadNames={mutation.data.lead_names}
            />
          </div>
        )}

        {/* Error state */}
        {mutation.error && !mutation.isPending && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-600">
              {mutation.error.message}
            </p>
            <button
              onClick={() => mutation.reset()}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* ── Section 3: Diagnosis History ── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Diagnosis History</h2>
        <DiagnosisHistory diagnoses={patient.diagnoses} />
      </div>

    </div>
  );
}