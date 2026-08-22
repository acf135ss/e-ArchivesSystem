import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import ArchiveList from './pages/archive';
import CategoryPage from './pages/category';
import ProtectionPage from './pages/protection';
import RequireAuth from './components/RequireAuth';
import AppLayout from './components/AppLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/archives" element={<ArchiveList />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/protection" element={<ProtectionPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
