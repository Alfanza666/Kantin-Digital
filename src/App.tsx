import { useState, useEffect } from 'react';
import { initializeDatabase, authService } from '@/services/db';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { User, ViewMode } from '@/types';

// Pages
import HomePage from '@/pages/HomePage';
import KioskMode from '@/pages/KioskMode';
import LoginPage from '@/pages/LoginPage';
import SellerDashboard from '@/pages/SellerDashboard';
import AdminDashboard from '@/pages/AdminDashboard';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize database with default data
    initializeDatabase();
    
    // Check for existing session
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      if (user.role === 'admin') {
        setCurrentView('admin');
      } else if (user.role === 'seller') {
        setCurrentView('seller');
      }
    }
    setIsLoading(false);
  }, []);

  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('seller');
    }
    toast.success(`Selamat datang, ${user.full_name}!`);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentView('home');
    toast.success('Berhasil logout');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-900 font-medium">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <Toaster position="top-center" richColors />
      
      {currentView === 'home' && (
        <HomePage 
          onNavigate={handleNavigate} 
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'kiosk' && (
        <KioskMode 
          onNavigate={handleNavigate}
          onBack={() => setCurrentView('home')}
        />
      )}
      
      {currentView === 'login' && (
        <LoginPage 
          onNavigate={handleNavigate}
          onLogin={handleLogin}
          onBack={() => setCurrentView('home')}
        />
      )}
      
      {currentView === 'seller' && currentUser && (
        <SellerDashboard 
          user={currentUser}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'admin' && currentUser && (
        <AdminDashboard 
          user={currentUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
