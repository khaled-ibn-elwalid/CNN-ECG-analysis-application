import { useMutation } from '@tanstack/react-query';
import { predictECG } from '../api/analysis';
import type { PredictionResponse } from '../types';
import DropZone from '../components/analysis/DropZone';
import AnalysisLoader from '../components/analysis/AnalysisLoader';
import ResultCard from '../components/analysis/ResultCard';

interface AnalysisVariables {
  datFile: File;
  heaFile: File;
} 

export default function DashboardPage() {
  const mutation = useMutation({
    mutationFn: ({ datFile, heaFile }: AnalysisVariables): Promise<PredictionResponse> =>
      predictECG(datFile, heaFile),
  });

  const handleSubmit = (datFile: File, heaFile: File) => {
     
    mutation.mutate({ datFile, heaFile });
  };

  return (
    <div className="flex min-h-full items-center justify-center p-8">

      {!mutation.isPending && !mutation.data && (
        <DropZone onSubmit={handleSubmit} isLoading={mutation.isPending} />
      )}

      {mutation.isPending && <AnalysisLoader />}

      {mutation.data && !mutation.isPending && (
  <div className="w-full max-w-3xl">
    <ResultCard
      result={mutation.data}
      onClose={() => mutation.reset()}
    />
  </div>
)}

      {mutation.error && !mutation.isPending && (
        <div className="w-full max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-600">{mutation.error.message}</p>
          <button
            onClick={() => mutation.reset()}
            className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Try again
          </button>
        </div>
      )}

    </div>
  );
}