// @ts-nocheck
import { CheckCircleOutlined, ExclamationCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import { login } from '@app/providers/reducer/auth/authSlice'
import { LoginImg } from '@assets/images'
import axiosInstance from '@shared/config/axios'
import { ACCESS_TOKEN } from '@shared/lib/constants/auth'
import { Button, Col, Form, Input, Row, Space, Typography } from 'antd'
import { jwtDecode } from 'jwt-decode'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const LoginPage = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState({})
  const [loginSuccess, setLoginSuccess] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const getUserData = token => {
    try {
      return token ? jwtDecode(token) : null
    } catch (error) {
      console.error('Error decoding token:', error)
      return null
    }
  }

  const onFinish = async values => {
    setLoading(true)
    setLoginError({})
    setLoginSuccess('')

    try {
      const response = await axiosInstance.post('/users/login', {
        email: values.email.toLowerCase(),
        password: values.password
      })

      if (response.data?.data?.access_token) {
        const token = response.data.data.access_token

        localStorage.setItem(ACCESS_TOKEN, token)
        const userData = getUserData(token)

        if (userData) {
          dispatch(login(userData))
          setLoginSuccess('Login successful!')
          navigate('/')
        } else {
          setLoginError('Invalid token received')
        }
      } else {
        setLoginError('Login failed. Please try again.')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.'
      if (message.toLowerCase().includes('email')) {
        setLoginError({ email: message })
      } else if (message.toLowerCase().includes('password')) {
        setLoginError({ password: message })
      } else {
        setLoginError({ general: message })
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = () => {
    setLoginError({})
    setPasswordTouched(true)
  }

  const password = Form.useWatch('password', form)
  const showPasswordError = passwordTouched && !password
  const hasPasswordError = showPasswordError || Boolean(loginError.password)

  return (
    <Row className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(0,48,135,0.14),_transparent_24%),linear-gradient(135deg,_#f7fbff_0%,_#eef4ff_46%,_#f9fbff_100%)]">
      <Col
        xs={24}
        md={11}
        xl={10}
        className="relative flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14"
      >
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle,_rgba(56,189,248,0.15),_transparent_62%)]" />
        <div className="mx-auto w-full max-w-[460px] py-4 sm:py-8">
          <Space direction="vertical" size={24} className="w-full">
            <div className="inline-flex w-fit rounded-full bg-[#003087]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#003087]">
              Student portal
            </div>

            <Space direction="vertical" size={10}>
              <Title level={1} className="!m-0 !text-3xl !font-semibold !leading-tight !text-slate-900 sm:!text-4xl">
                Dang nhap de tiep tuc hanh trinh hoc cung GreenPREP
              </Title>
              <Text className="!text-base !leading-7 !text-slate-500">
                Mot man dang nhap sang sua hon, de tap trung hon va giu moi thao tac quan trong trong tam mat.
              </Text>
            </Space>

            <Form
              form={form}
              name="login"
              layout="vertical"
              onFinish={onFinish}
              autoComplete="on"
              requiredMark={false}
              className="bg-white/86 flex flex-col gap-4 rounded-[28px] border border-white/70 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.10)] backdrop-blur sm:gap-5 sm:p-7"
            >
              <div className="space-y-1">
                <Title level={2} className="!m-0 !text-xl !font-semibold !text-slate-900 sm:!text-2xl">
                  Sign in
                </Title>
                <Text className="!text-sm !text-slate-500">
                  Use your email and password to open your learning dashboard.
                </Text>
              </div>

              <div>
                <Form.Item
                  label={
                    <Text strong className="!text-sm !text-slate-700">
                      Email <span className="text-red-500">*</span>
                    </Text>
                  }
                  name="email"
                  rules={[
                    {
                      required: true,
                      message: 'Email is required'
                    },
                    {
                      type: 'email',
                      message: 'Please enter a valid email'
                    }
                  ]}
                  className="!mb-1"
                >
                  <Input
                    placeholder="Enter your email"
                    className="!h-12 !rounded-2xl !border !border-slate-200 !bg-slate-50 !px-4 !py-2.5 !text-base"
                  />
                </Form.Item>
                {loginError.email && (
                  <Text type="danger" className="!text-sm">
                    {loginError.email}
                  </Text>
                )}
              </div>

              <div className="space-y-1">
                <Form.Item
                  label={
                    <Text strong className="!text-sm !text-slate-700">
                      Password <span className="text-red-500">*</span>
                    </Text>
                  }
                  name="password"
                  rules={[
                    {
                      required: true,
                      message: 'Password is required'
                    }
                  ]}
                  className="!mb-0"
                  validateStatus={hasPasswordError ? 'error' : loginSuccess ? 'success' : ''}
                >
                  <Input.Password
                    placeholder="********"
                    onChange={handlePasswordChange}
                    className={`!h-12 !rounded-2xl !border !bg-slate-50 !px-4 !py-2.5 !text-base ${
                      hasPasswordError ? '!border-red-500' : loginSuccess ? '!border-green-500' : '!border-slate-200'
                    }`}
                    iconRender={visible =>
                      visible ? (
                        <EyeOutlined className="text-gray-400" />
                      ) : (
                        <EyeInvisibleOutlined className="text-gray-400" />
                      )
                    }
                    suffix={
                      hasPasswordError ? (
                        <ExclamationCircleOutlined className="text-red-500" />
                      ) : loginSuccess ? (
                        <CheckCircleOutlined className="text-green-500" />
                      ) : null
                    }
                  />
                </Form.Item>

                {showPasswordError && !loginError.password && (
                  <Text type="danger" className="!text-sm">
                    Password is required
                  </Text>
                )}
                {loginError.password && (
                  <Text type="danger" className="!text-sm">
                    {loginError.password}
                  </Text>
                )}
                {loginError.general && (
                  <Text type="danger" className="!text-sm">
                    {loginError.general}
                  </Text>
                )}

                {loginSuccess && (
                  <Space size={4} className="!text-sm !text-green-500">
                    <CheckCircleOutlined />
                    <Text type="success" className="!text-sm">
                      {loginSuccess}
                    </Text>
                  </Space>
                )}
              </div>

              <div className="mb-0 flex justify-end sm:mb-0.5">
                <Link to="/forgot-password" className="!text-sm !text-[#003087] hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Form.Item className="!mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="!h-12 !w-full !rounded-2xl !bg-[#003087] !text-base !font-semibold shadow-[0_18px_40px_rgba(0,48,135,0.22)] hover:!bg-blue-900"
                >
                  Sign in
                </Button>
              </Form.Item>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-left">
                <Text className="!text-sm !text-slate-500">
                  Don&apos;t have an account?{' '}
                  <Link to="/register" className="!text-[#003087] hover:underline">
                    Sign up
                  </Link>
                </Text>
              </div>
            </Form>
          </Space>
        </div>
      </Col>

      <Col xs={0} md={13} xl={14} className="relative hidden md:block">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,_#003087_0%,_#0f4db8_52%,_#38bdf8_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.15),_transparent_26%)]" />
        <div className="relative flex h-full items-center justify-center px-8 py-10 xl:px-14">
          <div className="border-white/18 w-full max-w-[720px] rounded-[32px] border bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="mb-6 max-w-[460px]">
              <Text className="!mb-3 !block !text-sm !font-medium !uppercase !tracking-[0.22em] !text-white/75">
                Learn with confidence
              </Text>
              <Title level={2} className="!mb-3 !text-[34px] !font-semibold !leading-tight !text-white">
                Moi buoi hoc bat dau tu mot diem cham don gian, ro rang va dang tin cay.
              </Title>
              <Text className="!text-base !leading-7 !text-white/80">
                Giao dien moi giup hoc vien tap trung vao viec dang nhap, khoi phuc mat khau va tiep tuc hoc ma khong bi
                roi mat.
              </Text>
            </div>
            <div className="overflow-hidden rounded-[24px] bg-white/95 p-4">
              <img src={LoginImg} alt="Login Security Illustration" className="h-auto w-full object-contain" />
            </div>
          </div>
        </div>
      </Col>
    </Row>
  )
}

export default LoginPage
