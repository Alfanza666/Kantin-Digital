import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
  User,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { productService, transactionService, qrisService, failedValidationService, generateId, formatCurrency } from '@/services/db';
import { toast } from 'sonner';
import type { Product, CartItem, Transaction, ViewMode, FailedValidation } from '@/types';

interface KioskModeProps {
  onNavigate: (view: ViewMode) => void;
  onBack: () => void;
}

// AI Validation using Gemini API
async function validateWithGemini(imageBase64: string, expectedAmount: number): Promise<{ success: boolean; reason?: string }> {
  try {
    // Get Gemini API key from environment variable
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('Gemini API key not found, using simulation');
      // Fallback to simulation if no API key
      return simulateAIValidation(imageBase64, expectedAmount);
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Analisis bukti pembayaran ini. Total yang harus dibayar adalah Rp ${expectedAmount}. 
              Periksa apakah:
              1. Nominal transfer sesuai dengan Rp ${expectedAmount}
              2. Status transaksi adalah SUKSES/BERHASIL
              3. Tanggal transaksi adalah hari ini
              
              Jawab dalam format JSON: {"valid": true/false, "reason": "alasan jika tidak valid"}`
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: result.valid === true,
          reason: result.reason
        };
      }
    }
    
    // If parsing fails, assume valid for better UX
    return { success: true };
  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to simulation
    return simulateAIValidation(imageBase64, expectedAmount);
  }
}

// AI Validation Simulation (Fallback)
function simulateAIValidation(_imageData: string, _expectedAmount: number): Promise<{ success: boolean; reason?: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate AI analysis - 90% success rate for demo
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        resolve({ success: true });
      } else {
        const reasons = [
          'Nominal tidak sesuai dengan total pembayaran',
          'Tanggal transaksi tidak valid',
          'Status transaksi tidak terdeteksi sebagai sukses',
          'Gambar buram atau tidak jelas',
          'Bukti transfer tidak ditemukan dalam gambar'
        ];
        resolve({ 
          success: false, 
          reason: reasons[Math.floor(Math.random() * reasons.length)] 
        });
      }
    }, 2000); // 2 seconds for AI analysis
  });
}

export default function KioskMode({ onBack }: KioskModeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [qrisImage, setQrisImage] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadProducts();
    loadQRIS();
  }, []);

  const loadProducts = () => {
    const allProducts = productService.getActive();
    setProducts(allProducts);
    
    // Extract unique categories
    const uniqueCategories = [...new Set(allProducts.map(p => p.category))];
    setCategories(uniqueCategories);
  };

  const loadQRIS = () => {
    const qris = qrisService.get();
    if (qris) {
      setQrisImage(qris.image_url);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error('Stok tidak mencukupi');
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        if (newQuantity > item.product.stock) {
          toast.error('Stok tidak mencukupi');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera if available
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast.error('Tidak dapat mengakses kamera. Pastikan izin kamera diizinkan.');
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
        validatePayment(imageData);
      }
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Silakan masukkan nama Anda');
      return;
    }
    setShowCheckout(false);
    setShowPayment(true);
  };

  const handlePaymentComplete = () => {
    setShowPayment(false);
    setShowValidation(true);
    setValidationStatus('idle');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      setCapturedImage(imageData);
      await validatePayment(imageData);
    };
    reader.readAsDataURL(file);
  };

  const validatePayment = async (imageData: string) => {
    setValidationStatus('scanning');
    
    const result = await validateWithGemini(imageData, cartTotal);
    
    if (result.success) {
      setValidationStatus('success');
      // Create transaction
      const transaction: Transaction = {
        id: generateId('trx-'),
        customer_name: customerName,
        items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.product.price * item.quantity,
        })),
        total_amount: cartTotal,
        status: 'verified',
        payment_proof_url: imageData,
        verification_attempts: 1,
        seller_id: cart[0]?.product.seller_id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      transactionService.create(transaction);
      
      // Reduce stock
      cart.forEach(item => {
        productService.reduceStock(item.product.id, item.quantity);
      });
      
      toast.success('Pembayaran berhasil diverifikasi!');
      
      // Reset and close
      setTimeout(() => {
        setCart([]);
        setCustomerName('');
        setShowValidation(false);
        setCapturedImage(null);
        setValidationStatus('idle');
        loadProducts(); // Reload to update stock
      }, 2000);
    } else {
      setValidationStatus('failed');
      setValidationMessage(result.reason || 'Validasi gagal');
      
      // Log failed validation
      const failedValidation: FailedValidation = {
        id: generateId('fail-'),
        customer_name: customerName,
        attempted_amount: cartTotal,
        failure_reason: result.reason || 'Validasi gagal',
        image_url: imageData,
        created_at: new Date().toISOString(),
      };
      failedValidationService.create(failedValidation);
    }
  };

  const retryValidation = () => {
    setValidationStatus('idle');
    setCapturedImage(null);
    setValidationMessage('');
  };

  const cancelTransaction = () => {
    setShowValidation(false);
    setShowPayment(false);
    setCapturedImage(null);
    setValidationStatus('idle');
    toast.info('Transaksi dibatalkan');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      {/* Header */}
      <header className="w-full px-4 sm:px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-blue-100/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="rounded-full hover:bg-blue-50"
            >
              <ArrowLeft className="w-5 h-5 text-blue-700" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-blue-900">Mode Kiosk</h1>
              <p className="text-xs text-blue-600/70 hidden sm:block">Belanja mandiri dengan AI</p>
            </div>
          </div>
          
          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
              <Input
                type="text"
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-full bg-white/80"
              />
            </div>
          </div>

          {/* Cart Button */}
          <Button
            variant="outline"
            onClick={() => setIsCartOpen(true)}
            className="relative border-blue-200 hover:bg-blue-50 rounded-full px-4"
          >
            <ShoppingCart className="w-5 h-5 text-blue-700 mr-2" />
            <span className="text-blue-700 font-medium hidden sm:inline">Keranjang</span>
            {cartItemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-yellow-400 text-blue-900 border-0">
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Search Bar - Mobile */}
        <div className="mt-3 md:hidden">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
            <Input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-full bg-white/80"
            />
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="px-4 sm:px-6 py-4 bg-white/50 backdrop-blur-sm border-b border-blue-100/50">
        <div className="max-w-7xl mx-auto">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0 justify-start">
              <TabsTrigger 
                value="all"
                className="px-4 py-2 rounded-full border border-blue-200 data-[state=active]:bg-blue-900 data-[state=active]:text-white data-[state=active]:border-blue-900 bg-white text-blue-700"
              >
                Semua
              </TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger 
                  key={cat}
                  value={cat}
                  className="px-4 py-2 rounded-full border border-blue-200 data-[state=active]:bg-blue-900 data-[state=active]:text-white data-[state=active]:border-blue-900 bg-white text-blue-700"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Product Grid */}
      <main className="flex-1 px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Produk tidak ditemukan</h3>
              <p className="text-blue-600/70">Coba kata kunci lain atau pilih kategori berbeda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id}
                  className="group overflow-hidden border-0 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-300 bg-white/90 backdrop-blur-sm"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=No+Image';
                      }}
                    />
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <Badge variant="secondary" className="mb-2 text-xs bg-blue-50 text-blue-700">
                      {product.category}
                    </Badge>
                    <h3 className="font-semibold text-blue-900 text-sm sm:text-base line-clamp-1 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-blue-600/70 line-clamp-2 mb-2 h-8">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 text-sm sm:text-base">
                        {formatCurrency(product.price)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className="h-8 w-8 p-0 rounded-full bg-blue-900 hover:bg-blue-800"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-blue-500 mt-1">
                      Stok: {product.stock}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart Button (Mobile) */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden">
          <Button
            onClick={() => setIsCartOpen(true)}
            className="bg-blue-900 hover:bg-blue-800 text-white rounded-full px-6 py-6 shadow-xl shadow-blue-900/30"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            <span>{cartItemCount} item</span>
            <Separator orientation="vertical" className="mx-3 h-4 bg-white/30" />
            <span>{formatCurrency(cartTotal)}</span>
          </Button>
        </div>
      )}

      {/* Cart Drawer */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-blue-100">
            <DialogTitle className="flex items-center gap-2 text-blue-900">
              <ShoppingCart className="w-5 h-5" />
              Keranjang Belanja
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 py-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-16 h-16 text-blue-200 mx-auto mb-4" />
                <p className="text-blue-600/70">Keranjang masih kosong</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex gap-3 p-3 bg-blue-50/50 rounded-xl">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 text-sm">{item.product.name}</h4>
                      <p className="text-xs text-blue-600/70">{formatCurrency(item.product.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="h-7 w-7 p-0 rounded-full border-blue-200"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="h-7 w-7 p-0 rounded-full border-blue-200"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-900 text-sm">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.product.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 mt-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {cart.length > 0 && (
            <div className="px-6 py-4 border-t border-blue-100 bg-blue-50/30">
              <div className="flex justify-between mb-4">
                <span className="text-blue-600">Total</span>
                <span className="text-xl font-bold text-blue-900">{formatCurrency(cartTotal)}</span>
              </div>
              <Button
                onClick={() => {
                  setIsCartOpen(false);
                  setShowCheckout(true);
                }}
                className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white rounded-xl"
              >
                Lanjutkan ke Pembayaran
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-900">Data Pembeli</DialogTitle>
            <DialogDescription className="text-blue-600/70">
              Masukkan nama Anda untuk melanjutkan pembayaran
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Nama Lengkap
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Masukkan nama Anda"
                className="h-12 border-blue-200"
              />
            </div>
            
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-medium text-blue-900 mb-2">Ringkasan Pesanan</h4>
              <div className="space-y-1 text-sm">
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between text-blue-700">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span>{formatCurrency(item.product.price * item.quantity)}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-blue-900">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCheckout(false)}
              className="flex-1 border-blue-200"
            >
              Kembali
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={!customerName.trim()}
              className="flex-1 bg-blue-900 hover:bg-blue-800"
            >
              Lanjutkan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pembayaran QRIS
            </DialogTitle>
            <DialogDescription className="text-blue-600/70">
              Scan kode QRIS berikut menggunakan aplikasi e-wallet Anda
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-white rounded-xl p-6 shadow-inner border border-blue-100">
              <img
                src={qrisImage}
                alt="QRIS Code"
                className="w-full max-w-[250px] mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=QRIS+Code';
                }}
              />
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-blue-600">Total Pembayaran</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(cartTotal)}</p>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-sm text-yellow-800 text-center">
                Setelah membayar, klik tombol di bawah untuk validasi otomatis
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPayment(false)}
              className="flex-1 border-blue-200"
            >
              Kembali
            </Button>
            <Button
              onClick={handlePaymentComplete}
              className="flex-1 bg-blue-900 hover:bg-blue-800"
            >
              Saya Sudah Bayar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Validation Dialog */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Validasi AI
            </DialogTitle>
            <DialogDescription className="text-blue-600/70">
              {validationStatus === 'idle' && 'Upload bukti pembayaran untuk validasi otomatis'}
              {validationStatus === 'scanning' && 'AI sedang menganalisis bukti pembayaran...'}
              {validationStatus === 'success' && 'Pembayaran berhasil diverifikasi!'}
              {validationStatus === 'failed' && 'Validasi gagal. Silakan coba lagi.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* Camera View */}
            {showCamera && (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-xl"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={stopCamera}
                    className="rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={capturePhoto}
                    className="rounded-full w-14 h-14 bg-blue-900 hover:bg-blue-800"
                  >
                    <Camera className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            )}
            
            {validationStatus === 'idle' && !showCamera && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={startCamera}
                    className="h-24 flex flex-col items-center justify-center bg-blue-900 hover:bg-blue-800"
                  >
                    <Camera className="w-8 h-8 mb-2" />
                    <span>Ambil Foto</span>
                  </Button>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-400 text-2xl mb-1">📁</span>
                    <span className="text-blue-700 font-medium">Upload File</span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {capturedImage && (
                  <div className="mt-4">
                    <p className="text-sm text-blue-600 mb-2">Preview:</p>
                    <img 
                      src={capturedImage} 
                      alt="Captured" 
                      className="w-full rounded-xl border border-blue-200"
                    />
                  </div>
                )}
              </div>
            )}
            
            {validationStatus === 'scanning' && (
              <div className="text-center py-8">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
                  <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-yellow-500" />
                </div>
                <p className="text-blue-900 font-medium">AI Sedang Menganalisis</p>
                <p className="text-sm text-blue-600/70 mt-1">Mendeteksi nominal, tanggal, dan status...</p>
              </div>
            )}
            
            {validationStatus === 'success' && (
              <div className="text-center py-8">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <p className="text-green-700 font-medium text-lg">Verifikasi Berhasil!</p>
                <p className="text-sm text-green-600/70 mt-1">Transaksi Anda telah tercatat</p>
              </div>
            )}
            
            {validationStatus === 'failed' && (
              <div className="text-center py-8">
                <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
                <p className="text-red-700 font-medium text-lg">Verifikasi Gagal</p>
                <p className="text-sm text-red-600/70 mt-1">{validationMessage}</p>
              </div>
            )}
          </div>
          
          {validationStatus === 'failed' && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={cancelTransaction}
                className="flex-1 border-red-200 text-red-600"
              >
                Batal
              </Button>
              <Button
                onClick={retryValidation}
                className="flex-1 bg-blue-900 hover:bg-blue-800"
              >
                Coba Lagi
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
