// Types for Kantin Digital - SPS Corner

export interface User {
  id: string;
  email: string;
  full_name: string;
  nik: string;
  department: string;
  phone: string;
  role: 'admin' | 'seller' | 'customer';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  seller_id: string;
  seller_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  customer_name: string;
  items: TransactionItem[];
  total_amount: number;
  status: 'pending' | 'verified' | 'failed' | 'cancelled';
  payment_proof_url?: string;
  verification_notes?: string;
  verification_attempts: number;
  seller_id: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Withdrawal {
  id: string;
  seller_id: string;
  seller_name?: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  transfer_proof_url?: string;
  admin_notes?: string;
  requested_at: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QRISConfig {
  id: string;
  image_url: string;
  merchant_name: string;
  is_active: boolean;
  updated_at: string;
  updated_by?: string;
}

export interface FailedValidation {
  id: string;
  customer_name: string;
  attempted_amount: number;
  failure_reason: string;
  image_url?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  created_at: string;
}

export type ViewMode = 'home' | 'kiosk' | 'login' | 'seller' | 'admin';
