import axiosInstance from '@shared/config/axios'
import { normalizeExamDataSequence } from '@shared/lib/sortExamData'

export const fetchWritingTestDetails = async () => {
  const globalData = JSON.parse(localStorage.getItem('globalData') || '{}')
  const topicId = globalData.topicId
  if (!topicId) {
    throw new Error('Missing topicId in localStorage.globalData')
  }
  const response = await axiosInstance.get(`/topics/${topicId}`, {
    params: {
      questionType: 'writing',
      skillName: 'WRITING'
    }
  })

  return normalizeExamDataSequence(response.data)
}

export const submitWritingAnswers = async data => {
  const response = await axiosInstance.post(`/student-answers`, data)
  return response.data
}
