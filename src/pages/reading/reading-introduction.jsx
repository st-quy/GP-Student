import { useReadingData } from '@shared/context/reading-context'
import { Introduction } from '@shared/ui/introduction'
import useAntiCheat from '@shared/utils/antiCheat'
import { useNavigate } from 'react-router-dom'

const ReadingIntroduction = () => {
  const navigate = useNavigate()
  const data = useReadingData()
  const { enableFullScreen } = useAntiCheat()

  const onStart = async () => {
    await enableFullScreen()
    localStorage.removeItem('readingSubmitted') // Đảm bảo trạng thái "đã nộp bài" được đặt lại
    localStorage.removeItem('readingAnswers')
    localStorage.removeItem('flaggedQuestions')
    localStorage.removeItem('partFlaggedStates')
    navigate('/reading/test')
  }

  return <Introduction data={data} onStart={onStart} />
}

export default ReadingIntroduction
