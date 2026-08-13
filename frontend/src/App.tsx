import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TicketPostingPage from './pages/TicketPostingPage';
import CustomerLedgerPage from './pages/CustomerLedgerPage';
import VendorLedgerPage from './pages/VendorLedgerPage';
import AdminPanelPage from './pages/AdminPanelPage';
import BankPage from './pages/BankPage';
import CashPage from './pages/CashPage';

function Protected({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  return isAuth ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<DashboardPage />} />
          <Route path="tickets" element={<TicketPostingPage />} />
          <Route path="customer-ledger" element={<CustomerLedgerPage />} />
          <Route path="vendor-ledger" element={<VendorLedgerPage />} />
          <Route path="admin" element={<AdminPanelPage />} />
          <Route path="bank" element={<BankPage />} />
          <Route path="cash" element={<CashPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
