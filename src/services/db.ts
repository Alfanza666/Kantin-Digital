// Database Service - Simulating Supabase with localStorage
// This can be easily replaced with real Supabase client

import type { User, Product, Transaction, Withdrawal, QRISConfig, FailedValidation, Category } from '@/types';

// Initial data from the Excel file
const INITIAL_SELLERS: User[] = [
  {
    id: 'seller-1',
    email: 'akhmad.fiqri@spcorner.com',
    full_name: 'Akhmad Fiqri Ramdani',
    nik: '14220148',
    department: 'Sales GT',
    phone: '85540101926',
    role: 'seller',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seller-2',
    email: 'nurul.hasanah@spcorner.com',
    full_name: 'Nurul Hasanah',
    nik: '14220207',
    department: 'Marketing',
    phone: '85651492899',
    role: 'seller',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seller-3',
    email: 'muhammad.fauzan@spcorner.com',
    full_name: 'Muhammad Fauzan',
    nik: '14230141',
    department: 'SCM',
    phone: '85753539869',
    role: 'seller',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seller-4',
    email: 'dadang.hardito@spcorner.com',
    full_name: 'Dadang Hardito',
    nik: '14210103',
    department: 'Produksi',
    phone: '87754496370',
    role: 'seller',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seller-5',
    email: 'hidayatullah@spcorner.com',
    full_name: 'Hidayatullah',
    nik: '14210119',
    department: 'Make up',
    phone: '85920140184',
    role: 'seller',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Buras',
    description: 'Makanan yang dicampur dengan bumbu kacang, rasanya nikmat',
    price: 5000,
    stock: 50,
    category: 'Makanan',
    image_url: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400&h=400&fit=crop',
    seller_id: 'seller-1',
    seller_name: 'Akhmad Fiqri Ramdani',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Risol Matcha',
    description: 'Risol dengan isian matcha yang lezat',
    price: 3000,
    stock: 30,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    seller_id: 'seller-2',
    seller_name: 'Nurul Hasanah',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Risol Cokelat',
    description: 'Risol dengan isian cokelat yang manis',
    price: 3000,
    stock: 30,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476d?w=400&h=400&fit=crop',
    seller_id: 'seller-2',
    seller_name: 'Nurul Hasanah',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    name: 'Keripik Pisang',
    description: 'Keripik pisang renyah dan gurih',
    price: 8000,
    stock: 40,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&h=400&fit=crop',
    seller_id: 'seller-2',
    seller_name: 'Nurul Hasanah',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-5',
    name: 'Basreng',
    description: 'Basreng pedas gurih',
    price: 7000,
    stock: 35,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=400&fit=crop',
    seller_id: 'seller-3',
    seller_name: 'Muhammad Fauzan',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-6',
    name: 'Kerupuk Aneka 3K',
    description: 'Aneka macam kerupuk harga 3000',
    price: 3000,
    stock: 60,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
    seller_id: 'seller-3',
    seller_name: 'Muhammad Fauzan',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-7',
    name: 'Kerupuk Aneka 5K',
    description: 'Aneka macam kerupuk harga 5000',
    price: 5000,
    stock: 50,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
    seller_id: 'seller-3',
    seller_name: 'Muhammad Fauzan',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-8',
    name: 'Krupuk Acan Bantat BBQ',
    description: 'Krupuk acan bantat rasa BBQ',
    price: 5000,
    stock: 45,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
    seller_id: 'seller-4',
    seller_name: 'Dadang Hardito',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-9',
    name: 'Krupuk Acan Bantat Balado',
    description: 'Krupuk acan bantat rasa balado',
    price: 5000,
    stock: 45,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
    seller_id: 'seller-4',
    seller_name: 'Dadang Hardito',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-10',
    name: 'Krupuk Acan Bantat Original',
    description: 'Krupuk acan bantat rasa original',
    price: 5000,
    stock: 45,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
    seller_id: 'seller-4',
    seller_name: 'Dadang Hardito',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-11',
    name: 'Risol Mayo',
    description: 'Risol dengan isian mayonnaise',
    price: 2500,
    stock: 40,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    seller_id: 'seller-5',
    seller_name: 'Hidayatullah',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-12',
    name: 'Risol Ayam',
    description: 'Risol dengan isian ayam',
    price: 2500,
    stock: 40,
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
    seller_id: 'seller-5',
    seller_name: 'Hidayatullah',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Makanan', icon: 'UtensilsCrossed', created_at: new Date().toISOString() },
  { id: 'cat-2', name: 'Snack', icon: 'Cookie', created_at: new Date().toISOString() },
  { id: 'cat-3', name: 'Minuman', icon: 'Coffee', created_at: new Date().toISOString() },
];

const INITIAL_ADMIN: User = {
  id: 'admin-1',
  email: 'admin@spcorner.com',
  full_name: 'Administrator SPS',
  nik: 'alfanza26',
  department: 'Administration',
  phone: '00000000000',
  role: 'admin',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const INITIAL_QRIS: QRISConfig = {
  id: 'qris-1',
  image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/QRIS_logo.svg/1200px-QRIS_logo.svg.png',
  merchant_name: 'SPS Corner',
  is_active: true,
  updated_at: new Date().toISOString(),
  updated_by: 'admin-1',
};

// Database keys
const DB_KEYS = {
  users: 'sps_users',
  products: 'sps_products',
  transactions: 'sps_transactions',
  withdrawals: 'sps_withdrawals',
  qris: 'sps_qris',
  failedValidations: 'sps_failed_validations',
  categories: 'sps_categories',
  currentUser: 'sps_current_user',
};

// Initialize database with default data
export function initializeDatabase() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(DB_KEYS.users)) {
    const users = [...INITIAL_SELLERS, INITIAL_ADMIN];
    localStorage.setItem(DB_KEYS.users, JSON.stringify(users));
    
    // Set default passwords
    // Admin password: B@ngkai666
    localStorage.setItem(`password_admin-1`, 'B@ngkai666');
    
    // Seller default passwords: 123456
    INITIAL_SELLERS.forEach(seller => {
      localStorage.setItem(`password_${seller.id}`, '123456');
    });
  }
  if (!localStorage.getItem(DB_KEYS.products)) {
    localStorage.setItem(DB_KEYS.products, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(DB_KEYS.transactions)) {
    localStorage.setItem(DB_KEYS.transactions, JSON.stringify([]));
  }
  if (!localStorage.getItem(DB_KEYS.withdrawals)) {
    localStorage.setItem(DB_KEYS.withdrawals, JSON.stringify([]));
  }
  if (!localStorage.getItem(DB_KEYS.qris)) {
    localStorage.setItem(DB_KEYS.qris, JSON.stringify(INITIAL_QRIS));
  }
  if (!localStorage.getItem(DB_KEYS.failedValidations)) {
    localStorage.setItem(DB_KEYS.failedValidations, JSON.stringify([]));
  }
  if (!localStorage.getItem(DB_KEYS.categories)) {
    localStorage.setItem(DB_KEYS.categories, JSON.stringify(INITIAL_CATEGORIES));
  }
}

// Generic CRUD operations
function getAll<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function getById<T extends { id: string }>(key: string, id: string): T | null {
  const items = getAll<T>(key);
  return items.find(item => item.id === id) || null;
}

function create<T extends { id: string }>(key: string, item: T): T {
  const items = getAll<T>(key);
  items.push(item);
  localStorage.setItem(key, JSON.stringify(items));
  return item;
}

function update<T extends { id: string }>(key: string, id: string, updates: Partial<T>): T | null {
  const items = getAll<T>(key);
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(items));
  return items[index];
}

