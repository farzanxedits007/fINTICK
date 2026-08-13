import { useEffect, useState, useCallback } from 'react';
import { vendorLedgerAPI, vendorAPI, ticketAPI, VoucherPayload } from '../services/api';
import { Vendor, VendorLedgerEntry, VendorLedgerSummary, Ticket } from '../types';
import PaymentVoucherModal from '../components/PaymentVoucherModal';
import toast from 'react-hot-toast';
import { Search, Plus, X, Building2, ArrowLeft, Phone, MapPin, Trash2, Download, FileText, FileDown } from 'lucide-react';

const fmt = (v: number | string) => `PKR ${Number(v).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

export default function VendorLedgerPage() {
  const [entries, setEntries] = useState<VendorLedgerEntry[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState<VendorLedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [showEditVendor, setShowEditVendor] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vendorForm, setVendorForm] = useState({ name: '', company: '', phone: '', email: '', city: '', address: '', notes: '' });
  const [editForm, setEditForm] = useState({ name: '', company: '', phone: '', email: '', city: '', address: '', notes: '' });

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, any> = {};
    if (search) params.q = search;
    if (statusFilter) params.status = statusFilter;
    if (selectedVendor) params.vendor_id = selectedVendor.id;

    const summaryParams: Record<string, any> = {};
    if (selectedVendor) summaryParams.vendor_id = selectedVendor.id;

    const ticketPromise = selectedVendor
      ? ticketAPI.list({ vendor_id: selectedVendor.id, status: 'confirmed' }).then(({ data }) => data.results || [])
      : Promise.resolve<Ticket[]>([]);

    Promise.all([
      vendorLedgerAPI.list(params),
      vendorLedgerAPI.summary(summaryParams),
      vendorAPI.list(),
      ticketPromise,
    ]).then(([ledger, sum, vend, tickets]) => {
      setEntries(ledger.data.results || []);
      setSummary(sum.data);
      setVendors(vend.data.results || []);
      setPendingTickets(tickets);
      setLoading(false);
    });
  }, [search, statusFilter, selectedVendor]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    const params: Record<string, any> = {};
    if (selectedVendor) params.vendor_id = selectedVendor.id;
    try {
      const resp = await vendorLedgerAPI.export(params);
      const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedVendor ? `${selectedVendor.name}_ledger.xlsx` : 'vendor_ledger.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err: any) {
      toast.error('Failed to download: ' + (err.response?.status || err.message));
    }
  };

  const handleExportPdf = async () => {
    const params: Record<string, any> = {};
    if (selectedVendor) params.vendor_id = selectedVendor.id;
    try {
      const resp = await vendorLedgerAPI.exportPdf(params);
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedVendor ? `${selectedVendor.name}_ledger.pdf` : 'vendor_ledger.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err: any) {
      toast.error('Failed to download: ' + (err.response?.status || err.message));
    }
  };

  const handleSlip = async (entry: VendorLedgerEntry) => {
    try {
      const resp = await vendorLedgerAPI.slip(entry.id);
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment_slip_${entry.passenger_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err: any) {
      toast.error('Failed to download slip');
    }
  };

  const handlePayment = async (payload: VoucherPayload) => {
    setSubmitting(true);
    try {
      await vendorLedgerAPI.addPayment({
        ...payload,
        vendor_id: selectedVendor?.id || undefined,
      });
      toast.success('Voucher posted!');
      setShowPayment(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) { toast.error('Vendor name is required'); return; }
    setSubmitting(true);
    try {
      const resp = await vendorAPI.create(vendorForm);
      toast.success('Vendor account created!');
      setShowCreateVendor(false);
      setVendorForm({ name: '', company: '', phone: '', email: '', city: '', address: '', notes: '' });
      load();
      setSelectedVendor(resp.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await vendorLedgerAPI.delete(id);
      toast.success('Entry deleted');
      load();
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  const handleEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !editForm.name.trim()) return;
    setSubmitting(true);
    try {
      const resp = await vendorAPI.update(selectedVendor.id, editForm);
      toast.success('Vendor updated!');
      setShowEditVendor(false);
      setSelectedVendor(resp.data);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditVendor = () => {
    if (!selectedVendor) return;
    setEditForm({
      name: selectedVendor.name,
      company: selectedVendor.company,
      phone: selectedVendor.phone,
      email: selectedVendor.email,
      city: selectedVendor.city,
      address: selectedVendor.address,
      notes: selectedVendor.notes,
    });
    setShowEditVendor(true);
  };

  const pageTitle = selectedVendor
    ? `${selectedVendor.name} — Ledger`
    : 'Vendor Ledger';
  const pageSub = selectedVendor
    ? `Showing entries for ${selectedVendor.name}${selectedVendor.company ? ` (${selectedVendor.company})` : ''}`
    : 'What you owe vendors (Vendor Costs)';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            {selectedVendor && (
              <button onClick={() => setSelectedVendor(null)} className="text-gray-400 hover:text-gray-700 transition-colors" title="Back to all">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-900">{pageTitle}</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">{pageSub}</p>
        </div>
        {selectedVendor && (
          <button onClick={() => setShowPayment(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
            <Plus size={18} /> Record Payment
          </button>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase font-medium">Total Payable</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmt(summary.total_payable)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase font-medium">Outstanding</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{fmt(summary.outstanding)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase font-medium">Paid</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(summary.paid)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase font-medium">Net Balance</p>
            <p className="text-xl font-bold text-red-600 mt-1">{fmt(summary.net_balance)}</p>
          </div>
        </div>
      )}

      {!selectedVendor && vendors.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <p className="text-xs text-gray-500 uppercase font-medium mb-3">All Vendors ({vendors.length}) — click to view ledger</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {vendors.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVendor(v)}
                className="text-left p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-700">{v.name}</p>
                {v.company && <p className="text-xs text-gray-500 mt-0.5">{v.company}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  {v.phone && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone size={11} /> {v.phone}
                    </span>
                  )}
                  {v.city && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin size={11} /> {v.city}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedVendor && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="font-bold text-blue-900 text-lg">{selectedVendor.name}</p>
            {selectedVendor.company && <p className="text-sm text-blue-700 font-medium">{selectedVendor.company}</p>}
            <div className="flex items-center gap-4 mt-1 text-sm text-blue-700">
              {selectedVendor.phone && <span className="flex items-center gap-1"><Phone size={13} /> {selectedVendor.phone}</span>}
              {selectedVendor.city && <span className="flex items-center gap-1"><MapPin size={13} /> {selectedVendor.city}</span>}
              {selectedVendor.email && <span>{selectedVendor.email}</span>}
            </div>
            {selectedVendor.address && <p className="text-xs text-blue-600 mt-1">{selectedVendor.address}</p>}
            {selectedVendor.notes && <p className="text-xs text-blue-500 mt-1 italic">{selectedVendor.notes}</p>}
          </div>
          <button onClick={openEditVendor} className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
            Edit Account
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Search by name or passport..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="outstanding">Outstanding</option>
            <option value="paid">Paid</option>
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Download size={16} /> Download Excel
          </button>
          <button onClick={handleExportPdf} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors">
            <FileDown size={16} /> Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Passenger</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Voucher No</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">PNR</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount (PKR)</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No entries found</td></tr>
            ) : entries.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm text-gray-600">{new Date(e.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-sm font-medium">{e.passenger_name}</td>
                <td className="px-5 py-3 text-sm font-mono text-gray-500">{e.voucher_no || '—'}</td>
                <td className="px-5 py-3 text-sm font-mono text-gray-600">{e.ticket_ref || '—'}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${e.entry_type === 'credit' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {e.entry_type === 'credit' ? 'Vendor Cost' : 'Payment Made'}
                  </span>
                </td>
                <td className={`px-5 py-3 text-sm text-right font-medium ${e.entry_type === 'credit' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {fmt(e.amount_pkr)}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">{e.description}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${e.status === 'outstanding' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <div className="flex justify-center gap-1">
                    {e.entry_type === 'debit' && (
                      <button onClick={() => handleSlip(e)} className="text-gray-400 hover:text-blue-600 p-1 transition-colors" title="Download payment slip">
                        <FileText size={15} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(e.id)} className="text-gray-400 hover:text-red-600 p-1 transition-colors" title="Delete entry">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPayment && selectedVendor && (
        <PaymentVoucherModal
          mode="make"
          accountId={selectedVendor.id}
          accountName={selectedVendor.name}
          tickets={pendingTickets}
          submitting={submitting}
          onSubmit={handlePayment}
          onClose={() => setShowPayment(false)}
        />
      )}

      {showCreateVendor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateVendor(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">New Vendor Account</h3>
              <button onClick={() => setShowCreateVendor(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Vendor / contact name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Company name" value={vendorForm.company} onChange={(e) => setVendorForm({ ...vendorForm, company: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="+92..." value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="City" value={vendorForm.city} onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="email@example.com" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Address" value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={2} placeholder="Optional notes" value={vendorForm.notes} onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Vendor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditVendor && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditVendor(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Edit Vendor</h3>
              <button onClick={() => setShowEditVendor(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <form onSubmit={handleEditVendor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowEditVendor(false)} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
