import { useEffect, useState } from 'react';
import { customerAPI, vendorAPI, bankAPI } from '../services/api';
import { Customer, Vendor, BankAccount } from '../types';
import toast from 'react-hot-toast';
import { Plus, X, Trash2, Pencil, Search, Users, Building2, Landmark } from 'lucide-react';

export default function AdminPanelPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'customers' | 'vendors' | 'banks'>('customers');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<Customer | Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bankName, setBankName] = useState('');

  const [custForm, setCustForm] = useState({ name: '', phone: '', email: '', city: '', address: '', notes: '' });
  const [vendForm, setVendForm] = useState({ name: '', company: '', phone: '', email: '', city: '', address: '', notes: '' });
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    Promise.all([customerAPI.list(), vendorAPI.list(), bankAPI.list()]).then(([c, v, b]) => {
      setCustomers(c.data.results || []);
      setVendors(v.data.results || []);
      setBanks(b.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      await customerAPI.create(custForm);
      toast.success('Customer created!');
      setShowCreate(false);
      setCustForm({ name: '', phone: '', email: '', city: '', address: '', notes: '' });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendForm.name.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      await vendorAPI.create(vendForm);
      toast.success('Vendor created!');
      setShowCreate(false);
      setVendForm({ name: '', company: '', phone: '', email: '', city: '', address: '', notes: '' });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) { toast.error('Account name is required'); return; }
    setSubmitting(true);
    try {
      await bankAPI.create({ name: bankName.trim() });
      toast.success('Bank account created!');
      setBankName('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Delete this bank account? Accounts with transactions cannot be deleted.')) return;
    try {
      await bankAPI.delete(id);
      toast.success('Bank account deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed — account may have transactions');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      const isCustomer = 'company' in editing === false && 'email' in editing;
      const isVendor = 'company' in editing;
      if (isVendor) {
        const resp = await vendorAPI.update(editing.id, editForm);
        toast.success('Vendor updated!');
        setEditing(resp.data);
      } else {
        const resp = await customerAPI.update(editing.id, editForm);
        toast.success('Customer updated!');
        setEditing(resp.data);
      }
      setShowEdit(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (type: 'customer' | 'vendor', id: string) => {
    if (!confirm(`Delete this ${type}?`)) return;
    try {
      if (type === 'customer') await customerAPI.delete(id);
      else await vendorAPI.delete(id);
      toast.success(`${type} deleted`);
      load();
    } catch { toast.error('Failed'); }
  };

  const openEdit = (item: Customer | Vendor) => {
    setEditing(item);
    const f: Record<string, string> = {};
    for (const [k, v] of Object.entries(item)) {
      if (v !== null && v !== undefined && typeof v === 'string' && k !== 'id' && k !== 'created_at' && k !== 'updated_at') f[k] = v;
    }
    setEditForm(f);
    setShowEdit(true);
  };

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q);
  });

  const filteredVendors = vendors.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.name.toLowerCase().includes(q) || (v.company && v.company.toLowerCase().includes(q)) || v.phone.includes(q) || v.city.toLowerCase().includes(q);
  });

  const isVendor = editing && 'company' in editing;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          <p className="text-sm text-gray-500 mt-1">Manage customer and vendor accounts</p>
        </div>
        {tab !== 'banks' && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
            <Plus size={18} /> New {tab === 'customers' ? 'Customer' : 'Vendor'}
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <button onClick={() => { setTab('customers'); setSearch(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${tab === 'customers' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Users size={18} /> Customers ({customers.length})
        </button>
        <button onClick={() => { setTab('vendors'); setSearch(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${tab === 'vendors' ? 'bg-amber-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Building2 size={18} /> Vendors ({vendors.length})
        </button>
        <button onClick={() => { setTab('banks'); setSearch(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${tab === 'banks' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Landmark size={18} /> Bank Accounts ({banks.length})
        </button>
      </div>

      {tab === 'banks' && (
        <div className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <form onSubmit={handleCreateBank} className="flex gap-3">
              <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="New bank account name (e.g. HBL Main)" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
              <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
                <Plus size={16} /> {submitting ? 'Adding...' : 'Add Account'}
              </button>
            </form>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {banks.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">No bank accounts yet</div>
            )}
            {banks.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Landmark size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{b.name}</p>
                    <p className="text-sm text-emerald-600 font-medium">PKR {Number(b.balance).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteBank(b.id)} className="text-gray-400 hover:text-red-600 p-1 transition-colors" title="Delete account">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab !== 'banks' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder={`Search ${tab}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      {tab !== 'banks' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              {tab === 'vendors' && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>}
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">City</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : tab === 'customers' && filteredCustomers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No customers found</td></tr>
            ) : tab === 'vendors' && filteredVendors.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No vendors found</td></tr>
            ) : tab === 'customers' ? filteredCustomers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium">{c.name}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{c.phone || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{c.city || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{c.email || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete('customer', c.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            )) : filteredVendors.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium">{v.name}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{v.company || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{v.phone || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{v.city || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{v.email || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{new Date(v.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => openEdit(v)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete('vendor', v.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">New {tab === 'customers' ? 'Customer' : 'Vendor'}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            {tab === 'customers' ? (
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={custForm.city} onChange={(e) => setCustForm({ ...custForm, city: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={custForm.email} onChange={(e) => setCustForm({ ...custForm, email: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={custForm.address} onChange={(e) => setCustForm({ ...custForm, address: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" rows={2} value={custForm.notes} onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })} /></div>
                <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">{submitting ? 'Creating...' : 'Create Customer'}</button>
              </form>
            ) : (
              <form onSubmit={handleCreateVendor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={vendForm.name} onChange={(e) => setVendForm({ ...vendForm, name: e.target.value })} required />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={vendForm.company} onChange={(e) => setVendForm({ ...vendForm, company: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={vendForm.phone} onChange={(e) => setVendForm({ ...vendForm, phone: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={vendForm.city} onChange={(e) => setVendForm({ ...vendForm, city: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={vendForm.email} onChange={(e) => setVendForm({ ...vendForm, email: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={vendForm.address} onChange={(e) => setVendForm({ ...vendForm, address: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" rows={2} value={vendForm.notes} onChange={(e) => setVendForm({ ...vendForm, notes: e.target.value })} /></div>
                <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">{submitting ? 'Creating...' : 'Create Vendor'}</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowEdit(false); setEditing(null); }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Edit {isVendor ? 'Vendor' : 'Customer'}</h3>
              <button onClick={() => { setShowEdit(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
              {isVendor && <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={editForm.company || ''} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" rows={2} value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowEdit(false); setEditing(null); }} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">{submitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
