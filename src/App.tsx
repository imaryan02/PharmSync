/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { StoreProvider } from './store/useStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './hooks/useToast';
import AppLayout from './components/AppLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Stores from './pages/Stores';
import CreateStore from './pages/CreateStore';
import Medicines from './pages/Medicines';
import AddMedicine from './pages/AddMedicine';
import StockEntry from './pages/StockEntry';
import Inventory from './pages/Inventory';
import CreateOrder from './pages/CreateOrder';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import RefundOrder from './pages/RefundOrder';
import StockAdjustments from './pages/StockAdjustments';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
import EditStore from './pages/EditStore';
import EditMedicine from './pages/EditMedicine';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ToastProvider>
          <Router>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/stores" element={<Stores />} />
                <Route path="/stores/new" element={<CreateStore />} />
                <Route path="/stores/:id/edit" element={<EditStore />} />
              <Route path="/medicines" element={<Medicines />} />
              <Route path="/medicines/new" element={<AddMedicine />} />
              <Route path="/medicines/:id/edit" element={<EditMedicine />} />
              <Route path="/stock-entry" element={<StockEntry />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/new" element={<CreateOrder />} />
              <Route path="/orders/:id" element={<OrderDetails />} />
              <Route path="/orders/:id/refund" element={<RefundOrder />} />
              <Route path="/stock-adjustments" element={<StockAdjustments />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/analytics" element={<Analytics />} />
              </Route>
            </Route>
          </Routes>
        </Router>
        </ToastProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