function remove<T extends { id: string }>(key: string, id: string): boolean {
  const items = getAll<T>(key);
  const filtered = items.filter(item => item.id !== id);
  if (filtered.length === items.length) return false;
  localStorage.setItem(key, JSON.stringify(filtered));
  return true;
}

// User operations
export const userService = {
  getAll: () => getAll<User>(DB_KEYS.users),
  getById: (id: string) => getById<User>(DB_KEYS.users, id),
  getByEmail: (email: string) => {
    const users = getAll<User>(DB_KEYS.users);
    return users.find(u => u.email === email) || null;
  },
  getByNIK: (nik: string) => {
    const users = getAll<User>(DB_KEYS.users);
    return users.find(u => u.nik === nik) || null;
  },
  getSellers: () => {
    const users = getAll<User>(DB_KEYS.users);
    return users.filter(u => u.role === 'seller');
  },
  create: (user: User) => create(DB_KEYS.users, user),
  update: (id: string, updates: Partial<User>) => update<User>(DB_KEYS.users, id, updates),
  delete: (id: string) => remove<User>(DB_KEYS.users, id),
};

// Product operations
export const productService = {
  getAll: () => getAll<Product>(DB_KEYS.products),
  getById: (id: string) => getById<Product>(DB_KEYS.products, id),
  getBySeller: (sellerId: string) => {
    const products = getAll<Product>(DB_KEYS.products);
    return products.filter(p => p.seller_id === sellerId);
  },
  getByCategory: (category: string) => {
    const products = getAll<Product>(DB_KEYS.products);
    return products.filter(p => p.category === category && p.is_active);
  },
  getActive: () => {
    const products = getAll<Product>(DB_KEYS.products);
    return products.filter(p => p.is_active && p.stock > 0);
  },
  create: (product: Product) => create(DB_KEYS.products, product),
  update: (id: string, updates: Partial<Product>) => update<Product>(DB_KEYS.products, id, updates),
  delete: (id: string) => remove<Product>(DB_KEYS.products, id),
  reduceStock: (productId: string, quantity: number) => {
    const product = getById<Product>(DB_KEYS.products, productId);
    if (!product) return null;
    const newStock = Math.max(0, product.stock - quantity);
    return update<Product>(DB_KEYS.products, productId, { stock: newStock });
  },
};

