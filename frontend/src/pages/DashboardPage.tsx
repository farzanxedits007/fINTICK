import { useAuthStore } from '../store/authStore';
import { Ticket, Landmark } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const name = user?.full_name || user?.username || 'there';
  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {name}</h2>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">FinTick</h3>
          <p className="text-gray-600 leading-relaxed">
            Your ticket posting and ledger management system. Use the menu to post tickets,
            track customer and vendor ledgers, record payments, and manage your bank account.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Ticket size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Ticket Posting</p>
                <p className="text-xs text-gray-500 mt-0.5">Post flight, visa and umrah tickets with auto ledger updates.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Landmark size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Bank &amp; Ledgers</p>
                <p className="text-xs text-gray-500 mt-0.5">Record payments, track balances and download reports.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
