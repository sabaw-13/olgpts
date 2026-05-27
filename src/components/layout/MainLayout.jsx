import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar.jsx';

function MainLayout() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar
          isDesktopExpanded={isSidebarExpanded}
          onDesktopExpandedChange={setIsSidebarExpanded}
        />

        <div
          className={[
            'flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out',
            isSidebarExpanded ? 'lg:pl-72' : 'lg:pl-20',
          ].join(' ')}
        >
          <main className="flex-1 px-3 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
