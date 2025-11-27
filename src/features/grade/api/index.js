import axiosInstance from '@shared/config/axios'

export const fetchExamReview = async (sessionParticipantId) => {
  try {
    // Gọi endpoint mới mà bạn vừa tạo ở Backend
    const response = await axiosInstance.get(`/grades/review/${sessionParticipantId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching exam review:', error)
    throw error
  }
}