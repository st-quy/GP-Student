import {
  CheckCircleFilled,
  CloseCircleFilled,
  LeftOutlined,
  SoundOutlined,
  BulbFilled,
  ReadOutlined,
  EditOutlined,
  CustomerServiceOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'

import { fetchExamReview } from '@features/grade/api'
import SharedHeader from '@shared/ui/base-header'
import { Button, Card, Col, Empty, Layout, Row, Spin, Tag, Typography, message, Divider } from 'antd'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography

// --- HELPERS ---

const renderAudioPlayer = audioUrl => (
  <div className="mb-4 flex w-full items-center gap-3 rounded-lg bg-[#F0F7FF] p-4">
    <div className="flex items-center justify-center rounded-full bg-blue-500 p-2 text-white">
      <SoundOutlined />
    </div>
    <audio controls src={audioUrl} className="w-full" />
  </div>
)

const formatAnswerText = data => {
  if (data === null || data === undefined || data === '') return <Text type="secondary">No answer provided</Text>

  let parsedData = data

  if (typeof data === 'string') {
    const trimmed = data.trim()
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        parsedData = JSON.parse(data)
      } catch (e) {}
    }
  }

  if (Array.isArray(parsedData)) {
    return (
      <div className="flex flex-col gap-2">
        {parsedData.map((item, idx) => {
          if (typeof item === 'string')
            return (
              <div key={idx} className="rounded border border-gray-200 bg-white p-2">
                {item}
              </div>
            )

          const label = item.key || item.left || item.questionId
          const value = item.value || item.right || item.answerText

          return (
            <div key={idx} className="flex flex-wrap items-center rounded border border-gray-200 bg-white p-2 text-sm">
              {label && <span className="mr-2 font-semibold text-gray-600">{label}</span>}
              {label && value && <span className="mx-1 text-gray-400">➔</span>}
              {value && <span className="ml-2 font-bold text-[#003087]">{value}</span>}
            </div>
          )
        })}
      </div>
    )
  }

  if (typeof parsedData === 'object' && parsedData !== null) {
    return (
      <div className="flex flex-col gap-1">
        {Object.entries(parsedData).map(([k, v]) => (
          <div key={k} className="text-sm">
            <span className="font-semibold">{k}:</span> {String(v)}
          </div>
        ))}
      </div>
    )
  }

  return String(parsedData)
}

// --- SUB-COMPONENTS FOR RESULTS ---

const MultipleChoiceResult = ({ question }) => {
  let options = []
  try {
    const rawContent = question.resources?.answerContent || question.AnswerContent
    const answerContent = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    const contentObj = Array.isArray(answerContent) ? answerContent[0] : answerContent
    if (contentObj?.options) {
      options = contentObj.options
    }
  } catch (e) {
    console.error('Error parsing MC options', e)
  }

  const normalize = str =>
    String(str || '')
      .trim()
      .toLowerCase()
  const userAns = normalize(question.userResponse?.text)

  if (!options.length) return <div className="italic text-gray-400">No options available.</div>

  return (
    <div className="mt-4 flex flex-col gap-3">
      {options.map((opt, i) => {
        const optKey = opt.key || String.fromCharCode(65 + i)
        const optValue = opt.value || opt

        const currentOptKey = normalize(optKey)
        const currentOptValue = normalize(optValue)

        const isUserSelected = currentOptKey === userAns || currentOptValue === userAns
        const isCorrect = !!question.isCorrect

        let containerClass = 'border-gray-200 bg-white'
        let keyBoxClass = 'bg-white text-gray-500 border-r border-gray-200'
        let icon = null

        if (isUserSelected) {
          if (isCorrect) {
            containerClass = 'border-green-500 bg-[#F6FFED]'
            keyBoxClass = 'bg-[#52C41A] text-white'
            icon = <CheckCircleFilled className="text-xl text-[#52C41A]" />
          } else {
            containerClass = 'border-red-500 bg-[#FFF1F0]'
            keyBoxClass = 'bg-[#FF4D4F] text-white'
            icon = <CloseCircleFilled className="text-xl text-[#FF4D4F]" />
          }
        }

        return (
          <div
            key={i}
            className={`group flex items-stretch overflow-hidden rounded-lg border transition-all ${containerClass}`}
            style={{ minHeight: '48px' }}
          >
            <div
              className={`flex w-[48px] min-w-[48px] flex-shrink-0 items-center justify-center text-lg font-bold ${keyBoxClass}`}
            >
              {optKey}
            </div>
            <div className="flex flex-1 items-center px-4 py-2 text-base font-medium text-gray-800">{optValue}</div>
            {icon && <div className="flex items-center justify-center px-4">{icon}</div>}
          </div>
        )
      })}
    </div>
  )
}

