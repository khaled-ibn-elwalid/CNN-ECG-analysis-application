import { Search, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Topbar() {
  const location = useLocation();
  
  // Basic route-to-title mapping
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/patients/')) return 'Patient Details';
    if (path.includes('/patients')) return 'Patients';
    return 'Dashboard';
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-8">
      
      {/* Left: Dynamic Page Title / Breadcrumb */}
      <div className="w-1/3">
        <h2 className="text-lg font-semibold text-slate-800">
          {getPageTitle()}
        </h2>
      </div>

      {/* Middle: Global Search */}
      <div className="relative flex w-1/3 max-w-md justify-center">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search patients, IDs, or records..."
          className="block w-full rounded-full border border-gray-200 bg-[#FAFAFA] py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-gray-400 focus:border-slate-300 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Right: Actions / Notifications */}
      <div className="flex w-1/3 justify-end">
        <button className="relative rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-slate-600 transition-colors">
          <Bell className="h-5 w-5" />
          {/* Optional: Add a red dot for unread notifications */}
          <span className="absolute right-2 top-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>
      </div>

    </header>
  );
}