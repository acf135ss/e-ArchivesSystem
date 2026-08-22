import { useMemo, useState } from 'react';
import { Button, Layout, Menu, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  KeyOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import ChangePasswordModal from './ChangePasswordModal';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [pwdOpen, setPwdOpen] = useState(false);

  const menuItems = useMemo(
    () => [
      { key: '/', icon: <DashboardOutlined />, label: '首页概览' },
      { key: '/archives', icon: <FileTextOutlined />, label: '档案管理' },
      { key: '/categories', icon: <AppstoreOutlined />, label: '分类管理' },
      { key: '/protection', icon: <SafetyOutlined />, label: '隐私防护' },
    ],
    [],
  );

  const selectedKey =
    location.pathname === '/' ? '/' : '/' + (location.pathname.split('/')[1] || '');

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          电子档案系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            {user?.real_name || user?.username}
          </Typography.Title>
          <Space>
            <Button icon={<KeyOutlined />} onClick={() => setPwdOpen(true)}>
              修改密码
            </Button>
            <Button icon={<LogoutOutlined />} onClick={onLogout}>
              退出登录
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </Layout>
  );
}
