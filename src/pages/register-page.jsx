import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import {
  getRegisterErrorMessage,
  isValidVietnamesePhoneNumber,
  sanitizePhoneNumber
} from '@features/auth/model'
import { EMAIL_REG, PASSWORD_RULES } from '@shared/lib/constants/reg'
import { useRegister } from '@shared/lib/hooks/useAuthUsers'
import { Form, Input, Button, Typography, Space, Row, Col, message } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import RegisterImg from '../assets/images/register.png'

const { Title, Text } = Typography

const RegisterPage = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    class: '',
    studentCode: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })

  const { mutate: registerUser, isPending } = useRegister({
    onSuccess: response => {
      message.success(response.data.message)
      navigate('/login')
    },
    onError: error => {
      message.error(getRegisterErrorMessage(error))
    }
  })

  const handleFormChange = changedFields => {
    setFormValues(prevValues => ({
      ...prevValues,
      ...changedFields
    }))

    const fieldName = Object.keys(changedFields)[0]
    const fieldValue = changedFields[fieldName]

    const optionalFields = ['class', 'phone']
    if (optionalFields.includes(fieldName) && !fieldValue) {
      return
    }

    if (fieldName === 'phone') {
      return
    }

    form.validateFields([fieldName])
  }

  const validatePhoneNumber = (_, value) => {
    const sanitizedValue = sanitizePhoneNumber(value)

    if (!sanitizedValue) {
      return Promise.resolve()
    }

    if (sanitizedValue.length < 10) {
      return Promise.reject(new Error('Phone number must be at least 10 digits and start with 0'))
    }

    if (!isValidVietnamesePhoneNumber(sanitizedValue)) {
      return Promise.reject(new Error('Invalid phone number format'))
    }

    return Promise.resolve()
  }

  const onFinish = () => {
    const currentValues = form.getFieldsValue()
    const sanitizedPhone = sanitizePhoneNumber(currentValues.phone)

    if (sanitizedPhone && !isValidVietnamesePhoneNumber(sanitizedPhone)) {
      const phoneError = 'Invalid phone number format'
      form.setFields([
        {
          name: 'phone',
          errors: [phoneError]
        }
      ])
      message.error(phoneError)
      return
    }

    // Keep the submit payload aligned with the API contract while using the latest form state.
    const registerData = {
      firstName: currentValues.firstName,
      lastName: currentValues.lastName,
      email: currentValues.email.toLowerCase(),
      class: currentValues.class,
      studentCode: currentValues.studentCode,
      phone: sanitizedPhone,
      password: currentValues.password
    }
    // @ts-ignore - The type is defined in the hook's JSDoc
    registerUser(registerData)
  }

  return (
    <Row className="min-h-screen bg-white">
      <Col xs={24} md={12} className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="mx-auto w-full max-w-[600px] py-8 sm:py-12">
          <Space direction="vertical" size={24} className="w-full">
            <Title level={4} className="!m-0 !text-xl !text-[#003087] sm:!text-2xl">
              GreenPREP
            </Title>

            <Space direction="vertical" size={8}>
              <Title level={2} className="!m-0 !text-xl !font-semibold !text-black sm:!text-2xl">
                Sign up
              </Title>
              <Text className="!text-sm !text-gray-500">
                Let&apos;s get you all set up so you can access your personal account.
              </Text>
            </Space>

            <Form
              form={form}
              name="register"
              layout="vertical"
              onFinish={onFinish}
              onFinishFailed={({ errorFields }) => {
                const phoneFieldError = errorFields.find(field => field.name?.[0] === 'phone')?.errors?.[0]

                if (phoneFieldError) {
                  message.error(phoneFieldError)
                }
              }}
              onValuesChange={handleFormChange}
              initialValues={formValues}
              autoComplete="off"
              requiredMark={false}
              className="flex flex-col gap-4 sm:gap-5"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Text strong className="!text-sm">
                        First Name <span className="text-red-500">*</span>
                      </Text>
                    }
                    name="firstName"
                    rules={[
                      { required: true, message: 'First name is required' },
                      { min: 2, message: 'At least 2 characters' },
                      { max: 50, message: 'Cannot exceed 50 characters' },
                      { pattern: /^[A-Za-z\s]+$/, message: 'Only alphabetic characters are allowed' }
                    ]}
                    hasFeedback
                    className="!mb-1"
                  >
                    <Input
                      placeholder="First Name"
                      className="!h-11 !rounded-md !border !bg-gray-50 !px-4 !py-2.5 !text-base"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Text strong className="!text-sm">
                        Last Name <span className="text-red-500">*</span>
                      </Text>
                    }
                    name="lastName"
                    rules={[
                      { required: true, message: 'Last name is required' },
                      { min: 2, message: 'At least 2 characters' },
                      { max: 50, message: 'Cannot exceed 50 characters' },
                      { pattern: /^[A-Za-z\s]+$/, message: 'Only alphabetic characters are allowed' }
                    ]}
                    hasFeedback
                    className="!mb-1"
                  >
                    <Input
                      placeholder="Last Name"
                      className="!h-11 !rounded-md !border !bg-gray-50 !px-4 !py-2.5 !text-base"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Text strong className="!text-sm">
                        Email <span className="text-red-500">*</span>
                      </Text>
                    }
                    name="email"
                    rules={[
                      { required: true, message: 'Email is required' },
                      { max: 254, message: 'Email cannot exceed 254 characters' },
                      { pattern: EMAIL_REG, message: 'Please enter a valid email' }
                    ]}
                    hasFeedback
                    className="!mb-1"
                  >
                    <Input
                      placeholder="Email"
                      className="!h-11 !rounded-md !border !bg-gray-50 !px-4 !py-2.5 !text-base"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Text strong className="!text-sm">
                        Class Name
                      </Text>
                    }
                    name="class"
                    rules={[
                      { max: 20, message: 'Cannot exceed 20 characters' },
                      { pattern: /^[A-Za-z0-9\s-]*$/, message: 'Only alphanumeric characters, spaces and hyphens are allowed' }
                    ]}
                    hasFeedback={!!formValues.class}
                    className="!mb-1"
                  >
                    <Input
                      placeholder="GWxxxxx"
                      className="!h-11 !rounded-md !border !bg-gray-50 !px-4 !py-2.5 !text-base"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Text strong className="!text-sm">
                        Student ID <span className="text-red-500">*</span>
                      </Text>
                    }
                    name="studentCode"
                    rules={[
                      { required: true, message: 'Student ID is required' },
                      { max: 20, message: 'Cannot exceed 20 characters' },
                      { pattern: /^[A-Za-z0-9]+$/, message: 'Only alphanumeric characters are allowed' }
                    ]}
                    hasFeedback
                    className="!mb-1"
                  >
                    <Input
                      placeholder="GCDxxxx"
                      className="!h-11 !rounded-md !border !bg-gray-50 !px-4 !py-2.5 !text-base"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Text strong className="!text-sm">
                        Phone Number
                      </Text>
                    }
                    name="phone"
                    validateTrigger="onBlur"
                    rules={[
                      { validator: validatePhoneNumber }
                    ]}
                    hasFeedback={!!formValues.phone}
                    className="!mb-1"
                  >
                    <Input
                      placeholder="Phone Number"
                      inputMode="numeric"
                      maxLength={10}
                      onChange={e => {
                        const numericValue = sanitizePhoneNumber(e.target.value).slice(0, 10)
                        form.setFieldValue('phone', numericValue)
                        setFormValues(prevValues => ({
                          ...prevValues,
                          phone: numericValue
                        }))

                        if (numericValue.length < 10) {
                          form.setFields([
                            {
                              name: 'phone',
                              errors: []
                            }
                          ])
                          return
                        }

                        form.validateFields(['phone']).catch(() => {})
                      }}
                      className="!h-11 !rounded-md !border !border-gray-200 !bg-gray-50 !px-4 !py-2.5 !text-base"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Text strong className="!text-sm">
                        Password <span className="text-red-500">*</span>
                      </Text>
                    }
                    name="password"
                    rules={[
                      { required: true, message: 'Password is required' },
                      {
                        validator: (_, value) => {
                          if (!value) {
                            return Promise.resolve()
                          }
                          const failedRules = PASSWORD_RULES.filter(rule => !rule.regex.test(value))
                          if (failedRules.length > 0) {
                            const messages = failedRules.map(rule => `• ${rule.message}`).join('\n')
                            return Promise.reject(new Error(messages))
                          }
                          return Promise.resolve()
                        }
                      }
                    ]}
                    hasFeedback
                    className="!mb-1"
                  >
                    <Input.Password
                      placeholder="••••••••••"
                      className="!h-11 !rounded-md !border !bg-gray-50 !px-4 !py-2.5 !text-base"
                      iconRender={visible =>
                        visible ? (
                          <EyeOutlined className="text-gray-400" />
                        ) : (
                          <EyeInvisibleOutlined className="text-gray-400" />
                        )
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <Text strong className="!text-sm">
                        Confirm Password <span className="text-red-500">*</span>
                      </Text>
                    }
                    name="confirmPassword"
                    rules={[
                      { required: true, message: 'Please confirm your password' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve()
                          }
                          return Promise.reject(new Error('The two passwords do not match'))
                        }
                      })
                    ]}
                    hasFeedback
                    className="!mb-1"
                  >
                    <Input.Password
                      placeholder="••••••••••"
                      className="!h-11 !rounded-md !border !bg-gray-50 !px-4 !py-2.5 !text-base"
                      iconRender={visible =>
                        visible ? (
                          <EyeOutlined className="text-gray-400" />
                        ) : (
                          <EyeInvisibleOutlined className="text-gray-400" />
                        )
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item className="!mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isPending}
                  className="!h-11 !w-full !rounded-md !bg-[#003087] !text-base !font-medium hover:!bg-blue-900"
                >
                  Sign up
                </Button>
              </Form.Item>

              <div className="text-left">
                <Text className="!text-sm !text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="!text-[#003087] hover:underline">
                    Sign in
                  </Link>
                </Text>
              </div>
            </Form>
          </Space>
        </div>
      </Col>

      <Col xs={0} md={12} className="bg-white-50 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="mx-auto w-full max-w-[640px] px-8 sm:px-12">
            <img src={RegisterImg} alt="Register Security Illustration" className="h-auto w-full object-contain" />
          </div>
        </div>
      </Col>
    </Row>
  )
}

export default RegisterPage
