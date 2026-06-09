import type { PatientResponse } from '../../types';
import PatientCard from './PatientCard';

interface PatientGridProps {
  patients: PatientResponse[];
  onDelete: (id: number) => void;
}

export default function PatientGrid({ patients, onDelete }: PatientGridProps) {
  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
        <p className="text-sm font-medium text-slate-500">No patients yet</p>
        <p className="text-xs text-slate-400 mt-1">Click "Add Patient" to create the first record</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {patients.map(patient => (
        <PatientCard
          key={patient.id}
          patient={patient}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}