// Transaction operations
export const transactionService = {
  getAll: () => getAll<Transaction>(DB_KEYS.transactions),
  getById: (id: string) => getById<Transaction>(DB_KEYS.transactions, id),
  getBySeller: (sellerId: string) => {
    const transactions = getAll<Transaction>(DB_KEYS.transactions);
    return transactions.filter(t => t.seller_id === sellerId);
  },
  getByStatus: (status: Transaction['status']) => {
    const transactions = getAll<Transaction>(DB_KEYS.transactions);
    return transactions.filter(t => t.status === status);
  },
  create: (transaction: Transaction) => create(DB_KEYS.transactions, transaction),
  update: (id: string, updates: Partial<Transaction>) => update<Transaction>(DB_KEYS.transactions, id, updates),
  getTodayTransactions: () => {
    const transactions = getAll<Transaction>(DB_KEYS.transactions);
    const today = new Date().toDateString();
    return transactions.filter(t => new Date(t.created_at).toDateString() === today);
  },
  getTotalRevenue: (sellerId?: string) => {
    const transactions = getAll<Transaction>(DB_KEYS.transactions);
    const filtered = sellerId 
      ? transactions.filter(t => t.seller_id === sellerId && t.status === 'verified')
      : transactions.filter(t => t.status === 'verified');
    return filtered.reduce((sum, t) => sum + t.total_amount, 0);
  },
};

