import { CameraOutlined, LeftOutlined } from '@ant-design/icons'
import { useChangeUserPassword, useUpdateUserProfile, useUserProfile } from '@features/profile/hooks/useProfile'
import ChangePasswordModal from '@features/profile/ui/change-password-profile'
import EditProfileModal from '@features/profile/ui/edit-profile'
import { EMAIL_REG, PHONE_REG } from '@shared/lib/constants/reg'
import SharedHeader from '@shared/ui/base-header'
import defaultAvatar from '@assets/images/avatar.png'
import { Avatar, Button, Card, message, Spin } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import * as Yup from 'yup'

import StudentHistory from './student-history'

const profileValidationSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().matches(EMAIL_REG, 'Invalid email format').required('Email is required'),
  phone: Yup.string()
    .matches(PHONE_REG, { message: 'Invalid phone number format' })
    .required('Phone number is required')
})

const Profile = () => {
  const navigate = useNavigate()
  // @ts-ignore
  const auth = useSelector(state => state.auth)
  const { data: userData, isLoading, isError, refetch } = useUserProfile(auth.user?.userId)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const updateProfileMutation = useUpdateUserProfile()
  const changePasswordMutation = useChangeUserPassword()
  const fileInputRef = useRef(null)
  const [avatar, setAvatar] = useState(defaultAvatar)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  })

  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || ''
      })
    }
  }, [userData])

  const handleEdit = () => {
    setFormData({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      address: userData.address || ''
    })
    setIsEditModalOpen(true)
  }

  const handleCancelEdit = () => {
    setFormData({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      address: userData.address || ''
    })
    setIsEditModalOpen(false)
  }

  const handleSave = async () => {
    try {
      if (formData.phone.length < 10 || formData.phone.length > 10) {
        message.error('Phone number must have 10 digits')
        return
      }
      await profileValidationSchema.validate(formData, { abortEarly: false })

      await updateProfileMutation.mutateAsync({
        userId: auth.user?.userId,
        userData: formData
      })

      message.success('Profile updated successfully!')
      refetch()
      setIsEditModalOpen(false)
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || 'Failed to update profile')
      } else if (error.inner) {
        error.inner.forEach(err => {
          message.error(err.message)
        })
      } else {
        message.error('Failed to update profile')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  if (isError) {
    message.error('Unable to load profile information. Please try again later.')
    return null
  }

  const openChangePassword = () => {
    setIsPasswordModalOpen(true)
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = event => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        message.error('Image size should be less than 2MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        message.error('Please upload an image file')
        return
      }
      const reader = new FileReader()
      reader.onload = e => {
        setAvatar(e.target?.result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <>
      <SharedHeader />
      <div className="p-6">
        <Button onClick={() => navigate('/')} type="primary" className="mb-4 bg-[#003087] hover:!bg-[#002b6c]">
          <LeftOutlined /> Back to Home
        </Button>
        <Card className="mb-6 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="group relative cursor-pointer" onClick={handleAvatarClick}>
              <div className="relative h-24 w-24">
                <img
                  src={avatar}
                  alt="Profile"
                  className="h-full w-full rounded-lg border border-gray-100 bg-blue-100 object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100">
                  <CameraOutlined className="text-xl text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex-grow">
              <h2 className="text-2xl font-semibold text-gray-800">
                {userData?.firstName} {userData?.lastName}
              </h2>
              <p className="text-gray-600">{userData?.email}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="primary"
                className="bg-[#003087] hover:!bg-[#002b6c]"
                size="large"
                onClick={openChangePassword}
              >
                Change Password
              </Button>
              <Button type="default" size="large" onClick={handleEdit}>
                Edit
              </Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <div className="grid grid-cols-3 gap-8 md:grid-cols-3">
            <div>
              <p className="mb-1 text-gray-600">Phone number</p>
              <p className="text-gray-500">{userData.phone}</p>
            </div>
            <div>
              <p className="mb-1 text-gray-600">Student Code</p>
              <p className="text-gray-500">{userData.studentCode || 'Not available'}</p>
            </div>
            <div>
              <p className="mb-1 text-gray-600">Address</p>
              <p className="text-gray-500">{userData.address || 'Not available'}</p>
            </div>
          </div>
        </Card>

        <EditProfileModal
          open={isEditModalOpen}
          onCancel={handleCancelEdit}
          onSave={handleSave}
          formData={formData}
          setFormData={setFormData}
        />
      </div>
      <ChangePasswordModal
        open={isPasswordModalOpen}
        onCancel={() => setIsPasswordModalOpen(false)}
        userId={auth.user?.userId}
        onSubmit={async (userId, passwordData) => {
          return changePasswordMutation.mutateAsync({ userId, passwordData })
        }}
      />
      <StudentHistory userId={auth.user?.userId} />
    </>
  )
}

export default Profile
