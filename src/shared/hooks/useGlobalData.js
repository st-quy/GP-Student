import { useState, useCallback } from 'react'

export const getGlobalDataFromStorage = () => {
  try {
    const globalDataStr = localStorage.getItem('globalData')
    if (!globalDataStr) {
      return null
    }

    const globalData = JSON.parse(globalDataStr)
    if (!globalData || typeof globalData !== 'object') {
      return null
    }

    return globalData
  } catch (error) {
    console.error('Error getting global data from storage:', error)
    return null
  }
}

export const useGlobalData = () => {
  const [errorMessage, setErrorMessage] = useState('')
  const [showErrorModal, setShowErrorModal] = useState(false)

  const getGlobalData = useCallback(() => {
    try {
      const globalData = getGlobalDataFromStorage()
      if (!globalData) {
        throw new Error('Missing globalData in localStorage')
      }
      return globalData
    } catch (error) {
      console.error('Error getting global data:', error)
      return null
    }
  }, [])

  return {
    getGlobalData,
    errorMessage,
    setErrorMessage,
    showErrorModal,
    setShowErrorModal
  }
}

export default useGlobalData
