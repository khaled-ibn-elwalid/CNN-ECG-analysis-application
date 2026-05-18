import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";

// ---------------------------------------------------------
// 1. The Security Wrapper Component
// ---------------------------------------------------------
// This wraps around any page we want to lock behind a login.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show nothing (or a spinner) while checking local storage
  if (isLoading) return null; 

  // If they aren't logged in, kick them back to the login page
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // If they are logged in, let them see the page!
  return <>{children}</>;
};

// ---------------------------------------------------------
// 2. A Temporary Dashboard (Just for testing!)
// ---------------------------------------------------------
const DashboardPlaceholder = () => {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-bold text-green-600 mb-4">Login Successful!</h1>
      <p className="text-gray-600 mb-8">Welcome to the secure dashboard area.</p>
      <button 
        onClick={logout}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
      >
        Log Out
      </button>
    </div>
  );
};

// ---------------------------------------------------------
// 3. The Main App Component
// ---------------------------------------------------------
const App = () => {
  return (
    // Wrap the ENTIRE app in our Security Guard context
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Route (Wrapped in our security guard) */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all: If they type a random URL, send them to dashboard (which will redirect to login if unauthorized) */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;