const DropdownListResult = ({ question }) => {
  let userAnswersMap = {}
  try {
    const raw = question.userResponse?.text
    if (raw) {
      let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) {
        parsed.forEach(item => {
          const k = item.key || item.left || item.questionId
          const v = item.value || item.right || item.answerText
          if (k) userAnswersMap[String(k).trim().toLowerCase()] = v
        })
      } else if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          userAnswersMap[String(k).trim().toLowerCase()] = v
        })
      }
    }
  } catch (e) {}

  let correctAnswers = []
  let leftItems = []

  try {
    const rawContent = question.resources?.answerContent || question.AnswerContent
    const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    if (contentObj) {
      if (contentObj.correctAnswer) {
        const rawCorrect = Array.isArray(contentObj.correctAnswer)
          ? contentObj.correctAnswer
          : Object.entries(contentObj.correctAnswer).map(([k, v]) => ({ key: k, value: v }))
        correctAnswers = rawCorrect.map(item => ({
          key: item.key !== undefined ? item.key : item.left,
          value: item.value !== undefined ? item.value : item.right
        }))
      }
      if (contentObj.leftItems) leftItems = contentObj.leftItems
    }
  } catch (e) {}

  const rowsToRender = leftItems.length > 0 ? leftItems : correctAnswers.map(c => c.key)

  const isPrefilled = (key) => {
    try {
      const rawContent = question.resources?.answerContent || question.AnswerContent
      const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
      if (contentObj?.options && Array.isArray(contentObj.options)) {
        const opt = contentObj.options.find(o => String(o.key).trim() === String(key).trim())
        return opt && Array.isArray(opt.value) && opt.value.length === 1
      }
    } catch (e) {}
    return false
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {rowsToRender.map((rowKey, idx) => {
        const rawKeyText = typeof rowKey === 'string' ? rowKey : rowKey?.key || `Question ${idx + 1}`
        
        if (isPrefilled(rawKeyText)) return null
        
        const normalize = str => String(str || '').trim().toLowerCase()
        
        let correctItem = correctAnswers.find(c => String(c.key) === String(idx + 1))
        if (!correctItem) correctItem = correctAnswers[idx]

        let userSelectedValue = userAnswersMap[normalize(rawKeyText)]
        if (userSelectedValue === undefined) userSelectedValue = userAnswersMap[String(idx)]
        if (userSelectedValue === undefined) userSelectedValue = userAnswersMap[String(idx + 1)]

        const hasAnswer = userSelectedValue !== undefined && userSelectedValue !== null && userSelectedValue !== ''
        const isCorrect = hasAnswer && correctItem && normalize(userSelectedValue) === normalize(correctItem.value)

        return (
          <div key={idx} className="flex flex-col gap-1 border-b border-gray-100 pb-2 last:border-0">
            <div className="flex items-center justify-between">
              <Text strong>{rawKeyText}</Text>
              {hasAnswer ? (
                isCorrect ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>Correct</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>Incorrect</Tag>
                )
              ) : (
                <Tag color="default">No answer</Tag>
              )}
            </div>
            <div className="flex flex-col gap-1 pl-4">
              <div className="text-sm">
                <Text type="secondary">Your answer: </Text>
                <Text delete={!isCorrect && hasAnswer} type={isCorrect ? 'success' : hasAnswer ? 'danger' : 'secondary'}>
                  {userSelectedValue || 'None'}
                </Text>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const OrderingResult = ({ question }) => {
  let userList = []
  let correctMap = {}
  try {
    const raw = question.userResponse?.text
    if (raw) {
      userList = typeof raw === 'string' ? JSON.parse(raw) : raw
    }
  } catch (e) {}

  try {
    const rawContent = question.resources?.answerContent || question.AnswerContent
    const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    if (contentObj?.correctAnswer && Array.isArray(contentObj.correctAnswer)) {
      contentObj.correctAnswer.forEach(item => {
        correctMap[item.value] = String(item.key).trim()
      })
    }
  } catch (e) {}

  const correctOrders = Object.keys(correctMap).map(k => Number(k)).sort((a, b) => a - b)

  return (
    <div className="mt-4 flex flex-col gap-4">
      {correctOrders.map((order, idx) => {
        const userItem = userList?.find(u => Number(u.value) === order)
        const content = userItem ? String(userItem.key).trim() : 'No answer'
        const correctContentForThisSlot = correctMap[order]
        const isCorrectPosition = correctContentForThisSlot === content

        return (
          <div key={idx} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-2 text-sm font-medium text-gray-500">Position {order}</div>
            <div className="flex flex-col gap-2">
              <div className={`rounded-md border p-3 ${isCorrectPosition ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="mb-1 text-xs font-semibold uppercase text-gray-400">Your Answer</div>
                <div className={`font-medium ${isCorrectPosition ? 'text-green-700' : 'text-red-700'}`}>{content}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const GroupAnswerComparison = ({ question }) => {
  let subQuestions = []
  try {
    const rawContent = question.resources?.answerContent || question.AnswerContent
    const answerContent = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    if (answerContent?.groupContent?.listContent) {
      subQuestions = answerContent.groupContent.listContent
    } else if (Array.isArray(answerContent)) {
      subQuestions = answerContent
    }
  } catch (e) {}

  let userAnswersMap = {}
  try {
    if (question.userResponse?.text) {
      const raw = JSON.parse(question.userResponse.text)
      if (Array.isArray(raw)) {
        raw.forEach(item => {
          const k = item.key || item.questionId || item.id || item.ID
          const v = item.value || item.answerText || item.text || item.answer
          if (k) userAnswersMap[String(k)] = v
        })
      } else if (typeof raw === 'object') {
        Object.keys(raw).forEach(k => (userAnswersMap[String(k)] = raw[k]))
      }
    }
  } catch (e) {}

  return (
    <div className="mt-4 flex flex-col gap-4">
      {subQuestions.map((subQ, index) => {
        const subID = String(subQ.ID)
        const userVal = userAnswersMap[subID] || userAnswersMap[String(index + 1)]
        const normalize = s => String(s || '').trim().toLowerCase()
        const isCorrect = normalize(userVal) === normalize(subQ.correctAnswer)

        return (
          <div key={index} className="rounded-lg border border-gray-100 p-4 bg-gray-50">
            <div className="flex justify-between items-start mb-2">
               <Text strong>{index + 1}. {subQ.content || `Question ${index + 1}`}</Text>
               {userVal ? (
                 isCorrect ? <Tag color="success">Correct</Tag> : <Tag color="error">Incorrect</Tag>
               ) : <Tag>No answer</Tag>}
            </div>
            <div className="flex flex-col gap-1 pl-4">
               <div className="text-sm">
                 <Text type="secondary">Your answer: </Text>
                 <Text type={isCorrect ? 'success' : 'danger'}>{userVal || 'None'}</Text>
               </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const SubjectiveAnswerView = ({ question }) => {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="rounded-lg border border-gray-200 bg-[#F8F9FA] p-4">
        <Text strong className="block mb-2 text-[#003087]">Your Answer</Text>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {question.userResponse?.text || <span className="italic text-gray-400">No response recorded.</span>}
        </div>
      </div>
      {question.userResponse?.comment && (
        <div className="rounded-lg border border-blue-50 bg-blue-50/50 p-4">
          <Text strong className="block mb-1"><EditOutlined className="mr-2" />Teacher's Comment</Text>
          <Text className="text-sm">{question.userResponse.comment}</Text>
        </div>
      )}
    </div>
  )
}

const AnswerComparison = ({ question }) => {
  const qType = (question.type || question.Type || '').toLowerCase()
  const rawContent = question.resources?.answerContent || question.AnswerContent
  const isGroupQuestion = qType === 'listening-questions-group' || (rawContent && String(rawContent).includes('listContent'))

  if (isGroupQuestion) return <GroupAnswerComparison question={question} />
  if (qType === 'multiple-choice') return <MultipleChoiceResult question={question} />
  if (qType === 'ordering') return <OrderingResult question={question} />
  if (qType === 'dropdown-list' || qType === 'matching') return <DropdownListResult question={question} />

  // Fallback
  const { userResponse, isCorrect } = question
  return (
    <div className="mt-4">
      <div className={`rounded-lg border p-4 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex justify-between items-center mb-2">
           <Text strong>Answer Review</Text>
           {isCorrect ? <Tag color="success">Correct</Tag> : <Tag color="error">Incorrect</Tag>}
        </div>
        <div className="flex flex-col gap-2">
           <div>
             <Text type="secondary">Your answer: </Text>
             <Text strong>{formatAnswerText(userResponse?.text)}</Text>
           </div>
        </div>
      </div>
    </div>
  )
}

// --- MAIN PAGE ---

const ReviewPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setAccessDeniedMessage(null)
        const response = await fetchExamReview(id)
        if (response && response.data) {
          setData(response.data)
        }
      } catch (error) {
        console.error('Load review error:', error)
        if (error.response && error.response.status === 403) {
          setAccessDeniedMessage(error.response.data.message || 'Access Denied')
        } else {
          message.error('Unable to download review results.')
        }
      } finally {
        setLoading(false)
      }
    }
    if (id) loadData()
  }, [id])

  if (loading && !data) return <Spin size="large" className="flex h-screen items-center justify-center" />
  
  if (accessDeniedMessage) {
    return (
      <Layout className="min-h-screen bg-white">
        <SharedHeader />
        <Content className="mx-auto flex w-full max-w-7xl items-center justify-center p-6" style={{ marginTop: '10vh' }}>
          <div className="flex max-w-lg flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
            <WarningOutlined className="mb-4 text-5xl text-red-500" />
            <Title level={3} className="!mb-2 !text-red-700">Access Denied</Title>
            <Text className="text-lg text-red-600">{accessDeniedMessage}</Text>
            <div className="mt-6">
              <Button type="primary" onClick={() => navigate(-1)} size="large" danger>
                Go Back
              </Button>
            </div>
          </div>
        </Content>
      </Layout>
    )
  }

  if (!data) return <Empty description="No data found" className="mt-20" />

  const skills = [
    { key: 'grammar', label: 'Grammar & Vocabulary', icon: <AppstoreOutlined /> },
    { key: 'listening', label: 'Listening', icon: <CustomerServiceOutlined /> },
    { key: 'reading', label: 'Reading', icon: <ReadOutlined /> },
    { key: 'writing', label: 'Writing', icon: <EditOutlined /> },
    { key: 'speaking', label: 'Speaking', icon: <SoundOutlined /> }
  ]

  return (
    <Layout className="min-h-screen bg-gray-50">
      <SharedHeader />
      <Content className="mx-auto w-full max-w-4xl p-6">
        <div className="mb-6">
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)} type="text" className="mb-4">
            Back to Results
          </Button>
          <Card className="rounded-xl shadow-sm border-none bg-gradient-to-r from-[#003087] to-blue-600 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <Title level={2} className="!text-white !mb-1">{data.participantInfo.sessionName}</Title>
                <Text className="text-blue-100 block">Student: {data.participantInfo.studentName} ({data.participantInfo.studentId})</Text>
                <Text className="text-blue-100 block">Date: {new Date(data.participantInfo.date).toLocaleDateString()}</Text>
              </div>
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm text-center min-w-[120px]">
                <div className="text-3xl font-bold">{data.participantInfo.totalScore}</div>
                <div className="text-xs uppercase tracking-wider opacity-80">Total Score</div>
                <Divider className="bg-white/20 my-2" />
                <div className="text-xl font-semibold">{data.participantInfo.finalLevel}</div>
                <div className="text-xs uppercase tracking-wider opacity-80">Level</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {skills.map(skill => {
            const skillData = data.skills[skill.key]
            if (!skillData || !skillData.questions || skillData.questions.length === 0) return null

            return (
              <div key={skill.key} className="space-y-4">
                <div className="flex items-center gap-3 border-b-2 border-blue-500 pb-2">
                  <span className="text-2xl text-blue-600">{skill.icon}</span>
                  <Title level={3} className="!mb-0 !text-[#003087]">{skill.label}</Title>
                  <Tag color="blue" className="ml-auto px-3 py-1 text-base font-semibold">
                    Score: {skillData.score}
                  </Tag>
                </div>

                <div className="space-y-6">
                  {skillData.questions.map((q, idx) => (
                    <Card key={q.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 w-full overflow-hidden">
                           <div className="mb-4">
                              {q.partContent && <Text className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{q.partContent}</Text>}
                              <div className="text-base font-medium leading-relaxed text-gray-800 whitespace-pre-wrap">
                                {q.questionContent}
                              </div>
                              {q.resources?.audio && (
                                <div className="mt-3">
                                   {renderAudioPlayer(q.resources.audio)}
                                </div>
                              )}
                              {q.resources?.images?.length > 0 && (
                                <div className="mt-3">
                                  <img
                                    src={q.resources.images[0]}
                                    alt="Question"
                                    className="max-h-[300px] rounded-lg border border-gray-100"
                                  />
                                </div>
                              )}
                           </div>

                           <Divider className="my-4" />

                           {['writing', 'speaking'].includes(skill.key) ? (
                             <SubjectiveAnswerView question={q} />
                           ) : (
                             <AnswerComparison question={q} />
                           )}

                           {q.isCorrect && !['writing', 'speaking'].includes(skill.key) && (
                             <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                               <CheckCircleFilled />
                               <Text className="text-sm font-medium">Well done! Your answer is correct.</Text>
                             </div>
                           )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Content>
    </Layout>
  )
}

export default ReviewPage
