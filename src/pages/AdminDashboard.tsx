import { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Receipt, 
  Wallet, 
  ShieldAlert,
  LogOut, 
  Plus, 
  DollarSign,
  ShoppingBag,
  AlertCircle,
  QrCode,
  Upload,
  Check,
  XCircle,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  productService, 
  transactionService, 
  withdrawalService, 
  userService, 
  qrisService, 
  failedValidationService,
  generateId, 
  formatCurrency, 
  formatDate 
} from '@/services/db';
import { toast } from 'sonner';
import type { User, Product, Transaction, Withdrawal, FailedValidation } from '@/types';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sellers, setSellers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [failedValidations, setFailedValidations] = useState<FailedValidation[]>([]);
  const [qrisConfig, setQrisConfig] = useState<{ image_url: string; merchant_name: string } | null>(null);
  const [revenue, setRevenue] = useState(0);
  
  // Dialog states
  const [isSellerDialogOpen, setIsSellerDialogOpen] = useState(false);
  const [isQRISDialogOpen, setIsQRISDialogOpen] = useState(false);
  const [isWithdrawalDetailOpen, setIsWithdrawalDetailOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [transferProofUrl, setTransferProofUrl] = useState('');
  
  const qrisFileInputRef = useRef<HTMLInputElement>(null);

  // Forms
  const [sellerForm, setSellerForm] = useState({
    full_name: '',
    email: '',
    nik: '',
    department: '',
    phone: '',
  });
  const [qrisForm, setQrisForm] = useState({
    image_url: '',
    merchant_name: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [
      fetchedSellers, 
      fetchedProducts, 
      fetchedTransactions, 
      fetchedWithdrawals, 
      fetchedFailed, 
      fetchedQris,
      fetchedRevenue
    ] = await Promise.all([
      userService.getSellers(),
      productService.getAll(),
      transactionService.getAll(),
      withdrawalService.getAll(),
      failedValidationService.getAll(),
      qrisService.get(),
      transactionService.getTotalRevenue()
    ]);
    
    setSellers(fetchedSellers);
    setProducts(fetchedProducts);
    setTransactions(fetchedTransactions);
    setWithdrawals(fetchedWithdrawals);
    setFailedValidations(fetchedFailed);
    setQrisConfig(fetchedQris);
    setRevenue(fetchedRevenue);
  };

  const stats = {
    totalRevenue: revenue,
    totalTransactions: transactions.filter(t => t.status === 'verified').length,
    totalSellers: sellers.length,
    totalProducts: products.length,
    pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
    failedValidations: failedValidations.length,
  };

  const handleAddSeller = async () => {
    if (!sellerForm.full_name || !sellerForm.email || !sellerForm.nik) {
      toast.error('Nama, email, dan NIK wajib diisi');
      return;
    }

    const newSeller: User = {
      id: generateId('seller-'),
      email: sellerForm.email,
      full_name: sellerForm.full_name,
      nik: sellerForm.nik,
      department: sellerForm.department,
      phone: sellerForm.phone,
      role: 'seller',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await userService.create(newSeller);
    toast.success('Seller berhasil ditambahkan');
    setIsSellerDialogOpen(false);
    setSellerForm({ full_name: '', email: '', nik: '', department: '', phone: '' });
    loadData();
  };

  const handleQRISImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const result = event.target?.result as string;
        setQrisForm(prev => ({ ...prev, image_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateQRIS = async () => {
    if (!qrisForm.image_url || !qrisForm.merchant_name) {
      toast.error('Gambar dan nama merchant wajib diisi');
      return;
    }

    await qrisService.update({
      image_url: qrisForm.image_url,
      merchant_name: qrisForm.merchant_name,
      updated_by: user.id,
    });
    toast.success('QRIS berhasil diupdate');
    setIsQRISDialogOpen(false);
    loadData();
  };

  const handleProcessWithdrawal = async (withdrawalId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      if (!transferProofUrl) {
        toast.error('URL bukti transfer wajib diisi');
        return;
      }

      await withdrawalService.update(withdrawalId, {
        status: 'completed',
        transfer_proof_url: transferProofUrl,
        processed_at: new Date().toISOString(),
      });
      toast.success('Penarikan berhasil diproses');
    } else {
      await withdrawalService.update(withdrawalId, {
        status: 'rejected',
        processed_at: new Date().toISOString(),
      });
      toast.success('Penarikan ditolak');
    }

    setIsWithdrawalDetailOpen(false);
    setSelectedWithdrawal(null);
    setTransferProofUrl('');
    loadData();
  };

  const openWithdrawalDetail = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setIsWithdrawalDetailOpen(true);
  };

  const openQRISDialog = () => {
    if (qrisConfig) {
      setQrisForm({
        image_url: qrisConfig.image_url,
        merchant_name: qrisConfig.merchant_name,
      });
    }
    setIsQRISDialogOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900/95 backdrop-blur-xl sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-white">SPS Corner</h1>
              <p className="text-xs text-slate-400">Admin Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'sellers', label: 'Kelola Seller', icon: Users },
            { id: 'products', label: 'Semua Produk', icon: Package },
            { id: 'transactions', label: 'Transaksi', icon: Receipt },
            { id: 'withdrawals', label: 'Penarikan', icon: Wallet },
            { id: 'failed', label: 'Validasi Gagal', icon: ShieldAlert },
            { id: 'settings', label: 'Pengaturan', icon: QrCode },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden w-full px-4 py-4 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">SPS Corner</h1>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="text-red-400">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        <ScrollArea className="w-full whitespace-nowrap mt-4">
          <div className="flex gap-2 pb-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'sellers', label: 'Seller', icon: Users },
              { id: 'products', label: 'Produk', icon: Package },
              { id: 'transactions', label: 'Transaksi', icon: Receipt },
              { id: 'withdrawals', label: 'Penarikan', icon: Wallet },
              { id: 'failed', label: 'Gagal', icon: ShieldAlert },
              { id: 'settings', label: 'QRIS', icon: QrCode },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  activeTab === item.id
                    ? 'bg-yellow-400 text-slate-900'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Dashboard Admin</h2>
                <p className="text-slate-600">Ringkasan sistem Kantin Digital</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-slate-500">Total Pendapatan</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-slate-500">Transaksi</p>
                    <p className="text-lg font-bold text-slate-900">{stats.totalTransactions}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-xs text-slate-500">Seller</p>
                    <p className="text-lg font-bold text-slate-900">{stats.totalSellers}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center mb-3">
                      <Package className="w-5 h-5 text-yellow-600" />
                    </div>
                    <p className="text-xs text-slate-500">Produk</p>
                    <p className="text-lg font-bold text-slate-900">{stats.totalProducts}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
                      <Wallet className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-xs text-slate-500">Pending WD</p>
                    <p className="text-lg font-bold text-slate-900">{stats.pendingWithdrawals}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mb-3">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-xs text-slate-500">Validasi Gagal</p>
                    <p className="text-lg font-bold text-slate-900">{stats.failedValidations}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Transaksi Terbaru</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.slice(0, 5).length === 0 ? (
                      <p className="text-center text-slate-500 py-8">Belum ada transaksi</p>
                    ) : (
                      <div className="space-y-3">
                        {transactions.slice(0, 5).map((trx) => (
                          <div key={trx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div>
                              <p className="font-medium text-slate-900">{trx.customer_name}</p>
                              <p className="text-xs text-slate-500">{formatDate(trx.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{formatCurrency(trx.total_amount)}</p>
                              <Badge variant={trx.status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                                {trx.status === 'verified' ? 'Terverifikasi' : trx.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Penarikan Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
                      <p className="text-center text-slate-500 py-8">Tidak ada penarikan pending</p>
                    ) : (
                      <div className="space-y-3">
                        {withdrawals.filter(w => w.status === 'pending').slice(0, 5).map((wdr) => (
                          <div key={wdr.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div>
                              <p className="font-medium text-slate-900">{wdr.seller_name}</p>
                              <p className="text-xs text-slate-500">{formatCurrency(wdr.amount)}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => openWithdrawalDetail(wdr)}
                              className="bg-yellow-400 hover:bg-yellow-500 text-slate-900"
                            >
                              Proses
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Sellers Tab */}
          {activeTab === 'sellers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Kelola Seller</h2>
                  <p className="text-slate-600">Tambah dan kelola akun penjual</p>
                </div>
                <Button onClick={() => setIsSellerDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Seller
                </Button>
              </div>

              <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {sellers.map((seller) => (
                      <div key={seller.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-900">{seller.full_name}</p>
                          <p className="text-sm text-slate-500">{seller.email}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{seller.department}</Badge>
                            <Badge variant="outline" className="text-xs">NIK: {seller.nik}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">{seller.phone}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Semua Produk</h2>
                <p className="text-slate-600">Kelola semua produk dari seluruh seller</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=No+Image';
                        }}
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{product.name}</h3>
                          <p className="text-xs text-slate-500">{product.seller_name}</p>
                        </div>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(product.price)}</p>
                      <p className="text-sm text-slate-500">Stok: {product.stock}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Semua Transaksi</h2>
                <p className="text-slate-600">Monitor seluruh transaksi sistem</p>
              </div>

              <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {transactions.map((trx) => (
                      <div key={trx.id} className="p-4 hover:bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-900">{trx.customer_name}</p>
                            <p className="text-xs text-slate-500">{formatDate(trx.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{formatCurrency(trx.total_amount)}</p>
                            <Badge 
                              variant={trx.status === 'verified' ? 'default' : 'secondary'}
                              className={trx.status === 'verified' ? 'bg-green-500' : ''}
                            >
                              {trx.status === 'verified' ? 'Terverifikasi' : trx.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {trx.items.map((item, idx) => (
                            <span key={idx} className="text-xs bg-slate-100 px-2 py-1 rounded">
                              {item.quantity}x {item.product_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Penarikan Seller</h2>
                <p className="text-slate-600">Kelola pengajuan penarikan dari seller</p>
              </div>

              <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {withdrawals.map((wdr) => (
                      <div key={wdr.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-900">{wdr.seller_name}</p>
                          <p className="text-sm text-slate-500">
                            {wdr.bank_name} - {wdr.account_number}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Fee: {formatCurrency(wdr.fee_amount)} | Diterima: {formatCurrency(wdr.net_amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{formatCurrency(wdr.amount)}</p>
                          <Badge 
                            variant={wdr.status === 'completed' ? 'default' : wdr.status === 'pending' ? 'secondary' : 'destructive'}
                          >
                            {wdr.status === 'pending' ? 'Menunggu' : wdr.status === 'completed' ? 'Selesai' : 'Ditolak'}
                          </Badge>
                          {wdr.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => openWithdrawalDetail(wdr)}
                              className="ml-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900"
                            >
                              Proses
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Failed Validations Tab */}
          {activeTab === 'failed' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Validasi Gagal</h2>
                <p className="text-slate-600">Log percobaan validasi yang gagal</p>
              </div>

              <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {failedValidations.length === 0 ? (
                      <p className="text-center text-slate-500 py-12">Tidak ada data validasi gagal</p>
                    ) : (
                      failedValidations.map((fail) => (
                        <div key={fail.id} className="p-4 hover:bg-slate-50">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium text-slate-900">{fail.customer_name}</p>
                              <p className="text-xs text-slate-500">{formatDate(fail.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{formatCurrency(fail.attempted_amount)}</p>
                            </div>
                          </div>
                          <Alert variant="destructive" className="bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700">
                              {fail.failure_reason}
                            </AlertDescription>
                          </Alert>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Pengaturan QRIS</h2>
                <p className="text-slate-600">Update gambar QRIS untuk pembayaran</p>
              </div>

              <Card className="border-0 shadow-lg shadow-slate-900/5 bg-white">
                <CardContent className="p-6">
                  {qrisConfig && (
                    <div className="mb-6">
                      <p className="text-sm text-slate-500 mb-2">QRIS Saat Ini</p>
                      <img
                        src={qrisConfig.image_url}
                        alt="Current QRIS"
                        className="max-w-xs rounded-xl border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=QRIS';
                        }}
                      />
                      <p className="text-sm text-slate-600 mt-2">Merchant: {qrisConfig.merchant_name}</p>
                    </div>
                  )}
                  <Button onClick={openQRISDialog} className="bg-slate-900 hover:bg-slate-800">
                    <Upload className="w-4 h-4 mr-2" />
                    Update QRIS
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Add Seller Dialog */}
      <Dialog open={isSellerDialogOpen} onOpenChange={setIsSellerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Tambah Seller Baru</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-900">Nama Lengkap</Label>
              <Input
                value={sellerForm.full_name}
                onChange={(e) => setSellerForm({ ...sellerForm, full_name: e.target.value })}
                placeholder="Nama lengkap seller"
                className="border-slate-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-900">Email</Label>
              <Input
                type="email"
                value={sellerForm.email}
                onChange={(e) => setSellerForm({ ...sellerForm, email: e.target.value })}
                placeholder="email@seller.com"
                className="border-slate-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-900">NIK</Label>
              <Input
                value={sellerForm.nik}
                onChange={(e) => setSellerForm({ ...sellerForm, nik: e.target.value })}
                placeholder="Nomor Induk Karyawan"
                className="border-slate-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-900">Departemen</Label>
              <Input
                value={sellerForm.department}
                onChange={(e) => setSellerForm({ ...sellerForm, department: e.target.value })}
                placeholder="Departemen"
                className="border-slate-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-900">No. WhatsApp</Label>
              <Input
                value={sellerForm.phone}
                onChange={(e) => setSellerForm({ ...sellerForm, phone: e.target.value })}
                placeholder="08123456789"
                className="border-slate-200"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsSellerDialogOpen(false)}
              className="flex-1 border-slate-200"
            >
              Batal
            </Button>
            <Button
              onClick={handleAddSeller}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              Tambah Seller
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QRIS Dialog */}
      <Dialog open={isQRISDialogOpen} onOpenChange={setIsQRISDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Update QRIS</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-900">Gambar QRIS</Label>
              <div 
                onClick={() => qrisFileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors"
              >
                {qrisForm.image_url ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden group">
                    <img 
                      src={qrisForm.image_url} 
                      alt="Preview" 
                      className="object-contain w-full h-full" 
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center text-white">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="text-sm font-medium">Ganti Gambar</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-medium">Upload Gambar QRIS</p>
                    <p className="text-xs text-slate-400 mt-1">Klik untuk memilih file</p>
                  </div>
                )}
                <input
                  ref={qrisFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQRISImageSelect}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-900">Nama Merchant</Label>
              <Input
                value={qrisForm.merchant_name}
                onChange={(e) => setQrisForm({ ...qrisForm, merchant_name: e.target.value })}
                placeholder="Nama merchant di QRIS"
                className="border-slate-200"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsQRISDialogOpen(false)}
              className="flex-1 border-slate-200"
            >
              Batal
            </Button>
            <Button
              onClick={handleUpdateQRIS}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              Simpan QRIS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Detail Dialog */}
      <Dialog open={isWithdrawalDetailOpen} onOpenChange={setIsWithdrawalDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Proses Penarikan</DialogTitle>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-sm text-slate-500">Seller</p>
                <p className="font-medium text-slate-900">{selectedWithdrawal.seller_name}</p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-sm text-slate-500">Jumlah Penarikan</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(selectedWithdrawal.amount)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Biaya (8%): {formatCurrency(selectedWithdrawal.fee_amount)} | 
                  Diterima: {formatCurrency(selectedWithdrawal.net_amount)}
                </p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-sm text-slate-500">Rekening Tujuan</p>
                <p className="font-medium text-slate-900">{selectedWithdrawal.bank_name}</p>
                <p className="text-slate-700">{selectedWithdrawal.account_number}</p>
                <p className="text-slate-600">a.n. {selectedWithdrawal.account_name}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-900">URL Bukti Transfer</Label>
                <Input
                  value={transferProofUrl}
                  onChange={(e) => setTransferProofUrl(e.target.value)}
                  placeholder="https://example.com/bukti-transfer.jpg"
                  className="border-slate-200"
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={() => selectedWithdrawal && handleProcessWithdrawal(selectedWithdrawal.id, 'reject')}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Tolak
            </Button>
            <Button
              onClick={() => selectedWithdrawal && handleProcessWithdrawal(selectedWithdrawal.id, 'approve')}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Setujui & Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}