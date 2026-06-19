import { FlagFilled, FlagOutlined } from '@ant-design/icons'
import { fetchWritingTestDetails } from '@features/writing/api'
import { getWritingWordLimits, limitTextByWords } from '@features/writing/constance'
import { useSubmitWritingTest } from '@features/writing/hooks'
import FooterNavigator from '@features/writing/ui/writing-footer-navigator'
import QuestionForm from '@features/writing/ui/writing-question-form'
import QuestionNavigatorContainer from '@features/writing/ui/writing-question-navigator-container'
import { useQuery } from '@tanstack/react-query'
import { Typography, Spin, Card, Divider, Button, message } from 'antd'
import { useState, useEffect, useCallback, useMemo } from 'react'
const { Title } = Typography

const getWritingPartNumber = part => {
  const contentPartNumber = String(part?.Content || '').match(/Part\s*(\d+)/i)?.[1]
  const sequencePartNumber = part?.Sequence ?? part?.sequence
  return Number(contentPartNumber || sequencePartNumber || 0)
}

const getSortedWritingQuestions = part => [...(part?.Questions || [])].sort((a, b) => (a.Sequence || 0) - (b.Sequence || 0))

const WritingTest = () => {
  const { submitWritingTest } = useSubmitWritingTest()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['writingQuestions'],
    queryFn: async () => {
      const response = await fetchWritingTestDetails()
      return { ...response }
    }
  })

  const [currentPartIndex, setCurrentPartIndex] = useState(0)
  const [answers, setAnswers] = useState(() => JSON.parse(localStorage.getItem('writingAnswers')) || {})
  const [wordCounts, setWordCounts] = useState({})
  const [flaggedParts, setFlaggedParts] = useState(() => JSON.parse(localStorage.getItem('flaggedParts')) || {})

  const countWords = text => text.trim().split(/\s+/).filter(Boolean).length

  const sanitizeAnswersByWordLimits = useCallback(
    answersToSanitize => {
      const sanitizedAnswers = { ...answersToSanitize }
      let hasChanges = false

      data?.Sections?.[0]?.Parts?.forEach(part => {
        const partNumber = getWritingPartNumber(part)
        getSortedWritingQuestions(part).forEach((question, index) => {
          const fieldName = `answer-${part.ID}-${index}`
          const { maxWords } = getWritingWordLimits({
            question,
            part,
            partNumber,
            questionIndex: index
          })
          const currentAnswer = sanitizedAnswers[fieldName]
          if (currentAnswer === undefined) return

          const limitedAnswer = limitTextByWords(currentAnswer, maxWords)
          if (limitedAnswer !== currentAnswer) {
            sanitizedAnswers[fieldName] = limitedAnswer
            hasChanges = true
          }
        })
      })

      return { sanitizedAnswers, hasChanges }
    },
    [data]
  )

  useEffect(() => {
    if (data) {
      const storedAnswers = JSON.parse(localStorage.getItem('writingAnswers')) || {}
      const { sanitizedAnswers, hasChanges } = sanitizeAnswersByWordLimits(storedAnswers)
      if (hasChanges) {
        localStorage.setItem('writingAnswers', JSON.stringify(sanitizedAnswers))
      }
      setAnswers(sanitizedAnswers)
      updateWordCounts(sanitizedAnswers)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, currentPartIndex, sanitizeAnswersByWordLimits])

  const updateWordCounts = updatedAnswers => {
    const newWordCounts = {}
    if (data?.Sections?.[0]?.Parts) {
      data?.Sections?.[0]?.Parts.forEach(part => {
        getSortedWritingQuestions(part).forEach((_, index) => {
          const fieldName = `answer-${part.ID}-${index}`
          newWordCounts[fieldName] = countWords(updatedAnswers[fieldName] || '')
        })
      })
    }
    setWordCounts(newWordCounts)
  }

  const handleFlagToggle = partId => {
    setFlaggedParts(prevFlags => {
      const updatedFlags = {
        ...prevFlags,
        [partId]: !prevFlags[partId]
      }
      localStorage.setItem('flaggedParts', JSON.stringify(updatedFlags))
      return updatedFlags
    })
  }

  const handleTextChange = (field, text) => {
    const newAnswers = { ...answers, [field]: text }
    setAnswers(newAnswers)
    localStorage.setItem('writingAnswers', JSON.stringify(newAnswers))
    setWordCounts(prev => ({
      ...prev,
      [field]: countWords(text)
    }))
  }

  // Validate word count before submit (max only)
  const validateWordCounts = useCallback(() => {
    if (!data?.Sections?.[0]?.Parts) return true
    const parts = data.Sections[0].Parts
    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi]
      const partNum = getWritingPartNumber(part)
      const questions = getSortedWritingQuestions(part)
      for (let qi = 0; qi < questions.length; qi++) {
        const question = questions[qi]
        const fieldName = `answer-${part.ID}-${qi}`
        const { maxWords } = getWritingWordLimits({
          question,
          part,
          partNumber: partNum,
          questionIndex: qi
        })
        const wc = countWords(answers[fieldName] || '')

        if (maxWords && wc > maxWords) {
          message.error(`Part ${partNum}, Question ${qi + 1}: exceeds word limit (${wc}/${maxWords})`)
          return false
        }
      }
    }
    return true
  }, [data, answers, countWords])

  // BUG_MT007: Count unanswered questions
  const unansweredCount = useMemo(() => {
    if (!data?.Sections?.[0]?.Parts) return 0
    let count = 0
    data.Sections[0].Parts.forEach(part => {
      getSortedWritingQuestions(part).forEach((_, index) => {
        const fieldName = `answer-${part.ID}-${index}`
        if (!answers[fieldName] || answers[fieldName].trim() === '') {
          count++
        }
      })
    })
    return count
  }, [data, answers])

  const handleSubmit = useCallback(async () => {
    if (!validateWordCounts()) return
    await submitWritingTest(data)
    localStorage.removeItem('current_skill')
  }, [submitWritingTest, data, validateWordCounts])

  const handleForceSubmit = useCallback(() => {
    handleSubmit()
  }, [handleSubmit])

  useEffect(() => {
    window.addEventListener('forceSubmit', handleForceSubmit)
    return () => {
      window.removeEventListener('forceSubmit', handleForceSubmit)
    }
  }, [handleForceSubmit])
  if (isLoading) {
    return <Spin className="flex h-screen items-center justify-center" />
  }
  if (isError) {
    return <div className="text-center text-red-500">Error fetching data</div>
  }
  if (!data || !data?.Sections?.[0]?.Parts || data?.Sections?.[0]?.Parts.length === 0) {
    return <div className="text-center text-gray-500">No test data available</div>
  }

  const currentPart = data?.Sections?.[0]?.Parts[currentPartIndex]
  const partNumber = getWritingPartNumber(currentPart)

  return (
    <div className="relative mx-auto min-h-screen max-w-4xl p-5">
      <Divider orientation="left">
        <Title level={1}>Writing</Title>
      </Divider>

      <Card className="mb-32">
        <div className="mb-4 flex w-full items-center justify-between">
          <Title level={4} className="text-l mb-5 font-semibold">
            Question {currentPartIndex + 1} of {data?.Sections?.[0]?.Parts.length}
          </Title>
          <Button
            icon={flaggedParts[currentPart.ID] ? <FlagFilled className="text-red-600" /> : <FlagOutlined />}
            className={`h-10 items-center justify-center gap-2 rounded-md border px-4 transition-colors ${
              flaggedParts[currentPart.ID]
                ? 'border-red-300 bg-red-50 hover:border-red-400'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handleFlagToggle(currentPart.ID)}
          >
            <span className={`text-base font-normal ${flaggedParts[currentPart.ID] ? 'text-red-600' : ''}`}>Flag</span>
          </Button>
        </div>

        <QuestionForm
          currentPart={currentPart}
          partNumber={partNumber}
          answers={answers}
          handleTextChange={handleTextChange}
          countWords={countWords}
          wordCounts={wordCounts}
        />
      </Card>

      <QuestionNavigatorContainer
        data={data}
        answers={answers}
        flaggedParts={flaggedParts}
        setCurrentPartIndex={setCurrentPartIndex}
        currentPartIndex={currentPartIndex}
        handleSubmit={handleSubmit}
      />
      <FooterNavigator
        totalQuestions={data?.Sections?.[0]?.Parts.length}
        currentQuestion={currentPartIndex}
        setCurrentQuestion={setCurrentPartIndex}
        handleSubmit={handleSubmit}
        unansweredCount={unansweredCount}
      />
    </div>
  )
}

export default WritingTest
