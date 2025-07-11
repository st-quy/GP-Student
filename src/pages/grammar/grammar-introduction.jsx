import { useGrammarData } from '@shared/context/grammar-context'
import { Introduction } from '@shared/ui/introduction'
import { useNavigate } from 'react-router-dom'
const GrammarIntroduction = () => {
  const navigate = useNavigate()
  const data = useGrammarData()

  const onStart = async () => {
    navigate('/grammar/test')
  }

  return <Introduction data={data} onStart={onStart} />
}

export default GrammarIntroduction
