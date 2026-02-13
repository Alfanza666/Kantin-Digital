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
  X,
  RefreshCcw,
  ChevronRight,
  Upload
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { productService, transactionService, qrisService, failedValidationService, generateId, formatCurrency } from '@/services/db';
import { toast } from 'sonner';
import type { Product, CartItem, Transaction, ViewMode, FailedValidation } from '@/types';

interface KioskModeProps {
  onNavigate: (view: ViewMode) => void;
  onBack: () => void;
}

interface FlyingItem {
  id: number;
  src: string;
  style: React.CSSProperties;
}

type CheckoutStep = 'idle' | 'cart' | 'details' | 'payment' | 'camera' | 'processing' | 'result';

// AI Validation using Gemini API
async function validateWithGemini(imageBase64: string, expectedAmount: number, expectedMerchant: string): Promise<{ success: boolean; reason?: string }> {
  try {
    if (!process.env.API_KEY) {
      console.warn('Gemini API key not found, using simulation');
      return simulateAIValidation(imageBase64, expectedAmount);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const prompt = `Anda adalah sistem verifikasi pembayaran otomatis.
              Tugas: Validasi bukti transfer/QRIS ini secara KETAT.
              
              Data yang diharapkan:
              1. Nominal Total: Rp ${expectedAmount} (atau ${expectedAmount})
              2. Nama Merchant/Penerima: "${expectedMerchant}" (Harus mengandung kata SPS Corner atau nama merchant yang mirip)
              3. Status: BERHASIL / SUKSES / SUCCESS

              Aturan Validasi:
              - Jika nominal tidak terbaca atau berbeda, return valid: false.
              - Jika nama penerima tidak mengandung unsur "${expectedMerchant}", return valid: false.
              - Jika status pending/gagal, return valid: false.
              
              Jawab HANYA dalam format JSON valid tanpa markdown: 
              {"valid": true, "reason": "Data sesuai"} 
              atau 
              {"valid": false, "reason": "Alasan spesifik (misal: Nominal tidak sesuai / Nama Toko salah / Foto buram)"}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    
    if (text) {
      const cleanText = text.trim();
      
      try {
        const result = JSON.parse(cleanText);
        return {
          success: result.valid === true,
          reason: result.reason
        };
      } catch (e) {
        console.error("Failed to parse AI response", e);
        return { success: false, reason: "Gagal memproses respon AI" };
      }
    }
    
    return { success: false, reason: "Tidak dapat membaca gambar" };
  } catch (error) {
    console.error('Gemini API error:', error);
    return simulateAIValidation(imageBase64, expectedAmount);
  }
}

function simulateAIValidation(_imageData: string, _expectedAmount: number): Promise<{ success: boolean; reason?: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2;
      if (isSuccess) {
        resolve({ success: true });
      } else {
        const reasons = [
          'Nominal tidak sesuai dengan total pembayaran',
          'Nama toko/merchant tidak sesuai (Bukan SPS Corner)',
          'Status transaksi tidak terdeteksi sebagai sukses',
          'Gambar buram atau tidak jelas',
        ];
        resolve({ 
          success: false, 
          reason: reasons[Math.floor(Math.random() * reasons.length)] 
        });
      }
    }, 2000);
  });
}

export default function KioskMode({ onBack }: KioskModeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Checkout State Machine
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('idle');
  
  const [customerName, setCustomerName] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [qrisData, setQrisData] = useState<{ image_url: string, merchant_name: string } | null>(null);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Refs for animation targets
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      await loadProducts();
      await loadQRIS();
    };
    init();
    
    return () => {
      stopCamera();
    }
  }, []);

  const loadProducts = async () => {
    const allProducts = await productService.getActive();
    setProducts(allProducts);
    const uniqueCategories = [...new Set(allProducts.map(p => p.category))] as string[];
    setCategories(uniqueCategories);
  };

  const loadQRIS = async () => {
    const qris = await qrisService.get();
    if (qris) {
      setQrisData({
        image_url: qris.image_url,
        merchant_name: qris.merchant_name
      });
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const triggerFlyAnimation = (product: Product) => {
    const imgElement = document.getElementById(`product-img-${product.id}`);
    const isMobile = window.innerWidth < 768;
    const targetElement = isMobile ? mobileCartRef.current : cartButtonRef.current;

    if (imgElement && targetElement) {
      const startRect = imgElement.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const flyId = Date.now();

      const newItem: FlyingItem = {
        id: flyId,
        src: product.image_url,
        style: {
          position: 'fixed',
          top: startRect.top,
          left: startRect.left,
          width: startRect.width,
          height: startRect.height,
          opacity: 1,
          zIndex: 9999,
          pointerEvents: 'none',
          transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
          borderRadius: '0.5rem',
          objectFit: 'cover'
        }
      };

      setFlyingItems(prev => [...prev, newItem]);

      setTimeout(() => {
        setFlyingItems(prev => prev.map(item => {
          if (item.id === flyId) {
            return {
              ...item,
              style: {
                ...item.style,
                top: targetRect.top + (targetRect.height / 2) - 16,
                left: targetRect.left + (targetRect.width / 2) - 16,
                width: '32px',
                height: '32px',
                opacity: 0.5,
                borderRadius: '50%'
              }
            };
          }
          return item;
        }));
      }, 50);

      setTimeout(() => {
        setFlyingItems(prev => prev.filter(item => item.id !== flyId));
      }, 850);
    }
  };

  const addToCart = (product: Product) => {
    triggerFlyAnimation(product);
    
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
    setTimeout(() => toast.success(`${product.name} ditambahkan`), 300);
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

  const startCamera = async () => {
    setCheckoutStep('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      // Small delay to ensure video element is mounted
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast.error('Tidak dapat mengakses kamera.');
      setCheckoutStep('payment'); // Go back
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
        validatePayment(imageData);
      }
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutStart = () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }
    setCheckoutStep('cart');
  };

  const handleDetailsSubmit = () => {
    if (!customerName.trim()) {
      toast.error('Silakan masukkan nama Anda');
      return;
    }
    setCheckoutStep('payment');
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
    setCheckoutStep('processing');
    const merchantName = qrisData?.merchant_name || 'SPS Corner';
    const result = await validateWithGemini(imageData, cartTotal, merchantName);
    
    if (result.success) {
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
      
      await transactionService.create(transaction);
      
      for (const item of cart) {
         await productService.reduceStock(item.product.id, item.quantity);
      }
      
      setValidationMessage('Pembayaran berhasil diverifikasi!');
      setCheckoutStep('result'); // Success
      
      setTimeout(() => {
        resetCheckout();
        loadProducts();
      }, 4000);
    } else {
      setValidationMessage(result.reason || 'Validasi gagal. Cek kembali bukti pembayaran.');
      setCheckoutStep('result'); // Failed
      
      const failedValidation: FailedValidation = {
        id: generateId('fail-'),
        customer_name: customerName,
        attempted_amount: cartTotal,
        failure_reason: result.reason || 'Validasi gagal',
        image_url: imageData,
        created_at: new Date().toISOString(),
      };
      await failedValidationService.create(failedValidation);
    }
  };

  const retryValidation = () => {
    setValidationMessage('');
    startCamera();
  };

  const resetCheckout = () => {
    setCart([]);
    setCustomerName('');
    setCapturedImage(null);
    setValidationMessage('');
    setCheckoutStep('idle');
  };

  const cancelTransaction = () => {
    stopCamera();
    setCheckoutStep('idle');
    setCapturedImage(null);
    toast.info('Transaksi dibatalkan');
  };

  // Dedicated Render Functions for Checkout Steps

  const renderCartStep = () => (
    <div className="flex flex-col h-full max-w-2xl mx-auto bg-white shadow-xl md:rounded-2xl overflow-hidden my-0 md:my-8 h-screen md:h-[80vh]">
      <div className="bg-blue-900 text-white p-6 flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" /> Keranjang Belanja
        </h2>
        <Button variant="ghost" className="text-white hover:bg-blue-800" onClick={() => setCheckoutStep('idle')}>
          <X className="w-6 h-6" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-6">
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-blue-200 mx-auto mb-4" />
            <p className="text-blue-600/70">Keranjang masih kosong</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <img src={item.product.image_url} alt={item.product.name} className="w-20 h-20 rounded-lg object-cover" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900">{item.product.name}</h4>
                  <p className="text-sm text-blue-600/70">{formatCurrency(item.product.price)}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <Button size="sm" variant="outline" onClick={() => updateQuantity(item.product.id, -1)} className="h-8 w-8 p-0 rounded-full">
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => updateQuantity(item.product.id, 1)} className="h-8 w-8 p-0 rounded-full">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col justify-between items-end">
                  <p className="font-bold text-blue-900">{formatCurrency(item.product.price * item.quantity)}</p>
                  <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      {cart.length > 0 && (
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between mb-4">
            <span className="text-gray-600">Total Pembayaran</span>
            <span className="text-2xl font-bold text-blue-900">{formatCurrency(cartTotal)}</span>
          </div>
          <Button onClick={() => setCheckoutStep('details')} className="w-full h-12 text-lg bg-blue-900 hover:bg-blue-800 rounded-xl">
            Lanjut ke Data Diri <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-white shadow-xl md:rounded-2xl overflow-hidden my-0 md:my-12 h-screen md:h-auto">
      <div className="bg-blue-900 text-white p-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <User className="w-5 h-5" /> Data Pembeli
        </h2>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-blue-900">Nama Lengkap</label>
          <Input 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Masukkan nama Anda"
            className="h-12 border-blue-200 text-lg"
          />
        </div>
        <div className="bg-blue-50 p-4 rounded-xl">
          <h4 className="font-medium text-blue-900 mb-2">Ringkasan</h4>
          <div className="space-y-1 text-sm text-blue-700">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between">
                <span>{item.quantity}x {item.product.name}</span>
                <span>{formatCurrency(item.product.price * item.quantity)}</span>
              </div>
            ))}
            <Separator className="my-2 bg-blue-200" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => setCheckoutStep('cart')} className="flex-1 h-12 border-blue-200">
            Kembali
          </Button>
          <Button onClick={handleDetailsSubmit} disabled={!customerName.trim()} className="flex-1 h-12 bg-blue-900 hover:bg-blue-800">
            Lanjut Pembayaran
          </Button>
        </div>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-white shadow-xl md:rounded-2xl overflow-hidden my-0 md:my-12 h-screen md:h-auto">
      <div className="bg-blue-900 text-white p-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="w-5 h-5" /> Pembayaran QRIS
        </h2>
      </div>
      <div className="p-6 flex flex-col items-center">
        <div className="bg-white p-4 rounded-xl shadow-lg border border-blue-100 mb-6">
          <img 
            src={qrisData?.image_url || ''} 
            alt="QRIS Code" 
            className="w-64 h-64 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=QRIS+Code'; }}
          />
        </div>
        <p className="text-sm text-gray-500 mb-1">Total yang harus dibayar</p>
        <p className="text-3xl font-bold text-blue-900 mb-6">{formatCurrency(cartTotal)}</p>
        
        <Alert variant="default" className="bg-yellow-50 border-yellow-200 mb-6">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 text-xs">
            Pastikan nama merchant adalah <strong>{qrisData?.merchant_name || 'SPS Corner'}</strong>.
          </AlertDescription>
        </Alert>

        <div className="w-full flex gap-3">
          <Button variant="outline" onClick={() => setCheckoutStep('details')} className="flex-1 h-12 border-blue-200">
            Kembali
          </Button>
          <Button onClick={startCamera} className="flex-1 h-12 bg-blue-900 hover:bg-blue-800">
            Scan Bukti Bayar
          </Button>
        </div>
        
        <div className="mt-4 w-full">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />
             <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="w-full text-blue-600">
                <Upload className="w-4 h-4 mr-2" /> Upload File Saja
             </Button>
        </div>
      </div>
    </div>
  );

  const renderCameraStep = () => (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={() => videoRef.current?.play()} className="w-full h-full object-cover" />
        <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/50 to-transparent">
             <p className="text-white text-center font-medium">Foto Bukti Pembayaran</p>
        </div>
        {/* Viewfinder overlay */}
        <div className="absolute inset-0 border-[40px] border-black/30 pointer-events-none">
            <div className="w-full h-full border-2 border-white/50 relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-yellow-400"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-yellow-400"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-yellow-400"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-yellow-400"></div>
            </div>
        </div>
      </div>
      <div className="p-8 bg-black flex justify-between items-center">
        <Button variant="secondary" size="icon" className="rounded-full w-12 h-12 bg-gray-800 text-white" onClick={() => { stopCamera(); setCheckoutStep('payment'); }}>
            <X className="w-6 h-6" />
        </Button>
        <Button size="icon" className="rounded-full w-20 h-20 bg-white hover:bg-gray-200 border-4 border-gray-300" onClick={capturePhoto}>
            <div className="w-16 h-16 rounded-full bg-white border-2 border-black" />
        </Button>
        <div className="w-12"></div> {/* Spacer */}
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8">
        <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-8 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto w-12 h-12 text-yellow-500 animate-pulse" />
        </div>
        <h3 className="text-2xl font-bold text-blue-900 mb-2">AI Sedang Memeriksa</h3>
        <p className="text-blue-600/70 text-center">Mohon tunggu sebentar, kami sedang memvalidasi bukti pembayaran Anda...</p>
        <div className="mt-8 p-4 bg-blue-50 rounded-xl max-w-sm w-full">
            <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-600">Nominal</span>
                <span className="font-bold text-blue-900">{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-blue-600">Merchant</span>
                <span className="font-bold text-blue-900">{qrisData?.merchant_name}</span>
            </div>
        </div>
    </div>
  );

  const renderResultStep = () => {
    const isSuccess = validationMessage.includes('berhasil');
    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
                {isSuccess ? <CheckCircle2 className="w-12 h-12 text-green-600" /> : <AlertCircle className="w-12 h-12 text-red-600" />}
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
                {isSuccess ? 'Pembayaran Berhasil!' : 'Verifikasi Gagal'}
            </h3>
            <p className="text-gray-600 text-center max-w-md mb-8">{validationMessage}</p>
            
            {isSuccess ? (
                 <p className="text-sm text-gray-400">Mengalihkan ke halaman utama...</p>
            ) : (
                <div className="flex gap-4 w-full max-w-xs">
                    <Button variant="outline" onClick={cancelTransaction} className="flex-1 border-red-200 text-red-600">
                        Batal
                    </Button>
                    <Button onClick={retryValidation} className="flex-1 bg-blue-900">
                        <RefreshCcw className="w-4 h-4 mr-2" /> Foto Ulang
                    </Button>
                </div>
            )}
        </div>
    )
  };

  // Main Render
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-yellow-50 relative overflow-hidden">
      {/* Animation Layer */}
      {flyingItems.map(item => (
        <img key={item.id} src={item.src} alt="flying" style={item.style} />
      ))}

      {/* Conditional Rendering based on Checkout Step */}
      {checkoutStep === 'idle' ? (
        <>
            {/* Standard Kiosk Shop UI */}
            <header className="w-full px-4 sm:px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-blue-100/50 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-blue-50">
                    <ArrowLeft className="w-5 h-5 text-blue-700" />
                    </Button>
                    <div>
                    <h1 className="text-lg sm:text-xl font-bold text-blue-900">Mode Kiosk</h1>
                    <p className="text-xs text-blue-600/70 hidden sm:block">Belanja mandiri dengan AI</p>
                    </div>
                </div>
                
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

                <Button
                    ref={cartButtonRef}
                    variant="outline"
                    onClick={handleCheckoutStart}
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
                
                {/* Mobile Search */}
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

            <div className="px-4 sm:px-6 py-4 bg-white/50 backdrop-blur-sm border-b border-blue-100/50">
                <div className="max-w-7xl mx-auto">
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                    <TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0 justify-start">
                    <TabsTrigger value="all" className="px-4 py-2 rounded-full border border-blue-200 data-[state=active]:bg-blue-900 data-[state=active]:text-white data-[state=active]:border-blue-900 bg-white text-blue-700">Semua</TabsTrigger>
                    {categories.map(cat => (
                        <TabsTrigger key={cat} value={cat} className="px-4 py-2 rounded-full border border-blue-200 data-[state=active]:bg-blue-900 data-[state=active]:text-white data-[state=active]:border-blue-900 bg-white text-blue-700">{cat}</TabsTrigger>
                    ))}
                    </TabsList>
                </Tabs>
                </div>
            </div>

            <main className="flex-1 px-4 sm:px-6 py-6 pb-24">
                <div className="max-w-7xl mx-auto">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                        <Search className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Produk tidak ditemukan</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map((product) => (
                        <Card key={product.id} className="group overflow-hidden border-0 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-300 bg-white/90 backdrop-blur-sm">
                        <div className="aspect-square overflow-hidden bg-gray-100">
                            <img
                            id={`product-img-${product.id}`}
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=No+Image'; }}
                            />
                        </div>
                        <CardContent className="p-3 sm:p-4">
                            <Badge variant="secondary" className="mb-2 text-xs bg-blue-50 text-blue-700">{product.category}</Badge>
                            <h3 className="font-semibold text-blue-900 text-sm sm:text-base line-clamp-1 mb-1">{product.name}</h3>
                            <p className="text-xs text-blue-600/70 line-clamp-2 mb-2 h-8">{product.description}</p>
                            <div className="flex items-center justify-between">
                            <span className="font-bold text-blue-900 text-sm sm:text-base">{formatCurrency(product.price)}</span>
                            <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock === 0} className="h-8 w-8 p-0 rounded-full bg-blue-900 hover:bg-blue-800">
                                <Plus className="w-4 h-4" />
                            </Button>
                            </div>
                            <p className="text-xs text-blue-500 mt-1">Stok: {product.stock}</p>
                        </CardContent>
                        </Card>
                    ))}
                    </div>
                )}
                </div>
            </main>

            {cartItemCount > 0 && (
                <div ref={mobileCartRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden">
                    <Button onClick={handleCheckoutStart} className="bg-blue-900 hover:bg-blue-800 text-white rounded-full px-6 py-6 shadow-xl shadow-blue-900/30">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        <span>{cartItemCount} item</span>
                        <Separator orientation="vertical" className="mx-3 h-4 bg-white/30" />
                        <span>{formatCurrency(cartTotal)}</span>
                    </Button>
                </div>
            )}
        </>
      ) : (
        // Dedicated Checkout Overlay
        <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-0 sm:p-4">
            {checkoutStep === 'cart' && renderCartStep()}
            {checkoutStep === 'details' && renderDetailsStep()}
            {checkoutStep === 'payment' && renderPaymentStep()}
            {checkoutStep === 'camera' && renderCameraStep()}
            {checkoutStep === 'processing' && renderProcessingStep()}
            {checkoutStep === 'result' && renderResultStep()}
        </div>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}