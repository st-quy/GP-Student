import { useListeningData } from '@shared/context/listening-context'
import { Introduction } from '@shared/ui/introduction'
import useAntiCheat from '@shared/utils/antiCheat'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const ListeningIntroduction = () => {
  const navigate = useNavigate()
  const data = useListeningData()
  const { enableFullScreen } = useAntiCheat()
  useEffect(() => {
    localStorage.removeItem('listening_test_submitted')
    localStorage.removeItem('listening_played_questions')
    localStorage.removeItem('listening_test_answers')
    localStorage.removeItem('listening_formatted_answers')
  }, [])

  const onStart = async () => {
    await enableFullScreen()
    navigate('/listening/headphonecheck')
  }

  return <Introduction data={data} onStart={onStart} />
}

export default ListeningIntroduction
