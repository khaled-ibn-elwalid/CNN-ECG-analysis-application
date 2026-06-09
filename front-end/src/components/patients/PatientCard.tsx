import { useNavigate } from 'react-router-dom';
import { Trash2, Clock, Activity } from 'lucide-react';
import type { PatientResponse } from '../../types';

// types
interface PatientCardProps {
    patient : PatientResponse;
    onDelete: (id:number) => void;
}
// helpers
const formatDate = (dateStr : string) : string=> {
    return new Date(dateStr).toLocaleDateString('en-GB',{
        day:'2-digit',
        month:'short',
        year:'numeric',
    });
};

const getResultsBadge = (result: string): {label:string ; style:string} =>{
    const lower = result.toLowerCase();
    if (lower.includes('norm')) return { label: result, style: 'bg-green-100 text-green-700' };
    if (lower.includes('mi') || lower.includes('infarction')) return { label: result, style: 'bg-red-100 text-red-700' };
    if (lower.includes('sttc') || lower.includes('STTC')) return { label: result, style: 'bg-red-100 text-red-700' };
    if (lower.includes('cd') || lower.includes('CD')) return { label: result, style: 'bg-red-100 text-red-700' };
    if (lower.includes('hyp') || lower.includes('HYP')) return { label: result, style: 'bg-red-100 text-red-700' };
    return { label: result, style: 'bg-amber-100 text-amber-700' };
    

};

// components:
export default function PatientCard({patient, onDelete}:PatientCardProps){
  const navigate = useNavigate();
  const lastDiagnosis = patient.diagnoses.at(-1) ?? null;
  const badge = lastDiagnosis ? getResultsBadge(lastDiagnosis.result) : null;


  const handleCardClick = () => {
    navigate(`/dashboard/patients/${patient.id}`);
  };

  const handleDelete = (e: React.MouseEvent) =>{
    e.stopPropagation();
    if (window.confirm(`Delete patient "${patient.name}"? This cannot be undone.`)) {
      onDelete(patient.id);
    }
};
return (
    <div
      onClick={handleCardClick}
      className="
        group relative flex flex-col justify-between
        rounded-xl border border-gray-200 bg-white p-5
        cursor-pointer transition-all duration-200
        hover:border-blue-300 hover:shadow-sm
      "
    >
      {/* ── Top Row: Badge + Delete ── */}
      <div className="flex items-start justify-between mb-4">
        {badge ? (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.style}`}>
            {badge.label}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
            Pending
          </span>
        )}

        <button
          type="button"
          onClick={handleDelete}
          className="
            rounded-full p-1.5 text-gray-300
            opacity-0 group-hover:opacity-100
            hover:bg-red-50 hover:text-red-500
            transition-all duration-150
          "
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Patient Info ── */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900 truncate">
          {patient.name}
        </h3>
        <p className="text-sm text-slate-500 mt-0.5">
          {patient.age} years · <span className="capitalize">{patient.gender}</span>
        </p>
      </div>

      {/* ── Bottom Row: Last ECG ── */}
      <div className="flex items-center gap-1.5 border-t border-gray-100 pt-3">
        {lastDiagnosis ? (
          <>
            <Activity className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-slate-400">
              Last ECG: <span className="text-slate-600 font-medium">{formatDate(lastDiagnosis.created_at)}</span>
            </span>
          </>
        ) : (
          <>
            <Clock className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            <span className="text-xs text-slate-400 italic">No analysis yet</span>
          </>
        )}
      </div>
    </div>
  );
}