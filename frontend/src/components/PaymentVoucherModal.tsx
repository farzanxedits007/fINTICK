import { useEffect, useState } from 'react';
import { bankAPI, VoucherPayload } from '../services/api';
import { Ticket, BankAccount } from '../types';
import { X } from 'lucide-react';

interface Props {
  mode: 'receive' | 'make';
  accountId?: string;
  accountName?: string;
  tickets: Ticket[];
  submitting: boolean;
  onSubmit: (payload: VoucherPayload) => Promise<void>;
  onClose: () => void;
}

const fmt = (v: number | string) => `PKR ${Number(v).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

const defaultState = {
  voucher_date: new Date().toISOString().slice(0, 10),
  voucher_status: 'final',
  voucher_no: 'Auto',
  branch: 'Lahore',
  invoice_ref: '',
  cash_flow: 'Not Required',
  payment_method: 'bank',
  account_id: '',
  currency: 'PKR',
  exchange_rate: '75.75',
  amount_sar: '',
  amount: '',
  ticket_id: '',
  description: '',
  advance_option: 'Adjust Multiple',
};

export default function PaymentVoucherModal({ mode, accountId, accountName, tickets, submitting, onSubmit, onClose }: Props) {
  const [form, setForm] = useState({ ...defaultState });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    bankAPI.list().then(({ data }) => setBankAccounts(data || [])).catch(() => {});
  }, []);

  const isSar = form.currency === 'SAR';
  const exchangeRate = Number(form.exchange_rate) || 0;
  const sarAmount = Number(form.amount_sar) || 0;
  const pkrAmount = isSar ? sarAmount * exchangeRate : (Number(form.amount) || 0);

  const set = (patch: Record<string, any>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkrAmount || pkrAmount <= 0) return;
    await onSubmit({
      passenger_name: accountName || '',
      amount: isSar ? 0 : Number(form.amount),
      amount_sar: isSar ? sarAmount : 0,
      currency: isSar ? 'SAR' : 'PKR',
      exchange_rate: isSar ? exchangeRate : 0,
      payment_method: form.payment_method as 'bank' | 'cash',
      account_id: form.payment_method === 'bank' && form.account_id ? form.account_id : null,
      ticket_id: form.ticket_id || undefined,
      voucher_date: form.voucher_date,
      voucher_status: form.voucher_status,
      branch: form.branch,
      invoice_ref: form.invoice_ref,
      cash_flow: form.cash_flow,
      advance_option: form.advance_option,
      description: form.description.trim() || (mode === 'receive' ? 'Payment received' : 'Payment made'),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold">Voucher — {mode === 'receive' ? 'Receive Payment' : 'Make Payment'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Type *</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 focus:outline-none" value={mode} disabled>
                <option value="receive">Receive Payment</option>
                <option value="make">Make Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Date *</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.voucher_date} onChange={(e) => set({ voucher_date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 focus:outline-none" value={form.voucher_status} disabled>
                <option value="final">Final</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voucher No</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 focus:outline-none" value={form.voucher_no} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.branch} onChange={(e) => set({ branch: e.target.value })}>
                <option value="Lahore">Lahore</option>
                <option value="Karachi">Karachi</option>
                <option value="Islamabad">Islamabad</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice / Ref</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Invoice reference" value={form.invoice_ref} onChange={(e) => set({ invoice_ref: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash Flow</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.cash_flow} onChange={(e) => set({ cash_flow: e.target.value })}>
                <option value="Not Required">Not Required</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received / Paid In *</label>
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm font-medium transition-colors ${form.payment_method === 'bank' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                    <input type="radio" name="payment_method" value="bank" checked={form.payment_method === 'bank'} onChange={(e) => set({ payment_method: e.target.value })} className="sr-only" />
                    Bank
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm font-medium transition-colors ${form.payment_method === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                    <input type="radio" name="payment_method" value="cash" checked={form.payment_method === 'cash'} onChange={(e) => set({ payment_method: e.target.value })} className="sr-only" />
                    Cash
                  </label>
                </div>
                {form.payment_method === 'cash' && <p className="text-xs text-gray-400 mt-1">Posted to Cash Account — shown in Cash tab.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  value={form.account_id}
                  onChange={(e) => set({ account_id: e.target.value })}
                  disabled={form.payment_method !== 'bank'}
                >
                  <option value="">— Select Bank Account —</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {fmt(a.balance)}</option>
                  ))}
                </select>
                {form.payment_method === 'bank' && bankAccounts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No bank accounts. Add one in Admin Panel.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{mode === 'receive' ? 'Received From Account' : 'Paid To Account'}</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700 focus:outline-none" value={accountName || '—'} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Against Invoice (Ticket)</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.ticket_id} onChange={(e) => set({ ticket_id: e.target.value })}>
                  <option value="">— Select Ticket —</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>{t.passenger_name} — {t.pnr || 'No PNR'} — {fmt(t.ticket_price_pkr)}</option>
                  ))}
                </select>
                {tickets.length === 0 && <p className="text-xs text-amber-600 mt-1">No unpaid tickets for this account.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Advance Options</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.advance_option} onChange={(e) => set({ advance_option: e.target.value })}>
                  <option value="Adjust Multiple">Adjust Multiple Invoices</option>
                  <option value="Partial">Partial Invoices</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Amount</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.currency} onChange={(e) => set({ currency: e.target.value })}>
                  <option value="PKR">Pak Rupees</option>
                  <option value="SAR">Saudi Riyal</option>
                </select>
              </div>
              {isSar ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ex. Rate *</label>
                    <input type="number" step="0.01" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.exchange_rate} onChange={(e) => set({ exchange_rate: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (SAR) *</label>
                    <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="0.00" value={form.amount_sar} onChange={(e) => set({ amount_sar: e.target.value })} required />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR) *</label>
                  <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="0.00" value={form.amount} onChange={(e) => set({ amount: e.target.value })} required />
                </div>
              )}
            </div>
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-emerald-700 font-medium">PKR Amount</span>
              <span className="text-xl font-bold text-emerald-700">{fmt(pkrAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" rows={2} placeholder={mode === 'receive' ? 'Payment received' : 'Payment made'} value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </div>

          <button type="submit" disabled={submitting || !pkrAmount || pkrAmount <= 0} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {submitting ? 'Posting Voucher...' : `Post Voucher (${fmt(pkrAmount)})`}
          </button>
        </form>
      </div>
    </div>
  );
}
