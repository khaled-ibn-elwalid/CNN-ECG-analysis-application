
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { getPatients, createPatient, deletePatient } from '../api/patients';
import type { PatientCreate } from '../types';
import PatientGrid from '../components/patients/PatientGrid';
import PatientForm from '../components/patients/PatientForm';

export default function PatientsPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  // ── Fetch patients ────────────────────────────────────
  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: getPatients,
  });

  // ── Create patient ────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: PatientCreate) => createPatient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowForm(false);
    },
  });

  // ── Delete patient ────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  return (
    <div className="p-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {patients.length} {patients.length === 1 ? 'patient' : 'patients'} registered
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Patient
        </button>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-slate-400">Loading patients...</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-600">Failed to load patients</p>
        </div>
      )}

      {/* ── Grid ── */}
      {!isLoading && !error && (
        <PatientGrid
          patients={patients}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}

      {/* ── Modal ── */}
      {showForm && (
        <PatientForm
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

    </div>
  );
}