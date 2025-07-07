import React from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLogin from '@/admin/AdminLogin';
import AdminDashboard from '@/admin/AdminDashboard';


const Admin: React.FC = () => {
  const { settings, login } = useAdmin();

  if (!settings.isLoggedIn) {
    return <AdminLogin onLogin={login} />;
  }

  return <AdminDashboard />;
};

export default Admin;