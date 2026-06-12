/* eslint-disable no-unsafe-optional-chaining */
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { ListeningSubmission } from '@assets/images'
import { fetchListeningTestDetails, saveListeningAnswers } from '@features/listening/api'
import PlayStopButton from '@features/listening/ui/play-stop-button'
import TestNavigation from '@features/listening/ui/test-navigation'
import useGlobalData from '@shared/hooks/useGlobalData'
import DropdownQuestion from '@shared/ui/question-type/dropdown-question'
import MatchingQuestion from '@shared/ui/question-type/matching-question'
import MultipleChoice from '@shared/ui/question-type/multiple-choice'
import NextScreen from '@shared/ui/submission/next-screen'
import { useQuery } from '@tanstack/react-query'
import { Spin, Alert, Typography, Modal, message } from 'antd'
import { useState, useMemo, useEffect, useCallback } from 'react'
const { Title } = Typography

const STORAGE_KEY = 'listening_test_answers'

const getSequenceValue = (value, fallback = 999) => {
  const sequence = Number(value)
  return Number.isFinite(sequence) ? sequence : fallback
}

const formatOrderSegment = value => String(getSequenceValue(value)).padStart(4, '0')

const getAudioQuestionNumber = value => {
  const match = String(value || '').match(/(?:^|[/_-])Q(\d+)\.mp3(?:$|\?)/i)
  return match ? Number(match[1]) : 999
}

const getQuestionOrder = (part, partIndex, question, questionIndex) => {
  const partSequence = getSequenceValue(part?.Sequence, partIndex + 1)
  const questionSequence = getSequenceValue(question?.Sequence, questionIndex + 1)
  const audioQuestionNumber = getAudioQuestionNumber(question?.AudioKeys)

  return {
    partSequence,
    questionSequence,
    audioQuestionNumber,
    originalIndex: questionIndex
  }
}

const compareQuestionOrder = (a, b) =>
  a.partSequence - b.partSequence ||
  a.questionSequence - b.questionSequence ||
  a.audioQuestionNumber - b.audioQuestionNumber ||
  a.originalIndex - b.originalIndex

const getAudioGroupKey = question => String(question?.AudioKeys || question?.ID || '')

