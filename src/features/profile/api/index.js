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

export const uploadAvatarToMinIO = async file => {
  try {
    const fileName = `avatar_${Date.now()}_${file.name}`
    const formData = new FormData()
    formData.append('file', file, fileName)
    formData.append('folder', 'avatars')

    const { data } = await axiosInstance.post('/presigned-url/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return data
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
