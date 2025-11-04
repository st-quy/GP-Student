import { EMAIL_REG, PHONE_REG } from '@shared/lib/constants/reg'
import { Button, Form, Input, Modal } from 'antd'
import { useEffect } from 'react'

const EditProfileModal = ({ open, onCancel, onSave, formData, setFormData }) => {
  const [form] = Form.useForm()

  useEffect(() => {
    form.setFieldsValue(formData)
  }, [formData, form])

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields()
      const updatedData = { ...formData, ...values }
      onSave(updatedData)
    } catch {
      return null
    }
  }

  return (
    <Modal
      title={<div className="text-center text-2xl font-semibold">Update Profile</div>}
      open={open}
      onCancel={onCancel}
      footer={
        <div className="flex justify-end space-x-4">
          <Button onClick={onCancel} className="h-10 w-24 border border-gray-300 text-gray-700">
            Cancel
          </Button>
          <Button type="primary" onClick={handleUpdate} className="h-10 w-24 bg-[#003087] hover:bg-[#003087]/90">
            Update
          </Button>
        </div>
      }
      width={500}
      maskClosable={false}
    >
      <Form form={form} layout="vertical" initialValues={formData} className="px-4">
        <Form.Item
          label={
            <span>
              First Name<span style={{ color: 'red' }}> *</span>
            </span>
          }
          name="firstName"
          rules={[{ required: true, message: 'First name is required' }]}
        >
          <Input
            value={formData.firstName}
            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Enter first name"
          />
        </Form.Item>

        <Form.Item
          label={
            <span>
              Last Name<span style={{ color: 'red' }}> *</span>
            </span>
          }
          name="lastName"
          rules={[{ required: true, message: 'Last name is required' }]}
        >
          <Input
            value={formData.lastName}
            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Enter last name"
          />
        </Form.Item>

        <Form.Item
          label={
            <span>
              Email<span style={{ color: 'red' }}> *</span>
            </span>
          }
          name="email"
          rules={[
            { required: true, message: 'Email is required' },
            { pattern: EMAIL_REG, message: 'Invalid email format' }
          ]}
        >
          <Input
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email"
          />
        </Form.Item>

        <Form.Item
          label={
            <span>
              Phone Number<span style={{ color: 'red' }}> *</span>
            </span>
          }
          name="phone"
          rules={[
            { required: true, message: 'Phone number is required' },
            { pattern: PHONE_REG, message: 'Phone number must be 9–10 digits' }
          ]}
        >
          <Input
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
          />
        </Form.Item>

        <Form.Item
          label={
            <span>
              Address<span style={{ color: 'red' }}> *</span>
            </span>
          }
          name="address"
          rules={[{ required: true, message: 'Address is required' }]}
        >
          <Input
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            placeholder="Enter address"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default EditProfileModal
