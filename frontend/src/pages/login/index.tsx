import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Space, message } from 'antd';
import { UserOutlined, LockOutlined, IdcardOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../../api/auth';
import { useAuthStore } from '../../store/auth';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const onFinish = async (values: any) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res =
        mode === 'login'
          ? await login(values.username, values.password)
          : await register(values.username, values.password, values.real_name);
      setAuth(res.access_token, res.user);
      message.success(mode === 'login' ? '登录成功' : '注册成功');
      navigate('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail || '操作失败，请稍后重试';
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setErrorMsg('');
    form.resetFields();
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f7f8fa 0%, #eef0f3 100%)',
      }}
    >
      <Card
        style={{ width: 380, boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)' }}
        title="电子档案系统"
      >
        {errorMsg && (
          <Alert
            type="error"
            message={errorMsg}
            showIcon
            closable
            onClose={() => setErrorMsg('')}
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={form} onFinish={onFinish} size="large">
          {mode === 'register' && (
            <Form.Item name="real_name">
              <Input prefix={<IdcardOutlined />} placeholder="真实姓名（可选）" />
            </Form.Item>
          )}
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少 3 个字符' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {mode === 'login' ? '登录' : '注册'}
            </Button>
          </Form.Item>
        </Form>
        <Space style={{ width: '100%', justifyContent: 'center' }}>
          {mode === 'login' ? (
            <>
              <span style={{ color: '#999' }}>还没有账号？</span>
              <Button type="link" onClick={() => switchMode('register')}>
                立即注册
              </Button>
            </>
          ) : (
            <>
              <span style={{ color: '#999' }}>已有账号？</span>
              <Button type="link" onClick={() => switchMode('login')}>
                返回登录
              </Button>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}
