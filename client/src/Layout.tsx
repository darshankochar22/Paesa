import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GoToPalette from '@/components/GoToPalette';
import { useGlobalEnterNavigation } from '@/hooks/useEnterNavigation';

export default function Layout() {
  useGlobalEnterNavigation();
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
      <GoToPalette />
    </div>
  );
}
