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
      <div className="admin-page">
        <div className="admin-container">
          <div className="table-header">
            <h2>접근 권한이 없습니다</h2>
            <p className="table-header-description">관리자 권한이 필요한 페이지입니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="table-header">
          <h2>관리자 페이지</h2>
          <p className="table-header-description">관리자: {userData?.name} ({userData?.nickname})</p>
        </div>

        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
