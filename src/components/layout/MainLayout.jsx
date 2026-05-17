import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header />

          <main className="flex-1 px-3 pb-28 pt-4 sm:px-6 sm:py-5 lg:px-8 lg:pb-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
