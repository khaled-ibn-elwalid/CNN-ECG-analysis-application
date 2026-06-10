import axios from "axios";
import { getToken, removeToken } from "../utils/auth"; // <-- Import the utilities

// 1. Create the base instance
export const apiClient = axios.create({
  baseURL: "http://localhost:8000",
});

// 2. Request Interceptor: Attach the token automatically
apiClient.interceptors.request.use(
  (config) => {
    // Use the utility function instead of localStorage directly
    const token = getToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Response Interceptor: Handle expired tokens globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Use the utility function to clear the token
      removeToken();
      
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    
    return Promise.reject(error);
  }
);