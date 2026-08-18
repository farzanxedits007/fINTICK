import { useEffect, useState } from 'react';
import { ticketAPI, customerAPI, vendorAPI } from '../services/api';
import { Ticket, Customer, Vendor } from '../types';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Eye, X } from 'lucide-react';

const fmt = (v: number) => `PKR ${Number(v).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

const typeLabel: Record<string, string> = { flight: 'Flight', visa: 'Visa', umrah: 'Umrah' };

const countries = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia',
  'Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium',
  'Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria',
  'Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad',
  'Chile','China','Colombia','Comoros','Congo (Congo-Brazzaville)','Costa Rica','Croatia','Cuba',
  'Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic','East Timor','Ecuador',
  'Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland',
  'France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea',
  'Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq',
  'Ireland','Israel','Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati',
  'Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein',
  'Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands',
  'Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco',
  'Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger',
  'Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama',
  'Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia',
  'Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino',
  'Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore',
  'Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain',
  'Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania',
  'Thailand','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda',
  'Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu',
  'Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
];

const defaultForm = {
  customer: '', vendor: '',
  ticket_type: 'flight', passenger_name: '', passport_no: '', date_of_birth: '', passport_expiry: '',
  gender: 'male', pnr: '', flight_date: '', airline: '', sector: '',
  country: '', visa_type: '', package: '', stay_date: '', makkah_hotel: '', madina_hotel: '',
  vendor_cost_pkr: '', ticket_price_pkr: '', status: 'confirmed',
};

export default function TicketPostingPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ ...defaultForm });

  const profit = (Number(form.ticket_price_pkr) || 0) - (Number(form.vendor_cost_pkr) || 0);

  const load = () => {
    const params: Record<string, any> = {};
    if (search) params.q = search;
    ticketAPI.list(params).then(({ data }) => { setTickets(data.results || []); setLoading(false); });
  };

  const loadAccounts = () => {
    customerAPI.list({ active: 'true' }).then(({ data }) => setCustomers(data.results || []));
    vendorAPI.list({ active: 'true' }).then(({ data }) => setVendors(data.results || []));
  };

  useEffect(() => { load(); }, [search]);
  useEffect(() => { loadAccounts(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ticketAPI.create({
        ...form,
        customer: form.customer || null,
        vendor: form.vendor || null,
        ticket_type: form.ticket_type as 'flight' | 'visa' | 'umrah',
        gender: form.gender as 'male' | 'female' | 'other',
        visa_type: form.visa_type as 'visit' | 'work' | 'student',
        package: form.package as 'star' | 'economy',
        status: form.status as 'confirmed' | 'cancelled',
        vendor_cost_pkr: Number(form.vendor_cost_pkr),
        ticket_price_pkr: Number(form.ticket_price_pkr),
        date_of_birth: form.date_of_birth || null,
        passport_expiry: form.passport_expiry || null,
        flight_date: form.flight_date || null,
        stay_date: form.stay_date || null,
      });
      toast.success('Ticket posted & ledgers updated!');
      setShowForm(false);
      setForm({ ...defaultForm });
      load();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.response?.status || err.message;
      toast.error(`Failed to post ticket (${msg})`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async (id: string) => {
    if (!confirm('Void this ticket? This reverses its ledger entries.')) return;
    try { await ticketAPI.delete(id); toast.success('Ticket voided'); load(); }
    catch { toast.error('Failed'); }
  };

  const statusBadge = (s: string) => {
    const c: Record<string, string> = { confirmed: 'bg-blue-100 text-blue-800', paid: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-red-100 text-red-800' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c[s] || c.confirmed}`}>{s}</span>;
  };

  const selectedCustomerObj = customers.find((c) => c.id === form.customer) || null;
  const selectedVendorObj = vendors.find((v) => v.id === form.vendor) || null;

  const field = (label: string, name: string, props: any = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={(form as any)[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} {...props} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ticket Posting</h2>
          <p className="text-sm text-gray-500 mt-1">Post tickets and auto-update ledgers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
          <Plus size={18} /> Post New Ticket
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Search by name, passport, PNR..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Passenger</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vendor</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Vendor Cost</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Ticket Price</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Profit</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">No tickets found</td></tr>
            ) : tickets.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-sm">{t.passenger_name}</td>
                <td className="px-5 py-3 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-purple-100 text-purple-800">
                    {typeLabel[t.ticket_type] || t.ticket_type}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-600">{t.customer_name || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{t.vendor_name || '—'}</td>
                <td className="px-5 py-3 text-sm font-mono text-gray-600">{t.pnr || t.visa_type || t.package || '—'}</td>
                <td className="px-5 py-3 text-sm text-right text-red-600">{fmt(t.vendor_cost_pkr)}</td>
                <td className="px-5 py-3 text-sm text-right text-emerald-600 font-medium">{fmt(t.ticket_price_pkr)}</td>
                <td className={`px-5 py-3 text-sm text-right font-semibold ${t.profit_pkr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {fmt(t.profit_pkr)}
                </td>
                <td className="px-5 py-3">{statusBadge(t.status)}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => setDetail(t)} className="text-gray-400 hover:text-blue-600 p-1" title="View"><Eye size={16} /></button>
                    <button onClick={() => handleVoid(t.id)} className="text-gray-400 hover:text-red-600 p-1" title="Void"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Ticket Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Post New Ticket</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Accounts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
                      <option value="">— Select Customer —</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}{c.city ? ` — ${c.city}` : ''}</option>
                      ))}
                    </select>
                    {customers.length === 0 && <p className="text-xs text-amber-600 mt-1">No customers yet. Create one in Customer Ledger.</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
                      <option value="">— Select Vendor —</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name} {v.company ? `(${v.company})` : ''}{v.city ? ` — ${v.city}` : ''}</option>
                      ))}
                    </select>
                    {vendors.length === 0 && <p className="text-xs text-amber-600 mt-1">No vendors yet. Create one in Vendor Ledger.</p>}
                  </div>
                </div>
                {(selectedCustomerObj || selectedVendorObj) && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {selectedCustomerObj && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-700 uppercase">Customer</p>
                        <p className="text-sm font-bold text-blue-900">{selectedCustomerObj.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-blue-600">
                          {selectedCustomerObj.phone && <span>{selectedCustomerObj.phone}</span>}
                          {selectedCustomerObj.city && <span>{selectedCustomerObj.city}</span>}
                          {selectedCustomerObj.email && <span>{selectedCustomerObj.email}</span>}
                        </div>
                      </div>
                    )}
                    {selectedVendorObj && (
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <p className="text-xs font-semibold text-amber-700 uppercase">Vendor</p>
                        <p className="text-sm font-bold text-amber-900">{selectedVendorObj.name}</p>
                        {selectedVendorObj.company && <p className="text-xs text-amber-600">{selectedVendorObj.company}</p>}
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-amber-600">
                          {selectedVendorObj.phone && <span>{selectedVendorObj.phone}</span>}
                          {selectedVendorObj.city && <span>{selectedVendorObj.city}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Ticket Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Type *</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.ticket_type} onChange={(e) => setForm({ ...form, ticket_type: e.target.value })} required>
                      <option value="flight">Flight Ticket</option>
                      <option value="visa">Visa</option>
                      <option value="umrah">Umrah</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passenger Name *</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.passenger_name} onChange={(e) => setForm({ ...form, passenger_name: e.target.value })} required />
                  </div>
                  {form.ticket_type === 'flight' && (
                    <>
                      {field('Passport Number *', 'passport_no', { required: true })}
                      {field('PNR', 'pnr', { placeholder: 'Booking reference' })}
                      {field('Airline', 'airline', { placeholder: 'e.g. PIA, Airblue' })}
                      {field('Travel Date', 'flight_date', { type: 'date' })}
                      {field('Sector', 'sector', { placeholder: 'e.g. KHI → JED' })}
                    </>
                  )}
                  {form.ticket_type === 'visa' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required>
                          <option value="">— Select Country —</option>
                          {countries.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type *</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.visa_type} onChange={(e) => setForm({ ...form, visa_type: e.target.value })} required>
                          <option value="">— Select Visa Type —</option>
                          <option value="visit">Visit</option>
                          <option value="work">Work</option>
                          <option value="student">Student</option>
                        </select>
                      </div>
                    </>
                  )}
                  {form.ticket_type === 'umrah' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Package *</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} required>
                          <option value="">— Select Package —</option>
                          <option value="star">Star</option>
                          <option value="economy">Economy</option>
                        </select>
                      </div>
                      {field('Stay Date', 'stay_date', { type: 'date' })}
                      {field('Makkah Hotel', 'makkah_hotel')}
                      {field('Madina Hotel', 'madina_hotel')}
                    </>
                  )}
                  {field('Date of Birth', 'date_of_birth', { type: 'date' })}
                  {field('Passport Expiry', 'passport_expiry', { type: 'date' })}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Pricing (PKR)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Cost (PKR) *</label>
                    <input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-lg" value={form.vendor_cost_pkr} onChange={(e) => setForm({ ...form, vendor_cost_pkr: e.target.value })} required placeholder="0.00" />
                    <p className="text-xs text-gray-400 mt-1">What you owe the vendor</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Price (PKR) *</label>
                    <input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-lg" value={form.ticket_price_pkr} onChange={(e) => setForm({ ...form, ticket_price_pkr: e.target.value })} required placeholder="0.00" />
                    <p className="text-xs text-gray-400 mt-1">What the customer pays you</p>
                  </div>
                </div>

                <div className="mt-4 bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Profit</span>
                    <span className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmt(profit)}
                    </span>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {submitting ? 'Posting...' : 'Post Ticket & Update Ledgers'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{detail.passenger_name}</h3>
              <button onClick={() => setDetail(null)}><X size={22} className="text-gray-400" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-500">Type:</span><span className="font-medium capitalize">{typeLabel[detail.ticket_type] || detail.ticket_type}</span>
                <span className="text-gray-500">Customer:</span><span className="font-medium">{detail.customer_name || '—'}</span>
                <span className="text-gray-500">Vendor:</span><span className="font-medium">{detail.vendor_name || '—'}</span>
                <span className="text-gray-500">Passport:</span><span className="font-medium">{detail.passport_no || '—'}</span>
                <span className="text-gray-500">Gender:</span><span className="capitalize">{detail.gender}</span>
                <span className="text-gray-500">DOB:</span><span>{detail.date_of_birth || '—'}</span>
                <span className="text-gray-500">Expiry:</span><span>{detail.passport_expiry || '—'}</span>
                {detail.ticket_type === 'flight' && (
                  <>
                    <span className="text-gray-500">PNR:</span><span className="font-mono">{detail.pnr || '—'}</span>
                    <span className="text-gray-500">Airline:</span><span>{detail.airline || '—'}</span>
                    <span className="text-gray-500">Travel Date:</span><span>{detail.flight_date || '—'}</span>
                    <span className="text-gray-500">Sector:</span><span>{detail.sector || '—'}</span>
                  </>
                )}
                {detail.ticket_type === 'visa' && (
                  <>
                    <span className="text-gray-500">Country:</span><span>{detail.country || '—'}</span>
                    <span className="text-gray-500">Visa Type:</span><span className="capitalize">{detail.visa_type || '—'}</span>
                  </>
                )}
                {detail.ticket_type === 'umrah' && (
                  <>
                    <span className="text-gray-500">Package:</span><span className="capitalize">{detail.package || '—'}</span>
                    <span className="text-gray-500">Stay Date:</span><span>{detail.stay_date || '—'}</span>
                    <span className="text-gray-500">Makkah Hotel:</span><span>{detail.makkah_hotel || '—'}</span>
                    <span className="text-gray-500">Madina Hotel:</span><span>{detail.madina_hotel || '—'}</span>
                  </>
                )}
                <span className="text-gray-500">Status:</span><span>{detail.status}</span>
              </div>
              <hr className="my-3" />
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-500">Vendor Cost:</span><span className="font-medium text-red-600">{fmt(detail.vendor_cost_pkr)}</span>
                <span className="text-gray-500">Ticket Price:</span><span className="font-medium text-emerald-600">{fmt(detail.ticket_price_pkr)}</span>
                <span className="text-gray-500">Profit:</span><span className={`font-bold text-lg ${detail.profit_pkr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(detail.profit_pkr)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-3">Posted by {detail.created_by_name} on {new Date(detail.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
