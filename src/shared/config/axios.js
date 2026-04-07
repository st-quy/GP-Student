import axios from 'axios'

const resolveBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_BASE_URL?.trim()

  if (!configuredBaseUrl) {
    return `${window.location.origin}/api`
  }

  try {
    const resolvedUrl = new URL(configuredBaseUrl, window.location.origin)

    if (window.location.protocol === 'https:' && resolvedUrl.protocol === 'http:') {
      resolvedUrl.protocol = 'https:'
    }

    if (
      ['localhost', '127.0.0.1'].includes(resolvedUrl.hostname) &&
      !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ) {
      resolvedUrl.hostname = window.location.hostname
    }

    return resolvedUrl.toString().replace(/\/$/, '')
  } catch (error) {
    return configuredBaseUrl.replace(/\/$/, '')
  }
}

const axiosInstance = axios.create({
  // @ts-ignore
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
})

axiosInstance.interceptors.request.use(
  config => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
