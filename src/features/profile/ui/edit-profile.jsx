import { EMAIL_REG } from '@shared/lib/constants/reg'
import { Button, Form, Input, Modal } from 'antd'
import { useEffect } from 'react'

const EditProfileModal = ({ open, onCancel, onSave, formData, setFormData }) => {
  const [form] = Form.useForm()

  // BUG_PROFILE_013: Reset form khi đóng/mở modal
  useEffect(() => {
    if (open) {
      form.setFieldsValue(formData)
    } else {
      form.resetFields()
    }
  }, [open, formData, form])

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title={<div className="text-center text-2xl font-semibold">Update Profile</div>}
      open={open}
      onCancel={handleCancel}
      footer={
        <div className="flex justify-end space-x-4">
          <Button key="cancel" onClick={handleCancel} className="h-10 w-24 border border-[#D1D5DB] text-[#374151]">
            Cancel
          </Button>
          <Button
            key="submit"
            type="primary"
            onClick={() => {
              form.validateFields().then(values => {
                // Trim all string fields before saving
                const trimmedValues = {
                  firstName: values.firstName?.trim(),
                  lastName: values.lastName?.trim(),
                  email: values.email?.trim(),
                  phone: values.phone?.trim(),
                  address: values.address?.trim()
                }
                onSave(trimmedValues)
              })
            }}
            className="h-10 w-24 bg-[#003087] hover:bg-[#003087]/90"
          >
            Update
          </Button>
        </div>
      }
      width={500}
      maskClosable={false}
      className="edit-profile-modal"
    >
      <Form form={form} layout="vertical" initialValues={formData} className="px-4">
        <div className="flex gap-4">
          <Form.Item
            label={<span>First Name</span>}
            name="firstName"
            rules={[
              { required: true, message: 'First name is required' },
              { max: 50, message: 'First name must not exceed 50 characters' },
              {
                validator: (_, value) => {
                  if (value && value.trim().length === 0) {
                    return Promise.reject('First name cannot be only spaces')
                  }
                  return Promise.resolve()
                }
              }
            ]}
            className="flex-1"
            hasFeedback
          >
            <Input
              maxLength={50}
              className="h-11 rounded-lg border-[#D1D5DB] bg-[#F9FAFB] px-3"
              placeholder="Enter first name"
            />
          </Form.Item>

          <Form.Item
            label={<span>Last Name</span>}
            name="lastName"
            rules={[
              { required: true, message: 'Last name is required' },
              { max: 50, message: 'Last name must not exceed 50 characters' },
              {
                validator: (_, value) => {
                  if (value && value.trim().length === 0) {
                    return Promise.reject('Last name cannot be only spaces')
                  }
                  return Promise.resolve()
                }
              }
            ]}
            className="flex-1"
            hasFeedback
          >
            <Input
              maxLength={50}
              className="h-11 rounded-lg border-[#D1D5DB] bg-[#F9FAFB] px-3"
              placeholder="Enter last name"
            />
          </Form.Item>
        </div>

        <Form.Item
          label={<span>Email</span>}
          name="email"
          rules={[
            { required: true, message: 'Email is required' },
            { max: 100, message: 'Email must not exceed 100 characters' },
            { pattern: EMAIL_REG, message: 'Invalid email format' }
          ]}
          hasFeedback
        >
          <Input
            maxLength={100}
            className="h-11 rounded-lg border-[#D1D5DB] bg-[#F9FAFB] px-3"
            placeholder="Enter email"
          />
        </Form.Item>

        <Form.Item
          label="Phone Number"
          name="phone"
          rules={[
            {
              required: true,
              message: 'Phone number is required'
            },
            {
              pattern: /^\d+$/,
              message: 'Phone number must contain only digits'
            },
            {
              min: 9,
              message: 'Phone number must be at least 9 digits'
            },
            {
              max: 20,
              message: 'Phone number must not exceed 20 digits'
            }
          ]}
          hasFeedback
        >
          <Input
            maxLength={20}
            className="h-11 rounded-lg border-[#D1D5DB] bg-[#F9FAFB] px-3"
            placeholder="Enter phone number"
            onKeyDown={e => {
              // BUG_PROFILE_009: Chỉ cho nhập số, backspace, delete, arrow keys, tab
              if (
                !/[0-9]/.test(e.key) &&
                !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key) &&
                !e.ctrlKey &&
                !e.metaKey
              ) {
                e.preventDefault()
              }
            }}
            onPaste={e => {
              const pastedText = e.clipboardData.getData('text')
              if (!/^\d+$/.test(pastedText)) {
                e.preventDefault()
              }
            }}
          />
        </Form.Item>
        <Form.Item
          label="Address"
          name="address"
          rules={[
            { required: true, message: 'Address is required' },
            { max: 200, message: 'Address must not exceed 200 characters' },
            {
              validator: (_, value) => {
                if (value && value.trim().length === 0) {
                  return Promise.reject('Address cannot be only spaces')
                }
                return Promise.resolve()
              }
            }
          ]}
          hasFeedback
        >
          <Input
            maxLength={200}
            className="h-11 rounded-lg border-[#D1D5DB] bg-[#F9FAFB] px-3"
            placeholder="Enter your address"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default EditProfileModal
