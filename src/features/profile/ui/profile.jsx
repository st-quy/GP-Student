import { LeftOutlined, UploadOutlined } from '@ant-design/icons'
import defaultAvatar from '@assets/images/avatar.png'
import { uploadAvatarToMinIO } from '@features/profile/api'
import {
  useChangeUserPassword,
  useUpdateUserProfile,
  useUserProfile
} from '@features/profile/hooks/useProfile'
import ChangePasswordModal from '@features/profile/ui/change-password-profile'
import EditProfileModal from '@features/profile/ui/edit-profile'
import { EMAIL_REG } from '@shared/lib/constants/reg'
import SharedHeader from '@shared/ui/base-header'
import { Button, Card, message, Spin } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import * as Yup from 'yup'

import StudentHistory from './student-history'

const profileValidationSchema = Yup.object().shape({
  firstName: Yup.string()
    .trim()
    .required('First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .test('not-only-spaces', 'First name cannot be only spaces', value => value && value.trim().length > 0),
  lastName: Yup.string()
    .trim()
    .required('Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .test('not-only-spaces', 'Last name cannot be only spaces', value => value && value.trim().length > 0),
  email: Yup.string()
    .trim()
    .matches(EMAIL_REG, 'Invalid email format')
    .required('Email is required')
    .max(100, 'Email must not exceed 100 characters'),
  phone: Yup.string()
    .required('Phone number is required')
    .matches(/^\d+$/, 'Phone number must contain only digits')
    .min(9, 'Phone number must be at least 9 digits')
    .max(20, 'Phone number must not exceed 20 digits'),
  address: Yup.string()
    .trim()
    .max(200, 'Address must not exceed 200 characters')
    .test('not-only-spaces', 'Address cannot be only spaces', value => !value || value.trim().length > 0)
})

const Profile = () => {
  const navigate = useNavigate()
  // @ts-ignore
  const auth = useSelector(state => state.auth)
  const { data: userProfileResponse, isLoading, isError, refetch } = useUserProfile(auth.user?.userId)
  const userData = userProfileResponse
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const updateProfileMutation = useUpdateUserProfile()
  const changePasswordMutation = useChangeUserPassword()
  const fileInputRef = useRef(null)
  const [avatar, setAvatar] = useState(auth.user?.avatarUrl || defaultAvatar)
  const [isUploading, setIsUploading] = useState(false)
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
      const newAvatarUrl = userData.avatarUrl || auth.user?.avatarUrl
      if (newAvatarUrl) {
        setAvatar(newAvatarUrl)
      } else {
        setAvatar(defaultAvatar)
      }
    }
  }, [userData, auth.user?.avatarUrl])

  useEffect(() => {
    if (auth.user?.avatarUrl && avatar === defaultAvatar) {
      setAvatar(auth.user.avatarUrl)
    }
  }, [auth.user?.avatarUrl])

  const handleEdit = () => {
    if (!userData) return
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
    if (!userData) return
    setFormData({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      address: userData.address || ''
    })
    setIsEditModalOpen(false)
  }

  const handleSave = async values => {
    try {
      // values already trimmed from EditProfileModal
      const trimmedData = values || formData
      await profileValidationSchema.validate(trimmedData, { abortEarly: false })

      await updateProfileMutation.mutateAsync({
        userId: auth.user?.userId,
        userData: trimmedData
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
    if (isUploading) {
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = async event => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file
      if (file.size > 2 * 1024 * 1024) {
        message.error('Image size should be less than 2MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        message.error('Please upload an image file')
        return
      }

      try {
        setIsUploading(true)

        // Show preview immediately
        const reader = new FileReader()
        reader.onload = e => {
          setAvatar(e.target?.result)
        }
        reader.readAsDataURL(file)

        const uploadData = await uploadAvatarToMinIO(file)

        await updateProfileMutation.mutateAsync({
          userId: auth.user?.userId,
          userData: { avatarUrl: uploadData.fileUrl }
        })

        message.success('Avatar updated successfully!')
      } catch (error) {
        console.error('Avatar upload failed:', error)
        message.error('Failed to upload avatar. Please try again.')
        // Reset to previous avatar on error
        if (userData?.avatarUrl) {
          setAvatar(userData.avatarUrl)
        } else {
          setAvatar(defaultAvatar)
        }
      } finally {
        setIsUploading(false)
      }
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
                {isUploading ? (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-gray-100 bg-blue-100">
                    <Spin size="small" />
                  </div>
                ) : (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="h-full w-full rounded-lg border border-gray-100 bg-blue-100 object-cover"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100">
                  <UploadOutlined className="text-xl text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
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
              <p className="text-gray-500">{userData?.phone}</p>
            </div>
            <div>
              <p className="mb-1 text-gray-600">Student Code</p>
              <p className="text-gray-500">{userData?.studentCode || 'Not available'}</p>
            </div>
            <div>
              <p className="mb-1 text-gray-600">Address</p>
              <p className="text-gray-500">{userData?.address || 'Not available'}</p>
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
