import { Outlet } from 'react-router-dom';
import Sidebar from './SideBar';
import Topbar from './TopBar';

export default function AppShell() {
  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] font-sans text-slate-900">
      <Sidebar />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        {/* The <Outlet /> renders whatever page route is currently active (Dashboard or Patients) */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}