import { SpeakingSubmission } from '@assets/images'
import {
  uploadToMinIO,
  initializeSpeakingAnswer,
  addQuestionAnswer,
  submitSpeakingAnswer
} from '@features/speaking/api'
import AudioVisualizer from '@features/speaking/ui/audio-visualizer'
import PartIntro from '@features/speaking/ui/part-intro'
import QuestionDisplay from '@features/speaking/ui/question-display'
import TimerDisplay from '@features/speaking/ui/timer-display'
import NextScreen from '@shared/ui/submission/next-screen'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

const Part = ({ data, timePairs = [{ read: '00:03', answer: '00:15' }], onNextPart }) => {
  const timerRef = useRef(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [phase, setPhase] = useState('reading')
  const [countdown, setCountdown] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorderRef, setMediaRecorderRef] = useState(null)
  const [streamRef, setStreamRef] = useState(null)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [hasUploaded, setHasUploaded] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isButtonLoading, setIsButtonLoading] = useState(false)
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false)
  const autoSubmitTimerRef = useRef(null)
  const buttonRef = useRef(null)

  const parseTime = timeStr => {
    const [min, sec] = timeStr.split(':').map(Number)
    return min * 60 + sec
  }

  const questions = (data.Questions || []).sort((a, b) => a.Sequence - b.Sequence)
  const totalQuestions = questions.length
  const getTimePair = index => {
    const content = (data.Content || '').toLowerCase()

    if (content.includes('part 1')) {
      return { read: '00:05', answer: '00:30' }
    } else if (content.includes('part 2') || content.includes('part 3')) {
      return { read: '00:05', answer: '00:45' }
    } else if (content.includes('part 4')) {
      return { read: '00:05', answer: '02:00' }
    }

    return timePairs[index] || timePairs[timePairs.length - 1] || { read: '00:05', answer: '00:30' }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentTimePair = getTimePair(currentQuestionIndex)
  const [submitted, setSubmitted] = useState(false)

  const submitMutation = useMutation({
    mutationFn: submitSpeakingAnswer,
    onSuccess: () => {
      if ((data.Content || '').toLowerCase().includes('part 4')) {
        setSubmitted(true)
      } else if (onNextPart) {
        onNextPart()
      }
    },
    onError: error => {
      console.error('Error details:', error)
    }
  })

  useEffect(() => {
    setShowIntro(true)
    setIsActive(false)
    setIsTimerRunning(false)
    setPhase('reading')
    setCountdown(parseTime(getTimePair(0).read))
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef) {
      streamRef.getTracks().forEach(track => track.stop())
    }
    if (mediaRecorderRef?.state === 'recording') {
      mediaRecorderRef.stop()
    }
    initializeSpeakingAnswer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.Content, data.TopicID])

  useEffect(() => {
    if (isActive && isTimerRunning) {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            if (phase === 'reading') {
              if (data.Content?.toLowerCase().startsWith('part 4')) {
                setPhase('preparing')
                setCountdown(60)
              } else {
                setPhase('answering')
                setCountdown(parseTime(currentTimePair.answer))
                setIsRecording(true)
                startRecording()
              }
            } else if (phase === 'preparing') {
              setPhase('answering')
              setCountdown(parseTime(currentTimePair.answer))
              setIsRecording(true)
              startRecording()
            } else if (phase === 'answering') {
              setIsRecording(false)
              if (mediaRecorderRef?.state === 'recording') {
                mediaRecorderRef.stop()
              }
              setIsActive(false)
              setIsTimerRunning(false)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isTimerRunning, phase, currentTimePair])

  useEffect(() => {
    if (!isRecording && phase === 'answering' && countdown === 0 && !isAutoSubmitting) {
      setIsAutoSubmitting(true)
      autoSubmitTimerRef.current = setTimeout(() => {
        if (buttonRef.current) {
          buttonRef.current.click()
        }
      }, 2000)

      const timerElement = document.createElement('div')
      timerElement.dataset.autoSubmitTimer = autoSubmitTimerRef.current
      document.body.appendChild(timerElement)
    }

    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current)
        const timerElement = document.querySelector('[data-auto-submit-timer]')
        if (timerElement) {
          timerElement.remove()
        }
      }
    }
  }, [isRecording, phase, countdown])

  useEffect(() => {
    if (isAutoSubmitting) {
      setIsAutoSubmitting(false)
    }
  }, [currentQuestionIndex])

  const handleStartPart = () => {
    setShowIntro(false)
    setIsActive(true)
    setIsTimerRunning(true)
    setPhase('reading')
    setCountdown(parseTime(getTimePair(0).read))
  }

  if (showIntro) {
    return <PartIntro data={data} onStartPart={handleStartPart} />
  }
  if (submitted) {
    localStorage.setItem('current_skill', 'listening')
    return <NextScreen nextPath="/listening" skillName="Speaking" imageSrc={SpeakingSubmission} />
  }

  const getSupportedMimeType = () => {
    const types = ['audio/mpeg', 'audio/mp4', 'audio/webm;codecs=opus']

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        if (type.includes('mpeg')) {
          return type
        } else if (type.includes('mp4')) {
          return type
        }
      }
    }

    return 'audio/webm;codecs=opus'
  }

  const startRecording = () => {
    const mimeType = getSupportedMimeType()
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: mimeType
        })
        setMediaRecorderRef(mediaRecorder)
        setStreamRef(stream)
        const chunks = []
        mediaRecorder.ondataavailable = e => {
          chunks.push(e.data)
        }
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/mpeg' })
          if (!hasUploaded) {
            try {
              setIsUploading(true)
              const result = await uploadToMinIO(blob)

              setHasUploaded(true)
              if (currentQuestion && result.fileUrl) {
                addQuestionAnswer(currentQuestion.ID, result.fileUrl)
              }
            } catch (error) {
              console.error('Failed to upload recording:', error)
            } finally {
              setIsUploading(false)
            }
          }
          stream.getTracks().forEach(track => track.stop())
        }
        mediaRecorder.start(1000)
        setIsRecording(true)
        setHasUploaded(false)
      })
      .catch(err => console.error('Error accessing microphone:', err))
  }

  const handleNextQuestion = async () => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current)
    }
    setIsButtonLoading(true)
    if (isUploading) {
      while (isUploading) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    setCurrentQuestionIndex(prev => prev + 1)
    setPhase('reading')
    setCountdown(parseTime(getTimePair(currentQuestionIndex + 1).read))
    setIsActive(true)
    setIsTimerRunning(true)
    setHasUploaded(false)
    setIsButtonLoading(false)
  }

  const handleNextPart = async () => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current)
    }
    setIsButtonLoading(true)
    if (isUploading) {
      while (isUploading) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    try {
      await submitMutation.mutateAsync()
    } finally {
      setIsButtonLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full flex-row rounded-xl bg-white">
      <QuestionDisplay
        data={data}
        currentQuestion={currentQuestion}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        onNextQuestion={handleNextQuestion}
        onNextPart={handleNextPart}
        isLastQuestion={currentQuestionIndex === totalQuestions - 1}
        showNavigation={!isRecording && countdown === 0 && phase === 'answering'}
        isPart4={data.Content?.toLowerCase().startsWith('part 4')}
        isUploading={isUploading}
        isButtonLoading={isButtonLoading || submitMutation.isPending}
        buttonRef={buttonRef}
      />
      <div className="flex h-auto w-full flex-col items-center justify-center bg-gradient-to-br from-[#003087] via-[#002b6c] to-[#001f4d] p-4 lg:h-screen lg:w-1/3 lg:p-0">
        <h2 className="mb-2 text-2xl font-bold text-white lg:mb-4 lg:text-4xl">
          {phase === 'preparing' ? 'Preparing Time' : phase === 'reading' ? 'Reading Time' : 'Recording Time'}
        </h2>
        <p className="mb-6 text-center text-base text-white/80 lg:mb-12 lg:text-lg">
          {phase === 'preparing'
            ? 'Get ready to read the question'
            : phase === 'reading'
              ? 'Please read the question carefully'
              : 'Please speak clearly into your microphone'}
        </p>

        <div className="relative">
          <TimerDisplay countdown={countdown} phase={phase} content={data.Content} />
          {isRecording && streamRef && (
            <AudioVisualizer isRecording={isRecording} stream={streamRef} diameter={264} phase={phase} />
          )}
        </div>

        {!data.Content?.toLowerCase().startsWith('part 4') && (
          <div className="mt-4 flex gap-2 lg:mt-8">
            <div className={`h-2 w-2 rounded-full ${currentQuestionIndex === 0 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`h-2 w-2 rounded-full ${currentQuestionIndex === 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`h-2 w-2 rounded-full ${currentQuestionIndex === 2 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
        )}
      </div>
    </div>
  )
}

export default Part
