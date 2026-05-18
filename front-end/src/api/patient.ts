import { apiClient } from "./client";
import type { PatientResponse, PatientCreate } from "../types";

/**
 * Fetches the list of all patients for the dashboard.
 */
export const getPatients = async (): Promise<PatientResponse[]> => {
  const response = await apiClient.get<PatientResponse[]>("/patients/");
  return response.data;
};

/**
 * Fetches a single patient's full profile (including their diagnosis history).
 */
export const getPatientById = async (id: number): Promise<PatientResponse> => {
  const response = await apiClient.get<PatientResponse>(`/patients/${id}`);
  return response.data;
};

/**
 * Creates a new patient in the database.
 */
export const createPatient = async (patientData: PatientCreate): Promise<PatientResponse> => {
  const response = await apiClient.post<PatientResponse>("/patients/", patientData);
  return response.data;
};

/**
 * delete patient from the database.
 */

export const deletePatient = async (id:number) : Promise<void> =>{
  await apiClient.delete(`/patients/${id}`)
};