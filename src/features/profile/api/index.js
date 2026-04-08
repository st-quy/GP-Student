import axiosInstance from '@shared/config/axios'

export const fetchUserProfile = async userId => {
  try {
    const { data } = await axiosInstance.get(`/users/${userId}`)
    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    throw error
  }
}

export const updateUserProfile = async ({ userId, userData }) => {
  try {
    const { data } = await axiosInstance.put(`/users/${userId}`, userData)
    return data
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

export const updateUserAvatar = async ({ userId, avatarUrl }) => {
  try {
    const { data } = await axiosInstance.put(`/users/${userId}/avatar`, { avatarUrl })
    return data
  } catch (error) {
    console.error('Error updating user avatar:', error)
    throw error
  }
}

export const getAvatarUploadUrl = async fileName => {
  try {
    const { data } = await axiosInstance.post('/presigned-url/upload-url', {
      fileName,
      type: 'avatars'
    })
    return data
  } catch (error) {
    console.error('Error getting avatar upload URL:', error)
    throw error
  }
}

export const uploadAvatarToMinIO = async (uploadUrl, file) => {
  try {
    await axiosInstance.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type
      }
    })
  } catch (error) {
    console.error('Error uploading avatar to MinIO:', error)
    throw error
  }
}

export const changeUserPassword = async ({ userId, passwordData }) => {
  try {
    const { data } = await axiosInstance.post(`/users/${userId}/change-password`, passwordData)
    return data
  } catch (error) {
    console.error('Error changing password:', error)
    throw error
  }
}

export const fetchStudentHistory = async userId => {
  try {
    const { data } = await axiosInstance.get(`/session-participants/user/${userId}`)
    return data
  } catch (error) {
    console.error('Error fetching session history')
    throw error
  }
}
