import { createSlice } from '@reduxjs/toolkit'
import { ACCESS_TOKEN_KEY, getStorageData, setStorageData, removeStorageData } from '@shared/lib/storage'
import { jwtDecode } from 'jwt-decode'

const AVATAR_URL_KEY = 'user_avatar_url'

const checkAuth = () => Boolean(getStorageData(ACCESS_TOKEN_KEY))

const getUserRole = () => {
  try {
    const token = getStorageData(ACCESS_TOKEN_KEY)
    if (!token) {
      return null
    }
    const decodedToken = jwtDecode(token)
    return decodedToken.role || null
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

const getUserData = () => {
  try {
    const token = getStorageData(ACCESS_TOKEN_KEY)
    if (!token) {
      return null
    }
    const decodedToken = jwtDecode(token)
    const cachedAvatarUrlRaw = getStorageData(AVATAR_URL_KEY)
    if (cachedAvatarUrlRaw) {
      const cachedAvatarUrl = JSON.parse(cachedAvatarUrlRaw)
      return {
        ...decodedToken,
        avatarUrl: cachedAvatarUrl
      }
    }
    return decodedToken || null
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

const clearAvatarUrl = () => {
  removeStorageData(AVATAR_URL_KEY)
}

const initialState = {
  isAuth: checkAuth(),
  role: getUserRole(),
  user: getUserData()
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state) {
      state.isAuth = true
      state.user = getUserData()
    },
    logout(state) {
      state.isAuth = false
      state.role = null
      state.user = null
      clearAvatarUrl()
    },
    updateRole(state) {
      state.role = getUserRole()
    },
    updateUser(state, action) {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload
        }
        if (action.payload.avatarUrl) {
          setStorageData(AVATAR_URL_KEY, action.payload.avatarUrl)
        }
      }
    }
  }
})

const { reducer, actions } = authSlice
export const { logout, login, updateUser } = actions
export default reducer
