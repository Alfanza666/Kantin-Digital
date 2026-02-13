import { createClient } from '@supabase/supabase-js';
import type { User, Product, Transaction, Withdrawal, QRISConfig, FailedValidation, Category } from '@/types';

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to generate IDs (client-side for compatibility, though DB can do it too)
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// User operations
export const userService = {
  getAll: async () => {
    const { data } = await supabase.from('users').select('*');
    return (data as User[]) || [];
  },
  getById: async (id: string) => {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data as User | null;
  },
  getSellers: async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'seller');
    return (data as User[]) || [];
  },
  create: async (user: User) => {
    // Note: Password should be hashed in a real production app. 
    // Here we assume '123456' default for new sellers as per previous logic
    const { data, error } = await supabase.from('users').insert([{ ...user, password: '123456' }]).select().single();
    if (error) console.error(error);
    return data as User;
  },
  delete: async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
    return true;
  }
};

// Product operations
export const productService = {
  getAll: async () => {
    const { data } = await supabase.from('products').select('*');
    return (data as Product[]) || [];
  },
  getBySeller: async (sellerId: string) => {
    const { data } = await supabase.from('products').select('*').eq('seller_id', sellerId);
    return (data as Product[]) || [];
  },
  getActive: async () => {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).gt('stock', 0);
    return (data as Product[]) || [];
  },
  create: async (product: Product) => {
    const { data, error } = await supabase.from('products').insert([product]).select().single();
    if (error) console.error(error);
    return data as Product;
  },
  update: async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase.from('products').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) console.error(error);
    return data as Product | null;
  },
  delete: async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    return true;
  },
  reduceStock: async (productId: string, quantity: number) => {
    // In a real app, use an RPC call or transaction to prevent race conditions
    const { data: product } = await supabase.from('products').select('stock').eq('id', productId).single();
    if (!product) return null;
    const newStock = Math.max(0, product.stock - quantity);
    const { data } = await supabase.from('products').update({ stock: newStock }).eq('id', productId).select().single();
    return data as Product;
  },
};

// Transaction operations
export const transactionService = {
  getAll: async () => {
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    return (data as Transaction[]) || [];
  },
  getBySeller: async (sellerId: string) => {
    const { data } = await supabase.from('transactions').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
    return (data as Transaction[]) || [];
  },
  create: async (transaction: Transaction) => {
    const { data, error } = await supabase.from('transactions').insert([transaction]).select().single();
    if (error) console.error(error);
    return data as Transaction;
  },
  getTotalRevenue: async (sellerId?: string) => {
    let query = supabase.from('transactions').select('total_amount').eq('status', 'verified');
    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }
    const { data } = await query;
    return data?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
  },
};

// Withdrawal operations
export const withdrawalService = {
  getAll: async () => {
    const { data } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false });
    return (data as Withdrawal[]) || [];
  },
  getBySeller: async (sellerId: string) => {
    const { data } = await supabase.from('withdrawals').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
    return (data as Withdrawal[]) || [];
  },
  create: async (withdrawal: Withdrawal) => {
    const { data, error } = await supabase.from('withdrawals').insert([withdrawal]).select().single();
    if (error) console.error(error);
    return data as Withdrawal;
  },
  update: async (id: string, updates: Partial<Withdrawal>) => {
    const { data, error } = await supabase.from('withdrawals').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) console.error(error);
    return data as Withdrawal | null;
  }
};

// QRIS operations
export const qrisService = {
  get: async () => {
    const { data } = await supabase.from('qris_config').select('*').limit(1).single();
    return data as QRISConfig | null;
  },
  update: async (updates: Partial<QRISConfig>) => {
    // Upsert logic (update if exists, insert if not)
    // We assume ID is 'qris-1' for single config
    const { data, error } = await supabase.from('qris_config').upsert({ id: 'qris-1', ...updates, updated_at: new Date().toISOString() }).select().single();
    if(error) console.error(error);
    return data;
  },
};

// Failed validation operations
export const failedValidationService = {
  getAll: async () => {
    const { data } = await supabase.from('failed_validations').select('*').order('created_at', { ascending: false });
    return (data as FailedValidation[]) || [];
  },
  create: async (validation: FailedValidation) => {
    const { data } = await supabase.from('failed_validations').insert([validation]).select().single();
    return data as FailedValidation;
  }
};

// Category operations
export const categoryService = {
  getAll: async () => {
    const { data } = await supabase.from('categories').select('*');
    return (data as Category[]) || [];
  }
};

// Auth operations
// For MVP Transition: We are using a custom 'password' column in the 'users' table
// instead of fully rewriting to Supabase Auth (GoTrue) to keep the NIK login logic identical.
export const authService = {
  loginByNIK: async (nik: string, password: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('nik', nik)
      .eq('password', password) // In production, never query password directly. Use hashing.
      .single();
    
    if (error || !data) return null;
    
    // Store session in localStorage to persist login across reloads
    localStorage.setItem('sps_current_user', JSON.stringify(data));
    return data as User;
  },
  
  logout: () => {
    localStorage.removeItem('sps_current_user');
  },
  
  getCurrentUser: (): User | null => {
    const user = localStorage.getItem('sps_current_user');
    return user ? JSON.parse(user) : null;
  },
  
  updatePassword: async (userId: string, newPassword: string) => {
    const { error } = await supabase.from('users').update({ password: newPassword }).eq('id', userId);
    return !error;
  },
  
  verifyPassword: async (userId: string, password: string) => {
    const { data } = await supabase.from('users').select('id').eq('id', userId).eq('password', password).single();
    return !!data;
  },
};

// Removed initializeDatabase() as we now use persistent Supabase
