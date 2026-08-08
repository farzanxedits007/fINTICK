import { useEffect, useState } from 'react';
import { bankAPI } from '../services/api';
import { BankSummary } from '../types';
import { Landmark, ArrowDownLeft, ArrowUpRight, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (v: number | string) => `PKR ${Number(v).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

export default function BankPage() {
  const [data, setData] = useState<BankSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    bankAPI.summary().then(({ data }) => { setData(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleExport = async () => {
    try {
      const resp = await bankAPI.export();
      const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bank_transactions.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err: any) {
      toast.error('Failed to download: ' + (err.response?.status || err.message));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading bank data...</div>;
  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Failed to load</div>;

  const balance = Number(data.account.balance);
  const filteredTx = data.transactions.filter((tx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return tx.description.toLowerCase().includes(q);
  });

  const deposits = data.transactions.filter((t) => t.tx_type === 'deposit');
  const withdrawals = data.transactions.filter((t) => t.tx_type === 'withdrawal');
  const totalDeposits = deposits.reduce((s, t) => s + Number(t.amount_pkr), 0);
  const totalWithdrawals = withdrawals.reduce((s, t) => s + Number(t.amount_pkr), 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bank Account</h2>
        <p className="text-sm text-gray-500 mt-1">Track all deposits and withdrawals</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-xl border p-5 ${balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${balance >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <Landmark size={20} className={balance >= 0 ? 'text-emerald-700' : 'text-red-700'} />
            </div>
            <span className="text-xs uppercase font-medium text-gray-600">Current Balance</span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(balance)}</p>
          <p className="text-xs text-gray-500 mt-1">{data.account.name}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ArrowDownLeft size={20} className="text-emerald-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Total Deposits</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{fmt(totalDeposits)}</p>
          <p className="text-xs text-gray-400 mt-1">{deposits.length} transactions</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <ArrowUpRight size={20} className="text-red-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">Total Withdrawals</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{fmt(totalWithdrawals)}</p>
          <p className="text-xs text-gray-400 mt-1">{withdrawals.length} transactions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center justify-between">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Download size={16} /> Download Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTx.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No transactions</td></tr>
            ) : filteredTx.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm text-gray-600">{new Date(tx.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.tx_type === 'deposit' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {tx.tx_type === 'deposit' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                    {tx.tx_type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">{tx.description}</td>
                <td className={`px-5 py-3 text-sm text-right font-medium ${tx.tx_type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.tx_type === 'deposit' ? '+' : '-'}{fmt(tx.amount_pkr)}
                </td>
                <td className="px-5 py-3 text-sm text-right font-medium text-gray-900">{fmt(tx.balance_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
