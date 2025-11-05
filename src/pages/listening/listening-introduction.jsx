import { useListeningData } from '@shared/context/listening-context'
import { Introduction } from '@shared/ui/introduction'
import useAntiCheat from '@shared/utils/antiCheat'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const ListeningIntroduction = () => {
  const navigate = useNavigate()
  const data = useListeningData()
  const { enableFullScreen } = useAntiCheat()
  useEffect(() => {
    localStorage.removeItem('listening_test_submitted')
  }, [])

  const onStart = async () => {
    await enableFullScreen()
    navigate('/listening/headphonecheck')
  }

  return <Introduction data={data} onStart={onStart} />
}

export default ListeningIntroduction
