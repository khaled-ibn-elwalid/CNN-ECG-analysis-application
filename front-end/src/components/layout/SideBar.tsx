import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Activity } from 'lucide-react';
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import { getToken } from '../../utils/auth';

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

const handleLogout = () => {
    logout();
    navigate('/login');
};
  const [username, setUsername] = useState('Admin');

  // Decode JWT to extract the 'sub' field on mount
  useEffect(() => {
    const token = getToken(); // Use the exact key you defined in src/utils/auth.ts
    if (token) {
      try {
        // JWT is header.payload.signature. We want the payload (index 1).
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.sub) {
          // Capitalize the first letter
          setUsername(payload.sub.charAt(0).toUpperCase() + payload.sub.slice(1));
        }
      } catch (error) {
        console.error("Failed to decode token for username");
      }
    }
  }, []);

  const doctorName = `Dr. ${username}`;

  return (
    <aside className="flex w-64 flex-col justify-between border-r border-gray-200 bg-white py-6">
      
      {/* Top Section: Branding & Links */}
      <div>
        {/* App Logo / Name */}
        <div className="mb-8 flex items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            ECG Portal
          </h1>
        </div>

        <nav className="flex flex-col gap-1">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 border-l-4 px-6 py-3 text-sm font-medium transition-colors ${
                isActive 
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700' 
                  : 'border-transparent text-slate-500 hover:bg-gray-50 hover:text-slate-900'
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>

          <NavLink
            to="/dashboard/patients"
            className={({ isActive }) =>
              `flex items-center gap-3 border-l-4 px-6 py-3 text-sm font-medium transition-colors ${
                isActive 
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700' 
                  : 'border-transparent text-slate-500 hover:bg-gray-50 hover:text-slate-900'
              }`
            }
          >
            <Users className="h-4 w-4" />
            Patients
          </NavLink>
        </nav>
      </div>

      {/* Bottom Section: Profile & Logout */}
      <div className="border-t border-gray-100 px-6 pt-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-blue-700">
            {username.charAt(0)}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold text-slate-900">{doctorName}</span>
            <span className="truncate text-xs text-slate-500">Cardiology</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md py-2 text-sm font-medium text-slate-500 transition-colors hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}