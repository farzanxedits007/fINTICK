import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useEffect } from 'react';
import { LayoutDashboard, Ticket, BookOpen, Truck, Settings, Landmark, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/tickets', icon: Ticket, label: 'Ticket Posting' },
  { to: '/customer-ledger', icon: BookOpen, label: 'Customer Ledger' },
  { to: '/vendor-ledger', icon: Truck, label: 'Vendor Ledger' },
  { to: '/bank', icon: Landmark, label: 'Bank' },
  { to: '/admin', icon: Settings, label: 'Admin Panel' },
];

export default function Layout() {
  const { user, logout, loadUser } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => { loadUser(); }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-emerald-400">FinTick</h1>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="mt-6 px-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <button className="lg:hidden text-gray-500" onClick={() => setOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.full_name || user?.username}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-gray-400 hover:text-red-500" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