// Withdrawal operations
export const withdrawalService = {
  getAll: () => getAll<Withdrawal>(DB_KEYS.withdrawals),
  getById: (id: string) => getById<Withdrawal>(DB_KEYS.withdrawals, id),
  getBySeller: (sellerId: string) => {
    const withdrawals = getAll<Withdrawal>(DB_KEYS.withdrawals);
    return withdrawals.filter(w => w.seller_id === sellerId);
  },
  getPending: () => {
    const withdrawals = getAll<Withdrawal>(DB_KEYS.withdrawals);
    return withdrawals.filter(w => w.status === 'pending');
  },
  create: (withdrawal: Withdrawal) => create(DB_KEYS.withdrawals, withdrawal),
  update: (id: string, updates: Partial<Withdrawal>) => update<Withdrawal>(DB_KEYS.withdrawals, id, updates),
  getTotalPending: (sellerId: string) => {
    const withdrawals = getAll<Withdrawal>(DB_KEYS.withdrawals);
    return withdrawals
      .filter(w => w.seller_id === sellerId && w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0);
  },
  getTotalWithdrawn: (sellerId: string) => {
    const withdrawals = getAll<Withdrawal>(DB_KEYS.withdrawals);
    return withdrawals
      .filter(w => w.seller_id === sellerId && (w.status === 'approved' || w.status === 'completed'))
      .reduce((sum, w) => sum + w.net_amount, 0);
  },
};

// QRIS operations
export const qrisService = {
  get: () => {
    const qris = localStorage.getItem(DB_KEYS.qris);
    return qris ? JSON.parse(qris) as QRISConfig : null;
  },
  update: (updates: Partial<QRISConfig>) => {
    const current = qrisService.get();
    if (!current) return null;
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(DB_KEYS.qris, JSON.stringify(updated));
    return updated;
  },
};

// Failed validation operations
export const failedValidationService = {
  getAll: () => getAll<FailedValidation>(DB_KEYS.failedValidations),
  create: (validation: FailedValidation) => create(DB_KEYS.failedValidations, validation),
  getToday: () => {
    const validations = getAll<FailedValidation>(DB_KEYS.failedValidations);
    const today = new Date().toDateString();
    return validations.filter(v => new Date(v.created_at).toDateString() === today);
  },
};

// Category operations
export const categoryService = {
  getAll: () => getAll<Category>(DB_KEYS.categories),
  create: (category: Category) => create(DB_KEYS.categories, category),
  delete: (id: string) => remove<Category>(DB_KEYS.categories, id),
};

// Auth operations
export const authService = {
  login: (email: string, password: string): User | null => {
    // Simple authentication - in production, use proper password hashing
    const users = getAll<User>(DB_KEYS.users);
    const user = users.find(u => u.email === email);
    if (user) {
      const storedPassword = localStorage.getItem(`password_${user.id}`);
      if (storedPassword === password) {
        localStorage.setItem(DB_KEYS.currentUser, JSON.stringify(user));
        return user;
      }
    }
    return null;
  },
  
  loginByNIK: (nik: string, password: string): User | null => {
    // Login using NIK instead of email
    const users = getAll<User>(DB_KEYS.users);
    const user = users.find(u => u.nik === nik);
    if (user) {
      const storedPassword = localStorage.getItem(`password_${user.id}`);
      if (storedPassword === password) {
        localStorage.setItem(DB_KEYS.currentUser, JSON.stringify(user));
        return user;
      }
    }
    return null;
  },
  
  logout: () => {
    localStorage.removeItem(DB_KEYS.currentUser);
  },
  getCurrentUser: (): User | null => {
    const user = localStorage.getItem(DB_KEYS.currentUser);
    return user ? JSON.parse(user) : null;
  },
  updatePassword: (userId: string, newPassword: string) => {
    // In production, hash the password
    localStorage.setItem(`password_${userId}`, newPassword);
    return true;
  },
  verifyPassword: (userId: string, password: string) => {
    const stored = localStorage.getItem(`password_${userId}`);
    if (stored) return stored === password;
    return false;
  },
};

// Generate unique ID
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
