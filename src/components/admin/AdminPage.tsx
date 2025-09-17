import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import UserManagement from './UserManagement';
import SalesManagement from './SalesManagement';
import PointManagement from './PointManagement';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'sales' | 'points'>('users');

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'sales':
        return <SalesManagement />;
      case 'points':
        return <PointManagement />;
    }
  };

  return (
    <AdminLayout>
      <div className="admin-tabs">
        <button 
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 회원관리
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          💰 매출관리
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'points' ? 'active' : ''}`}
          onClick={() => setActiveTab('points')}
        >
          🎯 포인트관리
        </button>
      </div>
      <div className="admin-tab-panel">
        {renderContent()}
      </div>
    </AdminLayout>
  );
};

export default AdminPage;
