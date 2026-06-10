import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from 'react';
import { getToken, setToken as setStorageToken, removeToken } from "../utils/auth";


// 1. Define the "Shape" of our Context
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean; // Helps prevent flickering while checking storage
  login: (token: string) => void;
  logout: () => void;
}

// 2. Create the actual Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create the Provider Component (The Wrapper)
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // When the app first loads, check if they already have a VIP pass in their pocket

  /*
  useEffect(() => {
    const token = getToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false); // We are done checking
  }, []);

  };
  */

  const login = (token: string) => {
    setStorageToken(token);
    setIsAuthenticated(true);
  };

  // The function to call when they hit the "Logout" button

  const logout = () => {
    removeToken(); // Delete from localStorage
    setIsAuthenticated(false); // Update global state
  };

  // We wrap the entire app (children) with our Provider, handing them these values
  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth=(): AuthContextType =>{
    const context = useContext(AuthContext);

    // safety check
    if (context == undefined){
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}