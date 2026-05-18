import { apiClient } from "./client";
import type { PredictionResponse } from "../types";

/**
 * Uploads ECG files (.dat and .hea) and an optional patient ID to the AI model for analysis.
 */

export const predictECG = async (
    datFile : File,
    heaFile : File,
    patientId? : number | null 
): Promise<PredictionResponse> => {
    const formData = new FormData();
    formData.append("dat_file", datFile);
    formData.append("hea_file", heaFile);

    if (patientId !== undefined && patientId !== null && patientId > 0)
    {formData.append("patientId",patientId.toString());}

    const response = await apiClient.post<PredictionResponse>(
        "/analysis/predict",
        formData
    );
    return response.data

    }