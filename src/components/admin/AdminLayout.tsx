import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../utils/adminUtils';
import './AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { userData } = useAuth();

  if (!isAdmin(userData)) {
    return (
      <div className="admin-access-denied">
        <h2>접근 권한이 없습니다</h2>
        <p>관리자 권한이 필요한 페이지입니다.</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div className="admin-header">
        <h1>관리자 페이지</h1>
        <p>관리자: {userData?.name} ({userData?.nickname})</p>
      </div>

      <div className="admin-container admin-container-single">
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
