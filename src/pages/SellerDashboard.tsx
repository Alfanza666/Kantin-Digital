import { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Receipt, 
  Wallet, 
  LogOut, 
  Plus, 
  Edit2, 
  Trash2,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productService, transactionService, withdrawalService, categoryService, authService, generateId, formatCurrency, formatDate } from '@/services/db';
import { toast } from 'sonner';
import type { User, Product, Transaction, Withdrawal } from '@/types';

interface SellerDashboardProps {
  user: User;
  onLogout: () => void;
}

const CONSIGNMENT_FEE = 0.08; // 8%

export default function SellerDashboard({ user, onLogout }: SellerDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image_url: '',
  });
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    const [
      fetchedProducts, 
      fetchedTransactions, 
      fetchedWithdrawals, 
      fetchedCategories
    ] = await Promise.all([
      productService.getBySeller(user.id),
      transactionService.getBySeller(user.id),
      withdrawalService.getBySeller(user.id),
      categoryService.getAll()
    ]);
    
    setProducts(fetchedProducts);
    setTransactions(fetchedTransactions);
    setWithdrawals(fetchedWithdrawals);
    setCategories(fetchedCategories.map(c => c.name));
  };

  // Calculate total sales (verified transactions)
  const totalSales = transactions
    .filter(t => t.status === 'verified')
    .reduce((sum, t) => sum + t.total_amount, 0);
  
  // Calculate total withdrawn (completed withdrawals - net amount after fee)
  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + w.amount, 0);
  
  // Calculate pending withdrawals
  const pendingWithdrawals = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);
  
  // Available balance = total sales - total withdrawn - pending withdrawals
  const availableBalance = totalSales - totalWithdrawn - pendingWithdrawals;
  
  const stats = {
    totalRevenue: totalSales,
    totalTransactions: transactions.filter(t => t.status === 'verified').length,
    totalProducts: products.length,
    activeProducts: products.filter(p => p.is_active).length,
    pendingWithdrawals,
    totalWithdrawn,
    availableBalance,
  };

  const handleProductImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, JPEG)');
      return;
    }

    // Validate file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setProductForm(prev => ({ ...prev, image_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.stock) {
      toast.error('Semua field wajib diisi');
      return;
    }

    const productData: Product = {
      id: editingProduct?.id || generateId('prod-'),
      name: productForm.name,
      description: productForm.description,
      price: parseInt(productForm.price),
      stock: parseInt(productForm.stock),
      category: productForm.category || 'Lainnya',
      image_url: productForm.image_url || 'https://via.placeholder.com/400?text=No+Image',
      seller_id: user.id,
      seller_name: user.full_name,
      is_active: true,
      created_at: editingProduct?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingProduct) {
      await productService.update(editingProduct.id, productData);
      toast.success('Produk berhasil diupdate');
    } else {
      await productService.create(productData);
      toast.success('Produk berhasil ditambahkan');
    }

    setIsProductDialogOpen(false);
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: '', stock: '', category: '', image_url: '' });
    loadData();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      await productService.delete(productId);
      toast.success('Produk berhasil dihapus');
      loadData();
    }
  };

  const handleToggleProductStatus = async (product: Product) => {
    await productService.update(product.id, { is_active: !product.is_active });
    toast.success(`Produk ${product.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
    loadData();
  };

  const handleWithdrawalRequest = async () => {
    const amount = parseInt(withdrawalForm.amount);
    if (!amount || amount < 10000) {
      toast.error('Minimal penarikan Rp 10.000');
      return;
    }

    if (!withdrawalForm.bank_name || !withdrawalForm.account_number || !withdrawalForm.account_name) {
      toast.error('Semua data bank wajib diisi');
      return;
    }

    if (amount > stats.availableBalance) {
      toast.error('Saldo tidak mencukupi');
      return;
    }

    const fee = Math.round(amount * CONSIGNMENT_FEE);
    const netAmount = amount - fee;

    const withdrawal: Withdrawal = {
      id: generateId('wdr-'),
      seller_id: user.id,
      seller_name: user.full_name,
      amount,
      fee_amount: fee,
      net_amount: netAmount,
      status: 'pending',
      bank_name: withdrawalForm.bank_name,
      account_number: withdrawalForm.account_number,
      account_name: withdrawalForm.account_name,
      requested_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await withdrawalService.create(withdrawal);
    toast.success('Pengajuan penarikan berhasil dikirim');
    setIsWithdrawalDialogOpen(false);
    setWithdrawalForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
    loadData();
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Semua field wajib diisi');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Password baru dan konfirmasi tidak cocok');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    // Verify current password
    const isValid = await authService.verifyPassword(user.id, passwordForm.currentPassword);
    if (!isValid) {
      toast.error('Password saat ini salah');
      return;
    }

    // Update password
    await authService.updatePassword(user.id, passwordForm.newPassword);
    toast.success('Password berhasil diubah');
    setIsPasswordDialogOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    loadData();
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      image_url: product.image_url,
    });
    setIsProductDialogOpen(true);
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: '', stock: '', category: '', image_url: '' });
    setIsProductDialogOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/90 backdrop-blur-xl border-r border-blue-100/50 sticky top-0 h-screen">
        <div className="p-6 border-b border-blue-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
              <span className="text-yellow-300 font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="font-bold text-blue-900">SPS Corner</h1>
              <p className="text-xs text-blue-600/70">Seller Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'products', label: 'Produk', icon: Package },
            { id: 'transactions', label: 'Transaksi', icon: Receipt },
            { id: 'withdrawals', label: 'Penarikan', icon: Wallet },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/20'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-100/50">
          <div className="px-4 py-3 mb-4 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-600">Saldo Tersedia</p>
            <p className="text-lg font-bold text-blue-900">{formatCurrency(stats.availableBalance)}</p>
          </div>
          <button
            onClick={() => setIsPasswordDialogOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-700 hover:bg-blue-50 transition-colors mb-2"
          >
            <Lock className="w-5 h-5" />
            <span className="font-medium">Ganti Password</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden w-full px-4 py-4 bg-white/90 backdrop-blur-xl border-b border-blue-100/50 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
              <span className="text-yellow-300 font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="font-bold text-blue-900 text-sm">SPS Corner</h1>
              <p className="text-xs text-blue-600/70">{user.full_name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="text-red-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'products', label: 'Produk', icon: Package },
            { id: 'transactions', label: 'Transaksi', icon: Receipt },
            { id: 'withdrawals', label: 'Penarikan', icon: Wallet },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeTab === item.id
                  ? 'bg-blue-900 text-white'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-blue-900">Dashboard</h2>
                  <p className="text-blue-600/70">Ringkasan performa toko Anda</p>
                </div>
                <Button
                  onClick={() => setIsWithdrawalDialogOpen(true)}
                  disabled={availableBalance < 10000}
                  className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Ajukan Penarikan
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                    <p className="text-sm text-blue-600/70">Total Pendapatan</p>
                    <p className="text-xl lg:text-2xl font-bold text-blue-900">{formatCurrency(stats.totalRevenue)}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-sm text-blue-600/70">Total Transaksi</p>
                    <p className="text-xl lg:text-2xl font-bold text-blue-900">{stats.totalTransactions}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-yellow-600" />
                      </div>
                    </div>
                    <p className="text-sm text-blue-600/70">Produk Aktif</p>
                    <p className="text-xl lg:text-2xl font-bold text-blue-900">{stats.activeProducts}</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-sm text-blue-600/70">Total Produk</p>
                    <p className="text-xl lg:text-2xl font-bold text-blue-900">{stats.totalProducts}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                <CardHeader>
                  <CardTitle className="text-blue-900">Transaksi Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.slice(0, 5).length === 0 ? (
                    <p className="text-center text-blue-600/70 py-8">Belum ada transaksi</p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((trx) => (
                        <div key={trx.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl">
                          <div>
                            <p className="font-medium text-blue-900">{trx.customer_name}</p>
                            <p className="text-xs text-blue-600/70">{formatDate(trx.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-900">{formatCurrency(trx.total_amount)}</p>
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
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-blue-900">Kelola Produk</h2>
                  <p className="text-blue-600/70">Tambah, edit, atau hapus produk Anda</p>
                </div>
                <Button onClick={openAddProduct} className="bg-blue-900 hover:bg-blue-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Produk
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
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
                          <h3 className="font-semibold text-blue-900">{product.name}</h3>
                          <p className="text-sm text-blue-600/70">{product.category}</p>
                        </div>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold text-blue-900 mb-2">{formatCurrency(product.price)}</p>
                      <p className="text-sm text-blue-600/70 mb-4">Stok: {product.stock}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditProduct(product)}
                          className="flex-1 border-blue-200"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleProductStatus(product)}
                          className="flex-1 border-blue-200"
                        >
                          {product.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
                <h2 className="text-2xl font-bold text-blue-900">Riwayat Transaksi</h2>
                <p className="text-blue-600/70">Semua transaksi produk Anda</p>
              </div>

              <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <p className="text-center text-blue-600/70 py-12">Belum ada transaksi</p>
                  ) : (
                    <div className="divide-y divide-blue-100">
                      {transactions.map((trx) => (
                        <div key={trx.id} className="p-4 flex items-center justify-between hover:bg-blue-50/50">
                          <div>
                            <p className="font-medium text-blue-900">{trx.customer_name}</p>
                            <p className="text-xs text-blue-600/70">{formatDate(trx.created_at)}</p>
                            <div className="flex gap-2 mt-1">
                              {trx.items.map((item, idx) => (
                                <span key={idx} className="text-xs text-blue-500">
                                  {item.quantity}x {item.product_name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-900">{formatCurrency(trx.total_amount)}</p>
                            <Badge 
                              variant={trx.status === 'verified' ? 'default' : 'secondary'}
                              className={trx.status === 'verified' ? 'bg-green-500' : ''}
                            >
                              {trx.status === 'verified' ? 'Terverifikasi' : trx.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-blue-900">Penarikan Saldo</h2>
                  <p className="text-blue-600/70">Kelola pengajuan penarikan Anda</p>
                </div>
                <Button
                  onClick={() => setIsWithdrawalDialogOpen(true)}
                  disabled={availableBalance < 10000}
                  className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Ajukan Penarikan
                </Button>
              </div>

              {/* Balance Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-600/70">Total Pendapatan</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(stats.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-600/70">Pending</p>
                    <p className="text-xl font-bold text-yellow-600">{formatCurrency(stats.pendingWithdrawals)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-600/70">Tersedia</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(availableBalance)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Withdrawal History */}
              <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white/90">
                <CardHeader>
                  <CardTitle className="text-blue-900">Riwayat Penarikan</CardTitle>
                </CardHeader>
                <CardContent>
                  {withdrawals.length === 0 ? (
                    <p className="text-center text-blue-600/70 py-8">Belum ada pengajuan penarikan</p>
                  ) : (
                    <div className="space-y-3">
                      {withdrawals.map((wdr) => (
                        <div key={wdr.id} className="p-4 bg-blue-50/50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-blue-900">{formatCurrency(wdr.amount)}</p>
                            <Badge 
                              variant={wdr.status === 'completed' ? 'default' : wdr.status === 'pending' ? 'secondary' : 'destructive'}
                            >
                              {wdr.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                              {wdr.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {wdr.status === 'pending' ? 'Menunggu' : wdr.status === 'completed' ? 'Selesai' : 'Ditolak'}
                            </Badge>
                          </div>
                          <p className="text-sm text-blue-600/70">
                            {wdr.bank_name} - {wdr.account_number}
                          </p>
                          <p className="text-xs text-blue-500 mt-1">
                            Fee (8%): {formatCurrency(wdr.fee_amount)} | Diterima: {formatCurrency(wdr.net_amount)}
                          </p>
                          <p className="text-xs text-blue-400 mt-1">{formatDate(wdr.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-900">
              {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-blue-900">Nama Produk</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Masukkan nama produk"
                className="border-blue-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900">Deskripsi</Label>
              <Input
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Deskripsi produk"
                className="border-blue-200"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-900">Harga (Rp)</Label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="0"
                  className="border-blue-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-blue-900">Stok</Label>
                <Input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  placeholder="0"
                  className="border-blue-200"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900">Kategori</Label>
              <Select
                value={productForm.category}
                onValueChange={(value) => setProductForm({ ...productForm, category: value })}
              >
                <SelectTrigger className="border-blue-200">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900">Gambar Produk</Label>
              <div 
                onClick={() => productFileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-blue-200 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-blue-50 transition-colors"
              >
                {productForm.image_url && productForm.image_url !== 'https://via.placeholder.com/400?text=No+Image' ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                    <img 
                      src={productForm.image_url} 
                      alt="Preview" 
                      className="object-cover w-full h-full" 
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
                    <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-blue-600 font-medium">Upload Gambar Produk</p>
                    <p className="text-xs text-blue-400 mt-1">Klik untuk memilih file dari perangkat Anda</p>
                  </div>
                )}
                <input
                  ref={productFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProductImageSelect}
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsProductDialogOpen(false)}
              className="flex-1 border-blue-200"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveProduct}
              className="flex-1 bg-blue-900 hover:bg-blue-800"
            >
              {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-900">Ajukan Penarikan</DialogTitle>
            <DialogDescription className="text-blue-600/70">
              Biaya konsinyasi 8% akan dipotong dari jumlah penarikan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Saldo tersedia: {formatCurrency(availableBalance)}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label className="text-blue-900">Jumlah Penarikan (Rp)</Label>
              <Input
                type="number"
                value={withdrawalForm.amount}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                placeholder="Minimal Rp 10.000"
                className="border-blue-200"
              />
              {withdrawalForm.amount && (
                <p className="text-xs text-blue-600">
                  Biaya (8%): {formatCurrency(parseInt(withdrawalForm.amount) * CONSIGNMENT_FEE)} | 
                  Diterima: {formatCurrency(parseInt(withdrawalForm.amount) * (1 - CONSIGNMENT_FEE))}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900">Nama Bank</Label>
              <Input
                value={withdrawalForm.bank_name}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, bank_name: e.target.value })}
                placeholder="Contoh: BCA, Mandiri, BNI"
                className="border-blue-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900">Nomor Rekening</Label>
              <Input
                value={withdrawalForm.account_number}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, account_number: e.target.value })}
                placeholder="Nomor rekening"
                className="border-blue-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900">Nama Pemilik Rekening</Label>
              <Input
                value={withdrawalForm.account_name}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, account_name: e.target.value })}
                placeholder="Nama sesuai rekening"
                className="border-blue-200"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsWithdrawalDialogOpen(false)}
              className="flex-1 border-blue-200"
            >
              Batal
            </Button>
            <Button
              onClick={handleWithdrawalRequest}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold"
            >
              Ajukan Penarikan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-900">Ganti Password</DialogTitle>
            <DialogDescription className="text-blue-600/70">
              Masukkan password saat ini dan password baru Anda
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-blue-900">Password Saat Ini</Label>
              <div className="relative">
                <Input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Masukkan password saat ini"
                  className="border-blue-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900">Password Baru</Label>
              <div className="relative">
                <Input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="border-blue-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-900">Konfirmasi Password Baru</Label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Ulangi password baru"
                  className="border-blue-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
              className="flex-1 border-blue-200"
            >
              Batal
            </Button>
            <Button
              onClick={handleChangePassword}
              className="flex-1 bg-blue-900 hover:bg-blue-800"
            >
              Simpan Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}