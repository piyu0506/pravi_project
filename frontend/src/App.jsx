import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { NotificationProvider } from './context/NotificationContext';
import { RoleProvider, useRole } from './context/RoleContext';
import AssetDetail from './pages/AssetDetail';
import AssetNew from './pages/AssetNew';
import Assets from './pages/Assets';
import Dashboard from './pages/Dashboard';
import Dependencies from './pages/Dependencies';
import Retirement from './pages/Retirement';

function Guard({ permission, children }) {
  const { can } = useRole();
  if (!can(permission)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Guard permission="viewAssets"><Assets /></Guard>} />
        <Route path="/assets/new" element={<Guard permission="assetCrud"><AssetNew /></Guard>} />
        <Route path="/assets/:id" element={<Guard permission="viewAssets"><AssetDetail /></Guard>} />
        <Route path="/dependencies" element={<Guard permission="viewDependencies"><Dependencies /></Guard>} />
        <Route path="/retirement" element={<Guard permission="viewRetirement"><Retirement /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotificationProvider>
    </RoleProvider>
  );
}
