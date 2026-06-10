import axiosInstance from '@shared/config/axios'
import { normalizeExamDataSequence } from '@shared/lib/sortExamData'

export const fetchReadingTestDetails = async () => {
  const globalData = JSON.parse(localStorage.getItem('globalData'))

  if (!globalData?.topicId) {
    throw new Error('Topic ID not found in global data')
  }

  const response = await axiosInstance.get(`/topics/${globalData.topicId}`, {
    params: {
      skillName: 'READING'
    }
  })
  return normalizeExamDataSequence(response.data)
}

export const submitStudentAnswers = async submitData => {
  try {
    const response = await axiosInstance.post('/student-answers', submitData)
    return response.data
  } catch (error) {
    console.error('Error submitting student answers:', error)
    throw error
  }
}
