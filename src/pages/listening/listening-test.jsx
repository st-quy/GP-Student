/* eslint-disable no-unsafe-optional-chaining */
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { ListeningSubmission } from '@assets/images'
import { fetchListeningTestDetails, saveListeningAnswers } from '@features/listening/api'
import PlayStopButton from '@features/listening/ui/play-stop-button'
import TestNavigation from '@features/listening/ui/test-navigation'
import useGlobalData from '@shared/hooks/useGlobalData'
import DropdownQuestion from '@shared/ui/question-type/dropdown-question'
import MultipleChoice from '@shared/ui/question-type/multiple-choice'
import NextScreen from '@shared/ui/submission/next-screen'
import { useQuery } from '@tanstack/react-query'
import { Spin, Alert, Typography, Modal, message } from 'antd'
import { useState, useMemo, useEffect, useCallback } from 'react'
const { Title } = Typography

const STORAGE_KEY = 'listening_test_answers'

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

  const [formattedAnswers, setFormattedAnswers] = useState(() => {
    const savedFormattedAnswers = localStorage.getItem('listening_formatted_answers')
    const globalData = getGlobalData()

    if (!globalData) {
      return {
        studentId: '',
        topicId: '',
        skillName: 'LISTENING',
        sessionId: '',
        sessionParticipantId: '',
        questions: []
      }
    }

    return savedFormattedAnswers
      ? JSON.parse(savedFormattedAnswers)
      : {
          studentId: globalData.studentId,
          topicId: globalData.topicId,
          skillName: 'LISTENING',
          sessionId: globalData.sessionId,
          sessionParticipantId: globalData.sessionParticipantId,
          questions: []
        }
  })

  // ALL HOOKS MUST BE AT THE TOP
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userAnswers))
  }, [userAnswers])

  useEffect(() => {
    localStorage.setItem('listening_formatted_answers', JSON.stringify(formattedAnswers))
  }, [formattedAnswers])

  const {
    data: testData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['listeningTest'],
    queryFn: () => fetchListeningTestDetails()
  })

  // Restore formatQuestionData
  const formatQuestionData = useCallback((question) => {
    if (!question) return null
    try {
      // FIX: Handle both string and object AnswerContent
      const answerContent = typeof question.AnswerContent === 'string' 
        ? JSON.parse(question.AnswerContent) 
        : question.AnswerContent

      if (question.Type === 'listening-questions-group' && answerContent?.groupContent?.listContent?.length > 0) {
        return answerContent.groupContent.listContent.map(subQuestion => {
          const options = subQuestion.options?.map((option, index) => ({
            key: String.fromCharCode(65 + index),
            value: option
          })) || []

          return {
            ...question,
            ID: `${question.ID}-${subQuestion.ID}`,
            Content: subQuestion.content,
            Type: subQuestion.type,
            AnswerContent: JSON.stringify([{
              title: subQuestion.content,
              options,
              correctAnswer: subQuestion.correctAnswer
            }])
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
          AnswerContent: JSON.stringify([{
            title: question.Content,
            options,
            correctAnswer: answerContent.correctAnswer
          }])
        }
      }

      return { ...question, AnswerContent: answerContent }
    } catch (e) {
      console.error('Error formatting question:', e)
      return question
    }
  }, [])

  useEffect(() => {
    if (testData?.Sections?.[0]?.Parts) {
      const globalData = getGlobalData()
      if (!globalData) return

      const existingFormattedAnswers = localStorage.getItem('listening_formatted_answers')
      let currentFormatted = existingFormattedAnswers
        ? JSON.parse(existingFormattedAnswers)
        : {
            studentId: globalData.studentId,
            topicId: globalData.topicId,
            skillName: 'LISTENING',
            sessionId: globalData.sessionId,
            sessionParticipantId: globalData.sessionParticipantId,
            questions: []
          }

      const existingQuestionIds = new Set(currentFormatted.questions.map(q => q.questionId))
      const newQuestions = []

      testData.Sections[0].Parts.forEach(part => {
        part.Questions.forEach(question => {
          if (!existingQuestionIds.has(question.ID)) {
            newQuestions.push({
              questionId: question.ID,
              answerAudio: null,
              answerText: question.Type === 'listening-questions-group' ? [] : null
            })
            existingQuestionIds.add(question.ID)
          }
        })
      })

      if (newQuestions.length > 0) {
        const updated = {
          ...currentFormatted,
          questions: [...currentFormatted.questions, ...newQuestions]
        }
        localStorage.setItem('listening_formatted_answers', JSON.stringify(updated))
        setFormattedAnswers(updated)
      }
    }
  }, [testData?.ID, getGlobalData])

  useEffect(() => {
    if (!testData?.Sections?.[0]?.Parts) return

    const listeningGroupQuestions = []
    testData.Sections[0].Parts.forEach(part => {
      part.Questions.forEach(question => {
        if (question.Type === 'listening-questions-group' && question.AnswerContent?.groupContent?.listContent) {
          const parentId = question.ID
          const subQuestions = question.AnswerContent.groupContent.listContent
          const allAnswered = subQuestions.every(sub => userAnswers[`${parentId}-${sub.ID}`] !== undefined)

          if (allAnswered) {
            listeningGroupQuestions.push({
              parentId,
              answers: subQuestions.map(sub => ({ ID: sub.ID, answer: userAnswers[`${parentId}-${sub.ID}`] }))
            })
          }
        }
      })
    })

    if (listeningGroupQuestions.length > 0) {
      setFormattedAnswers(prev => {
        const newQuestions = [...prev.questions]
        listeningGroupQuestions.forEach(group => {
          const idx = newQuestions.findIndex(q => q.questionId === group.parentId)
          if (idx >= 0) {
            newQuestions[idx].answerText = group.answers
          }
        })
        return { ...prev, questions: newQuestions }
      })
    }
  }, [userAnswers, testData])

  const navigatorQuestions = useMemo(() => {
    if (!testData?.Sections?.[0]?.Parts) return []
    const allQuestions = []
    testData.Sections[0].Parts.forEach((part, partIndex) => {
      part.Questions.forEach(question => {
        allQuestions.push({ partIndex, question, sequence: question.Sequence || 999 })
      })
    })
    allQuestions.sort((a, b) => a.sequence - b.sequence)
    return allQuestions.map(({ partIndex, question }) => ({ partIndex, questionIndex: 0, question }))
  }, [testData?.ID])

  const groupedQuestions = useMemo(() => {
    if (!testData?.Sections?.[0]?.Parts) return []
    const audioGroups = {}
    testData.Sections[0].Parts.forEach((part, partIndex) => {
      part.Questions.forEach(question => {
        if (!audioGroups[question.AudioKeys]) {
          audioGroups[question.AudioKeys] = { audioUrl: question.AudioKeys, questions: [], partIndex }
        }
        audioGroups[question.AudioKeys].questions.push({ ...question, sequence: question.Sequence || 999 })
      })
    })
    return Object.values(audioGroups).sort((a, b) => (a.questions[0]?.sequence || 999) - (b.questions[0]?.sequence || 999))
  }, [testData?.ID])

  const unansweredCount = useMemo(() => {
    if (!testData?.Sections?.[0]?.Parts) return 0
    let count = 0
    testData.Sections[0].Parts.forEach(part => {
      part.Questions.forEach(question => {
        if (question.Type === 'listening-questions-group') {
          const subQs = typeof question.AnswerContent === 'string' ? JSON.parse(question.AnswerContent)?.groupContent?.listContent : question.AnswerContent?.groupContent?.listContent
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
    const hasPlayed = playedQuestions[audioQuestionId] && (playedQuestions[audioQuestionId][1] || playedQuestions[audioQuestionId][2])
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
    setUserAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: answer }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAnswers))
      return newAnswers
    })
    
    // Update formatted answers for single questions
    if (!questionId.includes('-')) {
      setFormattedAnswers(prev => {
        const newQs = [...prev.questions]
        const idx = newQs.findIndex(q => q.questionId === questionId)
        if (idx >= 0) newQs[idx].answerText = answer
        return { ...prev, questions: newQs }
      })
    }
  }

  const handleSubmitAnswers = useCallback(async (isAutoSubmit = false) => {
    try {
      const globalData = getGlobalData()
      if (!globalData) throw new Error('Missing required data')
      const payload = { ...formattedAnswers, ...globalData }
      await saveListeningAnswers(payload)
      setIsSubmitted(true)
      localStorage.setItem('listening_test_submitted', 'true')
      localStorage.setItem('current_skill', 'grammar')
    } catch (error) {
      setErrorMessage(error.message)
      setShowErrorModal(true)
    }
  }, [formattedAnswers, getGlobalData, setErrorMessage, setShowErrorModal])

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
        testData={{ ...testData, Parts: navigatorQuestions.map(q => ({ ...q.question.Part, Questions: [q.question] })) }}
        currentQuestion={currentGroup?.questions[0]}
        flatIndex={currentPartIndex}
        totalQuestions={totalQuestions}
        isFlagged={isFlagged}
        onFlag={(f) => {
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
            <Title level={5} className="mb-6 text-lg">{currentGroup.questions[0].Content}</Title>
            <PlayStopButton audioUrl={currentGroup.audioUrl} questionId={currentGroup.questions[0]?.ID} onPlayingChange={setIsAudioPlaying} />
          </>
        )}

        {currentGroup?.questions.map(question => {
          const formattedQ = formatQuestionData(question)
          
          if (Array.isArray(formattedQ)) {
            return (
              <div key={question.ID} className="mt-6">
                {formattedQ.map(subQ => (
                  <div key={subQ.ID} className="mb-8">
                    <Title level={5} className="mb-4 text-base font-normal">{subQ.Content}</Title>
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
              ) : null}
            </div>
          )
        })}
      </TestNavigation>

      <Modal title="Submission Error" open={showErrorModal} onOk={() => setShowErrorModal(false)} onCancel={() => setShowErrorModal(false)} okText="OK">
        <p>{errorMessage}</p>
      </Modal>
    </>
  )
}

export default ListeningTest