const ListeningTest = () => {
  const [currentPartIndex, setCurrentPartIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState(() => {
    const savedAnswers = localStorage.getItem(STORAGE_KEY)
    return savedAnswers ? JSON.parse(savedAnswers) : {}
  })
  const [flaggedQuestions, setFlaggedQuestions] = useState(() => {
    try {
      const stored = localStorage.getItem('listening_flagged_questions')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(() => localStorage.getItem('listening_test_submitted') === 'true')
  const { getGlobalData, errorMessage, setErrorMessage, showErrorModal, setShowErrorModal } = useGlobalData()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userAnswers))
  }, [userAnswers])

  const {
    data: testData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['listeningTest'],
    queryFn: () => fetchListeningTestDetails()
  })

  const orderedListeningItems = useMemo(() => {
    if (!testData?.Sections?.[0]?.Parts) return []

    return testData.Sections[0].Parts.flatMap((part, partIndex) =>
      (part.Questions || []).map((question, questionIndex) => ({
        part,
        partIndex,
        question: {
          ...question,
          _listeningOrder: `${formatOrderSegment(part?.Sequence ?? partIndex + 1)}-${formatOrderSegment(
            question?.Sequence ?? questionIndex + 1
          )}-${formatOrderSegment(getAudioQuestionNumber(question?.AudioKeys))}-${formatOrderSegment(questionIndex)}`
        },
        order: getQuestionOrder(part, partIndex, question, questionIndex)
      }))
    ).sort((a, b) => compareQuestionOrder(a.order, b.order))
  }, [testData])

  const formatQuestionData = useCallback(question => {
    if (!question) return null
    try {
      const answerContent =
        typeof question.AnswerContent === 'string' ? JSON.parse(question.AnswerContent) : question.AnswerContent

      if (question.Type === 'listening-questions-group' && answerContent?.groupContent?.listContent?.length > 0) {
        return answerContent.groupContent.listContent.map(subQuestion => {
          const options =
            subQuestion.options?.map((option, index) => ({
              key: String.fromCharCode(65 + index),
              value: option
            })) || []

          return {
            ...question,
            ID: `${question.ID}-${subQuestion.ID}`,
            Content: subQuestion.content,
            Type: subQuestion.type,
            AnswerContent: JSON.stringify([
              {
                title: subQuestion.content,
                options,
                correctAnswer: subQuestion.correctAnswer
              }
            ])
          }
        })
      }

      if (answerContent?.options && Array.isArray(answerContent.options)) {
        const options = answerContent.options.map((option, index) => ({
          key: String.fromCharCode(65 + index),
          value: option
        }))

        return {
          ...question,
          AnswerContent: JSON.stringify([
            {
              title: question.Content,
              options,
              correctAnswer: answerContent.correctAnswer
            }
          ])
        }
      }

      return { ...question, AnswerContent: answerContent }
    } catch (e) {
      console.error('Error formatting question:', e)
      return question
    }
  }, [])

  const buildSubmissionPayload = useCallback(() => {
    const globalData = getGlobalData()
    if (!globalData || !orderedListeningItems.length) {
      throw new Error('Missing required data for submission')
    }

    const questions = []

    console.log('=== SUBMISSION DEBUG ===')
    console.log('Full userAnswers:', JSON.stringify(userAnswers, null, 2))

    orderedListeningItems.forEach(({ question }) => {
      const ua = userAnswers[question.ID]

      let answerText
      let answerAudio = null

      if (question.Type === 'listening-questions-group') {
        const subQs = question.AnswerContent?.groupContent?.listContent || []
        answerText = subQs
          .map(sub => ({
            ID: sub.ID,
            answer: userAnswers[`${question.ID}-${sub.ID}`]
          }))
          .filter(a => a.answer !== undefined)
        answerAudio = ua?.answerAudio ?? null
      } else if (ua && typeof ua === 'object' && 'answerText' in ua) {
        answerText = ua.answerText
        answerAudio = ua.answerAudio ?? null
      } else {
        answerText = ua ?? null
      }

      console.log(
        `Q[${question.Sequence}] ID=${question.ID} Type=${question.Type} | ua=${JSON.stringify(ua)} | answerText=${JSON.stringify(answerText)}`
      )

      questions.push({
        questionId: question.ID,
        answerText,
        answerAudio
      })
    })

    console.log('Final payload questions:', JSON.stringify(questions, null, 2))
    console.log('=== END SUBMISSION DEBUG ===')

    return {
      studentId: globalData.studentId,
      topicId: globalData.topicId,
      skillName: 'LISTENING',
      sessionId: globalData.sessionId,
      sessionParticipantId: globalData.sessionParticipantId,
      questions
    }
  }, [userAnswers, orderedListeningItems, getGlobalData])

  const navigatorQuestions = useMemo(() => {
    return orderedListeningItems.map(({ partIndex, question }) => ({ partIndex, questionIndex: 0, question }))
  }, [orderedListeningItems])

  const groupedQuestions = useMemo(() => {
    const audioGroups = {}
    orderedListeningItems.forEach(({ partIndex, question, order }) => {
      const groupKey = getAudioGroupKey(question)
      if (!audioGroups[groupKey]) {
        audioGroups[groupKey] = { audioUrl: question.AudioKeys, questions: [], partIndex, order }
      }
      audioGroups[groupKey].questions.push({ ...question, _order: order })
    })
    Object.values(audioGroups).forEach(group => {
      group.questions.sort((a, b) => compareQuestionOrder(a._order, b._order))
    })
    return Object.values(audioGroups).sort((a, b) => compareQuestionOrder(a.order, b.order))
  }, [orderedListeningItems])

  const unansweredCount = useMemo(() => {
    if (!testData?.Sections?.[0]?.Parts) return 0
    let count = 0
    testData.Sections[0].Parts.forEach(part => {
      part.Questions.forEach(question => {
        if (question.Type === 'listening-questions-group') {
          const subQs =
            typeof question.AnswerContent === 'string'
              ? JSON.parse(question.AnswerContent)?.groupContent?.listContent
              : question.AnswerContent?.groupContent?.listContent
          if (subQs) {
            const allAnswered = subQs.every(sub => userAnswers[`${question.ID}-${sub.ID}`] !== undefined)
            if (!allAnswered) count++
          }
        } else {
          if (userAnswers[question.ID] === undefined) count++
        }
      })
    })
    return count
  }, [testData?.ID, userAnswers])

  const getCurrentGroup = useCallback(() => {
    return groupedQuestions[currentPartIndex] || null
  }, [groupedQuestions, currentPartIndex])

  const checkAudioPlayed = useCallback(() => {
    const group = getCurrentGroup()
    const audioQuestionId = group?.questions[0]?.ID
    if (!audioQuestionId) return true
    const playedQuestions = JSON.parse(localStorage.getItem('listening_played_questions') || '{}')
    const hasPlayed =
      playedQuestions[audioQuestionId] && (playedQuestions[audioQuestionId][1] || playedQuestions[audioQuestionId][2])
    if (!hasPlayed) {
      message.warning('Please listen to the Audio before choosing the answer.')
      return false
    }
    return true
  }, [getCurrentGroup])

  const goToNext = () => {
    if (isAudioPlaying) return
    const group = getCurrentGroup()
    if (!group) return
    if (currentQuestionIndex < group.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else if (currentPartIndex < groupedQuestions.length - 1) {
      setCurrentPartIndex(currentPartIndex + 1)
      setCurrentQuestionIndex(0)
    }
  }

  const goToQuestion = flatIndex => {
    if (isAudioPlaying || !groupedQuestions.length) return
    setCurrentPartIndex(flatIndex)
    setCurrentQuestionIndex(0)
  }

  const handleAnswerSubmit = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleSubmitAnswers = useCallback(
    async (isAutoSubmit = false) => {
      try {
        const payload = buildSubmissionPayload()
        console.log('>>> Submitting payload:', JSON.stringify(payload, null, 2))
        await saveListeningAnswers(payload)
        console.log('>>> Submission successful')
        setIsSubmitted(true)
        localStorage.setItem('listening_test_submitted', 'true')
        localStorage.setItem('current_skill', 'grammar')
      } catch (error) {
        console.error('>>> Submission failed:', error)
        setErrorMessage(error.message)
        setShowErrorModal(true)
      }
    },
    [buildSubmissionPayload, setErrorMessage, setShowErrorModal]
  )

  useEffect(() => {
    window.addEventListener('forceSubmit', handleSubmitAnswers)
    return () => window.removeEventListener('forceSubmit', handleSubmitAnswers)
  }, [handleSubmitAnswers])

  if (isSubmitted) {
    return <NextScreen nextPath="/grammar" skillName="Listening" imageSrc={ListeningSubmission} />
  }
  if (isLoading) {
    return <Spin size="large" className="flex min-h-screen items-center justify-center" />
  }
  if (error) {
    return <Alert type="error" message="Failed to load test data" description={error.message} />
  }

  const currentGroup = getCurrentGroup()
  const totalQuestions = groupedQuestions.length
  const isFlagged = currentGroup?.questions[0] && flaggedQuestions.includes(currentGroup.questions[0].ID)

  return (
    <>
      <TestNavigation
        testData={{
          ...testData,
          Parts: navigatorQuestions.map(q => ({ ...q.question.Part, Questions: [q.question] }))
        }}
        currentQuestion={currentGroup?.questions[0]}
        flatIndex={currentPartIndex}
        totalQuestions={totalQuestions}
        isFlagged={isFlagged}
        onFlag={f => {
          const id = currentGroup?.questions[0]?.ID
          if (!id) return
          const updated = f ? [...flaggedQuestions, id] : flaggedQuestions.filter(x => x !== id)
          setFlaggedQuestions(updated)
          localStorage.setItem('listening_flagged_questions', JSON.stringify(updated))
        }}
        onQuestionChange={goToQuestion}
        onNext={goToNext}
        onSubmit={() => handleSubmitAnswers(false)}
        onAutoSubmit={() => handleSubmitAnswers(true)}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        unansweredCount={unansweredCount}
      >
        {currentGroup && (
          <>
            <Title level={5} className="mb-6 text-lg">
              {currentGroup.questions[0].Content}
            </Title>
            <PlayStopButton
              audioUrl={currentGroup.audioUrl}
              questionId={currentGroup.questions[0]?.ID}
              onPlayingChange={setIsAudioPlaying}
            />
          </>
        )}

        {currentGroup?.questions.map(question => {
          const formattedQ = formatQuestionData(question)

          if (Array.isArray(formattedQ)) {
            return (
              <div key={question.ID} className="mt-6">
                {formattedQ.map(subQ => (
                  <div key={subQ.ID} className="mb-8">
                    <Title level={5} className="mb-4 text-base font-normal">
                      {subQ.Content}
                    </Title>
                    <MultipleChoice
                      questionData={subQ}
                      userAnswer={userAnswers}
                      setUserAnswer={setUserAnswers}
                      onBeforeAnswer={checkAudioPlayed}
                      onSubmit={answer => handleAnswerSubmit(subQ.ID, answer)}
                      setUserAnswerSubmit={() => {}}
                    />
                  </div>
                ))}
              </div>
            )
          }

          return (
            <div key={question.ID} className="mt-6">
              {formattedQ?.Type === 'multiple-choice' ? (
                <MultipleChoice
                  questionData={formattedQ}
                  userAnswer={userAnswers}
                  setUserAnswer={setUserAnswers}
                  onBeforeAnswer={checkAudioPlayed}
                  onSubmit={answer => handleAnswerSubmit(question.ID, answer)}
                  className="z-0 mt-6"
                  setUserAnswerSubmit={() => {}}
                />
              ) : formattedQ?.Type === 'dropdown-list' ? (
                <DropdownQuestion
                  questionData={formattedQ}
                  userAnswer={userAnswers}
                  setUserAnswer={setUserAnswers}
                  onBeforeAnswer={checkAudioPlayed}
                  className="z-0 mt-6 shadow-none"
                />
              ) : formattedQ?.Type === 'matching' ? (
                <MatchingQuestion
                  leftItems={formattedQ.AnswerContent?.leftItems || []}
                  rightItems={formattedQ.AnswerContent?.rightItems || []}
                  userAnswer={userAnswers[question.ID] || []}
                  setUserAnswer={answer => handleAnswerSubmit(question.ID, answer)}
                  className="z-0 mt-6 shadow-none"
                />
              ) : null}
            </div>
          )
        })}
      </TestNavigation>

      <Modal
        title="Submission Error"
        open={showErrorModal}
        onOk={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
        okText="OK"
      >
        <p>{errorMessage}</p>
      </Modal>
    </>
  )
}

export default ListeningTest
