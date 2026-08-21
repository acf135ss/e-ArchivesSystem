import { Form, Input, Modal, message } from 'antd';
import { changePassword } from '../api/auth';
import { useAuthStore } from '../store/auth';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const logout = useAuthStore((s) => s.logout);

  const handleOk = async () => {
    let values: { old_password: string; new_password: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      await changePassword(values.old_password, values.new_password);
      message.success('密码修改成功，请重新登录');
      form.resetFields();
      onClose();
      logout();
      window.location.href = '/login';
    } catch (err: any) {
      message.error(err.response?.data?.detail || '修改失败');
    }
  };

  return (
    <Modal
      title="修改密码"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="确认修改"
      cancelText="取消"
      width={420}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="old_password"
          label="原密码"
          rules={[{ required: true, message: '请输入原密码' }]}
        >
          <Input.Password placeholder="请输入原密码" />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少 6 位' },
          ]}
        >
          <Input.Password placeholder="请输入新密码（至少 6 位）" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="确认新密码"
          dependencies={['new_password']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
