import { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  LogIn, 
  ChevronRight,
  Sparkles,
  UtensilsCrossed,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { User, ViewMode } from '@/types';

interface HomePageProps {
  onNavigate: (view: ViewMode) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export default function HomePage({ onNavigate, currentUser, onLogout }: HomePageProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-blue-100/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <UtensilsCrossed className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-900">SPS Corner</h1>
              <p className="text-xs text-blue-600/70">Kantin Digital</p>
            </div>
          </div>
          
          {currentUser && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-700 hidden sm:inline">
                {currentUser.full_name}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-4xl w-full mx-auto">
          {/* Hero Section */}
          <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/50 border border-blue-200/50 mb-6">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Sistem Kiosk Mandiri dengan AI</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-900 mb-4 leading-tight">
              Kantin Digital
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-400">
                SPS Corner
              </span>
            </h2>
            <p className="text-lg text-blue-600/80 max-w-2xl mx-auto">
              Pengalaman berbelanja modern dengan validasi pembayaran otomatis. 
              Cepat, aman, dan tanpa antrean!
            </p>
          </div>

          {/* Mode Selection Cards - Hanya 2 */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Kiosk Mode Card */}
            <Card 
              className="group cursor-pointer overflow-hidden border-0 shadow-xl shadow-blue-900/10 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm"
              onClick={() => onNavigate('kiosk')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-900/30">
                  <ShoppingCart className="w-10 h-10 text-yellow-300" />
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">Mode Kiosk</h3>
                <p className="text-sm text-blue-600/70 mb-4">
                  Belanja mandiri dengan antarmuka yang mudah digunakan. 
                  Scan QRIS dan validasi otomatis dengan AI.
                </p>
                <div className="flex items-center gap-2 text-blue-700 font-medium group-hover:gap-3 transition-all">
                  <span>Mulai Belanja</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            {/* Login Card */}
            <Card 
              className="group cursor-pointer overflow-hidden border-0 shadow-xl shadow-blue-900/10 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm"
              onClick={() => onNavigate('login')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-yellow-500/30">
                  <LogIn className="w-10 h-10 text-blue-900" />
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">Login</h3>
                <p className="text-sm text-blue-600/70 mb-4">
                  Masuk untuk mengelola produk, monitor penjualan, 
                  dan mengakses dashboard.
                </p>
                <div className="flex items-center gap-2 text-blue-700 font-medium group-hover:gap-3 transition-all">
                  <span>Masuk</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {[
              { icon: Sparkles, label: 'AI Validation', desc: 'Otomatis & Cepat' },
              { icon: QrCode, label: 'QRIS Payment', desc: 'Scan & Bayar' },
              { icon: ShoppingCart, label: 'Self Checkout', desc: 'Tanpa Antrean' },
              { icon: ShieldCheck, label: 'Aman', desc: 'Terverifikasi' },
            ].map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center text-center p-4">
                <feature.icon className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-sm font-semibold text-blue-900">{feature.label}</span>
                <span className="text-xs text-blue-600/60">{feature.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-4 border-t border-blue-100/50 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-blue-600/60">
            © 2025 SPS Corner - Kantin Digital. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
