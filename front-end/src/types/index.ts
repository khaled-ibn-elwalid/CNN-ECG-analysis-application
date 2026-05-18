export interface TokenResponse {
    access_token : string;
    token_type : string;
}

// patient types

export type Gender = "male" | "female"
export interface PatientCreate{
    name : string;
    age : number;
    gender : Gender
}

export interface PatientResponse {
    id : number;
    name : string;
    age : number;
    gender : Gender;
    created_at: string;
    diagnoses: DiagnosisResponse[];
}

export interface DiagnosisResponse{
    id: number;
    patient_id: number;
    result: string;
    confidence: number;
    signal_path: string | null;
    created_at: string;
}

export interface ClassPrediction{
    label: string;
    confidence: number;
    is_positive: boolean;
}

export interface PredictionResponse{
    predictions: ClassPrediction[];
    top_label: string;
    top_confidence: number;
    signal:number[][];
    lead_names: string[];
    bpm?: number;
}

export interface LoginRequest {
    username: string;
    password: string;
}
