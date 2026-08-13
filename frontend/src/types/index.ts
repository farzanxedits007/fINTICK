export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'finance' | 'sales';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  ticket_type: 'flight' | 'visa' | 'umrah';
  customer: string | null;
  customer_name: string;
  vendor: string | null;
  vendor_name: string;
  passenger_name: string;
  passport_no: string;
  date_of_birth: string | null;
  passport_expiry: string | null;
  gender: 'male' | 'female' | 'other';
  pnr: string;
  flight_date: string | null;
  airline: string;
  vendor_cost_pkr: number;
  ticket_price_pkr: number;
  profit_pkr: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerLedgerEntry {
  id: string;
  ticket: string;
  ticket_ref: string;
  customer: string | null;
  customer_id: string | null;
  customer_name: string;
  passenger_name: string;
  entry_type: 'debit' | 'credit';
  amount_pkr: number;
  description: string;
  status: 'outstanding' | 'paid';
  created_at: string;
}

export interface VendorLedgerEntry {
  id: string;
  ticket: string;
  ticket_ref: string;
  vendor: string | null;
  vendor_id: string | null;
  vendor_name: string;
  passenger_name: string;
  entry_type: 'debit' | 'credit';
  amount_pkr: number;
  description: string;
  status: 'outstanding' | 'paid';
  created_at: string;
}

export interface LedgerSummary {
  total_receivable: string;
  total_collected: string;
  outstanding: string;
  paid: string;
  net_balance: string;
}

export interface VendorLedgerSummary {
  total_payable: string;
  total_paid: string;
  outstanding: string;
  paid: string;
  net_balance: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DashboardSummary {
  total_receivable: string;
  total_collected: string;
  customer_outstanding: string;
  total_payable: string;
  total_paid: string;
  vendor_outstanding: string;
  net_balance: string;
  total_profit: string;
  bank_balance: string;
  total_tickets: number;
  total_customers: number;
  total_vendors: number;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  account: string;
  tx_type: 'deposit' | 'withdrawal';
  amount_pkr: string;
  description: string;
  reference_model: string;
  reference_id: string | null;
  balance_after: string;
  created_at: string;
}

export interface BankSummary {
  account: BankAccount;
  transactions: BankTransaction[];
}
