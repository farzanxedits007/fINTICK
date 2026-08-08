import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { DashboardSummary } from '../types';
import { TrendingUp, TrendingDown, Users, Truck, Ticket, AlertCircle, Landmark } from 'lucide-react';

const fmt = (v: number | string) => `PKR ${Number(v).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.dashboard().then(({ data }) => { setData(data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard...</div>;
  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Failed to load</div>;

  const netProfit = Number(data.total_profit);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Financial overview of FinTick</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Total Receivable</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(data.total_receivable)}</p>
          <p className="text-xs text-gray-400 mt-1">What customers owe you</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Customer Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{fmt(data.customer_outstanding)}</p>
          <p className="text-xs text-gray-400 mt-1">Pending from customers</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Total Collected</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{fmt(data.total_collected)}</p>
          <p className="text-xs text-gray-400 mt-1">Received from customers</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <TrendingDown size={20} className="text-red-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Total Payable</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{fmt(data.total_payable)}</p>
          <p className="text-xs text-gray-400 mt-1">What you owe vendors</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Vendor Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{fmt(data.vendor_outstanding)}</p>
          <p className="text-xs text-gray-400 mt-1">Pending to vendors</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingDown size={20} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Total Paid</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{fmt(data.total_paid)}</p>
          <p className="text-xs text-gray-400 mt-1">Paid to vendors</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Net Balance</span>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(data.net_balance)}</p>
          <p className="text-xs text-gray-400 mt-1">Receivable minus collected</p>
        </div>

        <div className={`rounded-xl border p-5 ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <TrendingUp size={20} className={netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'} />
            </div>
            <span className="text-xs uppercase font-medium text-gray-600">Total Profit</span>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(data.total_profit)}</p>
          <p className="text-xs text-gray-500 mt-1">From all posted tickets</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Landmark size={20} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Bank Balance</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{fmt(data.bank_balance)}</p>
          <p className="text-xs text-gray-400 mt-1">Main bank account</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Ticket size={24} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{data.total_tickets}</p>
            <p className="text-sm text-gray-500">Total Tickets</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{data.total_customers}</p>
            <p className="text-sm text-gray-500">Customers</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <Truck size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{data.total_vendors}</p>
            <p className="text-sm text-gray-500">Vendors</p>
          </div>
        </div>
      </div>
    </div>
  );
}
