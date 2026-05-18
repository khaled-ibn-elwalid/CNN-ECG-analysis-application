import { apiClient } from "./client";
import type { LoginRequest, TokenResponse } from "../types";

/**
 * Sends user credentials to the FastAPI backend and retrieves a JWT token.
 */
export const loginUser = async (credentials: LoginRequest): Promise<TokenResponse> => {
  // 1. Convert standard JSON into the Form Data format that FastAPI expects
  const formData = new URLSearchParams();
  formData.append("username", credentials.username);
  formData.append("password", credentials.password);

  // 2. Make the POST request using our centralized apiClient
  const response = await apiClient.post<TokenResponse>("/auth/login", formData, {
    headers: {
      // Overriding the default JSON header just for this specific request
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  // 3. Return the data (which will be an object containing the access_token)
  return response.data;
};