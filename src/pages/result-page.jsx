import {
  CheckCircleFilled,
  CloseCircleFilled,
  LeftOutlined,
  SoundOutlined,
  WarningOutlined,
  BulbFilled,
  ReadOutlined,
  EditOutlined,
  CustomerServiceOutlined,
  AppstoreOutlined
} from '@ant-design/icons'

import { fetchExamReview } from '@features/grade/api'

import SharedHeader from '@shared/ui/base-header'

import { Button, Card, Col, Empty, Layout, Row, Spin, Tabs, Tag, Typography, message, Select, Divider, Segmented } from 'antd'

import { useEffect, useState, useMemo } from 'react'

import { useNavigate, useParams } from 'react-router-dom'

const { Content } = Layout

const { Title, Text, Paragraph } = Typography

// --- HELPERS ---

const SideBySideReview = ({ userValue, correctValue, isCorrect }) => {
  const displayUserVal = userValue || 'No answer'
  const displayCorrectVal = correctValue || 'N/A'

  return (
    <div
      className={`mt-4 grid grid-cols-1 gap-4 rounded-xl border p-4 md:grid-cols-2 ${
        isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'
      }`}
    >
      {/* Cột trái: Your Answer */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your Answer</span>
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 shadow-sm ${
            isCorrect ? 'border-green-500 bg-white text-green-600' : 'border-red-500 bg-white text-red-600'
          }`}
        >
          {isCorrect ? (
            <CheckCircleFilled className="text-base" />
          ) : (
            <CloseCircleFilled className="text-base" />
          )}
          <span className="text-base font-bold">{displayUserVal}</span>
        </div>
      </div>

      {/* Cột phải: Correct Answer */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Correct Answer</span>
        <div className="flex items-center gap-2 rounded-lg border border-green-500 bg-white p-3 text-green-600 shadow-sm">
          <CheckCircleFilled className="text-base" />
          <span className="text-base font-bold">{displayCorrectVal}</span>
        </div>
      </div>
    </div>
  )
}

const renderAudioPlayer = audioUrl => (
  <div className="mb-4 flex w-full items-center gap-3 rounded-lg bg-[#F0F7FF] p-4">
    <div className="flex items-center justify-center rounded-full bg-blue-500 p-2 text-white">
      <SoundOutlined />
    </div>

    <audio controls src={audioUrl} className="w-full" />
  </div>
)

const formatAnswerText = data => {
  if (data === null || data === undefined || data === '') return 'No answer'

  let parsedData = data
  if (typeof data === 'string') {
    const trimmed = data.trim()
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try { parsedData = JSON.parse(data) } catch (e) {}
    }
  }

  // Nếu là mảng các object (Matching/Dropdown), format lại thành chuỗi đơn giản
  if (Array.isArray(parsedData)) {
    // Nếu mảng chỉ có 1 phần tử là string
    if (parsedData.length === 1 && typeof parsedData[0] === 'string') return parsedData[0]
    
    return parsedData.map(item => {
      if (typeof item === 'string') return item
      const val = item.value || item.right || item.answerText || item.text
      return val ? String(val) : String(item)
    }).join(', ')
  }

  if (typeof parsedData === 'object' && parsedData !== null) {
    return Object.values(parsedData).join(', ')
  }

  return String(parsedData)
}

// --- SUB-COMPONENTS ---

const QuestionList = ({ questions }) => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="inline-block rounded-lg bg-[#003087] px-6 py-2 text-base font-bold text-white shadow-sm">
          Questions
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {questions.map((q, idx) => (
          <div
            key={q.id || idx}
            className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#003087] font-bold text-white shadow-sm">
              {idx + 1}
            </div>

            <div className="pt-0.5 text-lg font-medium text-gray-800">
              {q.questionContent || q.Content || q.content || 'No content'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SpeakingPartView = ({ partName, questions }) => {
  const userAudio = questions.find(q => q.userResponse?.audio)?.userResponse?.audio
  const contextImage = questions.find(q => q.resources?.images?.length > 0)?.resources?.images?.[0]
  const teacherComment = questions.find(q => q.userResponse?.comment)?.userResponse?.comment

  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <Title level={4} className="!mb-0 text-[#003087]">
          {partName}
        </Title>
      </div>

      <div className="mb-8">
        {contextImage ? (
          <Row gutter={32}>
            <Col xs={24} md={10} className="mb-6 md:mb-0">
              <div className="flex h-full items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-2">
                <img
                  src={contextImage}
                  alt="Context"
                  className="h-auto max-h-[400px] w-full rounded-md object-contain"
                />
              </div>
            </Col>

            <Col xs={24} md={14}>
              <QuestionList questions={questions} />
            </Col>
          </Row>
        ) : (
          <div className="w-full">
            <QuestionList questions={questions} />
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-gray-100 pt-6">
        <div className="rounded-xl border border-blue-100 bg-[#F0F7FF] p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-600 p-2 text-white shadow-sm">
              <SoundOutlined className="text-xl" />
            </div>

            <div>
              <h4 className="m-0 text-lg font-bold text-gray-800">Your Recording</h4>
              <span className="text-sm text-gray-500">Listen to your response for this part</span>
            </div>
          </div>

          {userAudio ? (
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <audio controls src={userAudio} className="h-10 w-full" />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center italic text-gray-400">
              No recording found.
            </div>
          )}

          {teacherComment && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-base font-bold text-[#003087]">
                <EditOutlined />
                Teacher's Feedback
              </div>
              <p className="m-0 text-base leading-relaxed text-gray-700">{teacherComment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- COMPONENT: DROPDOWN LIST RESULT ---

const DropdownListResult = ({ question }) => {
  let userAnswersMap = {}
  const clean = s => String(s || '').replace(/[+.\\s]/g, '').trim().toLowerCase()

  try {
    const raw = question.userResponse?.text
    if (raw) {
      let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) {
        parsed.forEach(item => {
          const k = clean(item.key || item.left || item.id || item.questionId)
          if (k) userAnswersMap[k] = item.value || item.right || item.answerText || item.text
        })
      } else if (typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => {
          userAnswersMap[clean(k)] = v
        })
      }
    }
  } catch (e) {}

  let correctAnswers = []
  try {
    const rawContent = question.resources?.answerContent || question.AnswerContent
    const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    if (contentObj?.correctAnswer) {
      correctAnswers = Array.isArray(contentObj.correctAnswer) 
        ? contentObj.correctAnswer 
        : Object.entries(contentObj.correctAnswer).map(([k, v]) => ({ key: k, value: v }))
    }
  } catch (e) {}

  return (
    <div className="mt-6 flex flex-col gap-4">
      {correctAnswers.map((item, idx) => {
        const keyText = item.key || item.left || String(idx + 1)
        const keyForMap = clean(keyText)
        const correctVal = item.value || item.right
        const userVal = userAnswersMap[keyForMap]
        const isCorrect = clean(userVal) === clean(correctVal)

        return (
          <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
            <div className="mb-2 font-medium text-gray-700">Question {keyText}:</div>
            <SideBySideReview 
              userValue={userVal} 
              correctValue={correctVal} 
              isCorrect={isCorrect} 
            />
          </div>
        )
      })}
    </div>
  )
}

// --- NEW COMPONENT: MULTIPLE CHOICE RESULT ---

const MultipleChoiceResult = ({ question }) => {
  const parseValue = (val) => {
    if (val === null || val === undefined) return null
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0].value || parsed[0].answer || parsed[0].text || parsed[0].answerText || String(parsed[0])
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed.value || parsed.answer || parsed.text || Object.values(parsed)[0]
      }
      return String(parsed)
    } catch (e) {
      return String(val)
    }
  }

  // Thử tìm đáp án ở nhiều nơi khác nhau trong object question
  const userAns = parseValue(question.userResponse?.text) || 
                  parseValue(question.userResponse?.answer) || 
                  parseValue(question.userResponse) || 
                  'No answer'

  const correctAns = parseValue(question.correctAnswer) || 'N/A'
  const isCorrect = !!question.isCorrect

  return (
    <SideBySideReview 
      userValue={userAns} 
      correctValue={correctAns} 
      isCorrect={isCorrect} 
    />
  )
}

// --- COMPONENT: GROUP ANSWER RESULT ---

const GroupAnswerComparison = ({ question }) => {
  let subQuestions = []
  try {
    const rawContent = question.resources?.answerContent || question.AnswerContent
    const answerContent = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    subQuestions = answerContent?.groupContent?.listContent || (Array.isArray(answerContent) ? answerContent : [])
  } catch (e) {}

  let userAnswersMap = {}
  try {
    if (question.userResponse?.text) {
      const raw = JSON.parse(question.userResponse.text)
      if (Array.isArray(raw)) {
        raw.forEach((item, index) => {
          const k1 = String(item.ID || item.id || '').trim()
          const k2 = String(item.key || '').trim()
          const val = item.answer || item.value || item.answerText
          if (k1) userAnswersMap[k1] = val
          if (k2) userAnswersMap[k2] = val
          // Fallback cho Questions 14, 15... (Tìm theo index)
          userAnswersMap[`index-${index}`] = val
        })
      }
    }
  } catch (e) {}

  return (
    <div className="mt-6 flex flex-col gap-6">
      {subQuestions.map((subQ, index) => {
        const subID = String(subQ.ID || subQ.id || '').trim()
        // Chiến lược tìm kiếm đáp án: theo ID -> theo Key -> theo Index
        const userVal = userAnswersMap[subID] || userAnswersMap[String(index + 1)] || userAnswersMap[`index-${index}`]
        const correctVal = subQ.correctAnswer
        const isCorrect = userVal && correctVal && String(userVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase()

        return (
          <div key={index} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <div className="mb-2 text-base font-bold text-gray-800">
              {index + 1}. {subQ.content || `Question ${index + 1}`}
            </div>
            <SideBySideReview 
              userValue={userVal} 
              correctValue={correctVal} 
              isCorrect={!!isCorrect} 
            />
          </div>
        )
      })}
    </div>
  )
}

const ReadingInlineResult = ({ question }) => {
  let userAnswersMap = {}
  let correctAnswersMap = {}
  
  try {
    // 1. Parse User Response
    const rawUser = question.userResponse?.text
    if (rawUser) {
      const parsed = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser
      if (Array.isArray(parsed)) {
        parsed.forEach(item => {
          const k = String(item.key || item.id || item.questionId || '').replace(/[^0-9]/g, '').trim().toLowerCase()
          userAnswersMap[k] = item.value || item.answerText
        })
      } else if (typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => {
          const cleanK = String(k).replace(/[^0-9]/g, '').trim().toLowerCase()
          userAnswersMap[cleanK] = v
        })
      }
    }

    // 2. Parse Correct Answers
    const rawContent = question.resources?.answerContent || question.AnswerContent
    const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    if (contentObj?.correctAnswer) {
      const ans = Array.isArray(contentObj.correctAnswer) 
        ? contentObj.correctAnswer 
        : Object.entries(contentObj.correctAnswer).map(([k,v]) => ({key:k, value:v}))
      
      ans.forEach(a => {
        const k = String(a.key || a.left || '').replace(/[^0-9]/g, '').trim().toLowerCase()
        if (k) correctAnswersMap[k] = a.value || a.right
      })
    }
  } catch (e) {}

  const rawText = question.questionContent || question.Content || ''
  // Tìm tất cả các gap (0., 1., 2., ...) và các key từ correctAnswersMap
  const gapKeysFromText = (rawText.match(/\d+\./g) || []).map(k => k.replace(/[^0-9]/g, '').trim().toLowerCase())
  const allKeys = [...new Set([...gapKeysFromText, ...Object.keys(correctAnswersMap)])].sort((a,b) => parseInt(a) - parseInt(b))

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 whitespace-pre-wrap text-base leading-loose text-gray-800">
        {rawText}
      </div>
      <Divider orientation="left">Answers Comparison</Divider>
      <div className="flex flex-col gap-4">
        {allKeys.map((key, idx) => {
          const userVal = userAnswersMap[key]
          const correctVal = correctAnswersMap[key]
          const isCorrect = userVal && correctVal && String(userVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase()

          return (
            <div key={idx}>
              <div className="mb-1 font-bold text-gray-600">Question {key}.</div>
              <SideBySideReview 
                userValue={userVal} 
                correctValue={correctVal} 
                isCorrect={!!isCorrect} 
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const OrderingResult = ({ question }) => {
  let userList = []
  let correctList = []
  try {
    const rawUser = question.userResponse?.text
    if (rawUser) userList = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser
    const rawContent = question.resources?.answerContent || question.AnswerContent
    const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
    correctList = contentObj?.correctAnswer || []
  } catch (e) {}

  return (
    <div className="mt-6 flex flex-col gap-6">
      <SideBySideReview 
        userValue={Array.isArray(userList) ? userList.map(u => `${u.value}. ${u.key}`).join(' | ') : 'No answer'}
        correctValue={Array.isArray(correctList) ? correctList.map(c => `${c.key}. ${c.value}`).join(' | ') : 'N/A'}
        isCorrect={!!question.isCorrect}
      />
    </div>
  )
}

const AnswerComparison = ({ question }) => {
  const qType = (question.type || question.Type || '').toLowerCase()
  const rawContent = question.resources?.answerContent || question.AnswerContent
  const isGroupQuestion = qType === 'listening-questions-group' || (rawContent && String(rawContent).includes('listContent'))

  if (isGroupQuestion) return <GroupAnswerComparison question={question} />
  
  // Ép loại matching và dropdown-list dùng chung component xử lý mảng
  if (qType === 'multiple-choice') return <MultipleChoiceResult question={question} />
  if (qType === 'ordering') return <OrderingResult question={question} />
  if (qType === 'dropdown-list' || qType === 'matching') return <DropdownListResult question={question} />
  
  const isInlineGapFill = /\d+\./.test(question.questionContent || question.Content)
  if (isInlineGapFill) return <ReadingInlineResult question={question} />

  return (
    <SideBySideReview 
      userValue={formatAnswerText(question.userResponse?.text)} 
      correctValue={formatAnswerText(question.correctAnswer)} 
      isCorrect={!!question.isCorrect} 
    />
  )
}

const SubjectiveAnswerView = ({ question }) => {
  const { userResponse } = question
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="rounded-lg border border-gray-200 bg-[#F8F9FA] p-5">
        <Title level={5} className="mb-3 text-[#003087]">Your Answer</Title>
        <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
          {userResponse?.text || <span className="italic text-gray-400">No response recorded.</span>}
        </div>
      </div>
      {userResponse?.comment && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <EditOutlined className="text-[#003087]" />
            <Text strong className="text-lg">Teacher's Comment</Text>
          </div>
          <Paragraph className="mb-0 text-gray-600">{userResponse.comment}</Paragraph>
        </div>
      )}
    </div>
  )
}

const checkIsFullyCorrect = (q) => {
  const rawUser = q.userResponse?.text
  if (!rawUser || rawUser === '[]' || rawUser === '' || rawUser === '{}') return false

  const normalize = (str) => String(str || '').trim().toLowerCase()

  try {
    const userParsed = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser
    const rawContent = q.resources?.answerContent || q.AnswerContent
    if (!rawContent) return !!q.isCorrect
    const contentObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent

    // Logic kiểm tra đúng sai tùy theo loại câu hỏi
    if (q.isCorrect) return true; // Ưu tiên flag từ server nếu có

    return !!q.isCorrect
  } catch (e) {
    return !!q.isCorrect
  }
}

// --- MAIN PAGE ---

const ResultPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('speaking')
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [filterPart, setFilterPart] = useState('All Parts')

  // --- APTIS-186: Filter States ---
  const [fStatus, setFStatus] = useState('all')
  const [fType, setFType] = useState('all')

  const currentSkillData = useMemo(() => {
    return data?.skills?.[activeTab] || { questions: [] }
  }, [data, activeTab])

  const availableTypes = useMemo(() => {
    const qs = currentSkillData?.questions || []
    const types = qs.map(q => (q.type || q.Type || 'Other').toLowerCase())
    return ['all', ...new Set(types)]
  }, [currentSkillData])

  const filteredQuestions = useMemo(() => {
    let list = Array.isArray(currentSkillData?.questions) ? [...currentSkillData.questions] : []
    if (fStatus === 'correct') list = list.filter(q => q.isCorrect)
    if (fStatus === 'incorrect') list = list.filter(q => !q.isCorrect)
    if (fType !== 'all') list = list.filter(q => (q.type || q.Type || '').toLowerCase() === fType)
    return list
  }, [currentSkillData, fStatus, fType])

  useEffect(() => {
    if (filteredQuestions.length > 0 && !filteredQuestions.some(q => q.id === selectedQuestionId)) {
      setSelectedQuestionId(filteredQuestions[0].id)
    }
  }, [filteredQuestions])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetchExamReview(id)
        if (response?.data) {
          setData(response.data)
          const skills = response.data.skills || {}
          const firstSkill = Object.keys(skills).find(k => skills[k]?.questions?.length > 0)
          if (firstSkill) setActiveTab(firstSkill)
        }
      } catch (error) {
        message.error('Unable to download test results.')
      } finally {
        setLoading(false)
      }
    }
    if (id) loadData()
  }, [id])

  const currentQuestion = currentSkillData?.questions?.find(q => q.id === selectedQuestionId)
  const maxScore = ['speaking', 'writing'].includes(activeTab) ? 50 : 20

  const countGreenQuestions = useMemo(() => {
    if (!currentSkillData?.questions) return 0
    return currentSkillData.questions.filter(q => checkIsFullyCorrect(q)).length
  }, [currentSkillData])

  const speakingGroups = useMemo(() => {
    if (activeTab !== 'speaking' || !currentSkillData?.questions) return {}
    const groups = {}
    const chunkSize = 3
    for (let i = 0; i < currentSkillData.questions.length; i += chunkSize) {
      const partName = `Part ${Math.floor(i / chunkSize) + 1}`
      if (filterPart !== 'All Parts' && partName !== filterPart) continue
      groups[partName] = currentSkillData.questions.slice(i, i + chunkSize)
    }
    return groups
  }, [activeTab, currentSkillData, filterPart])

  const partOptions = useMemo(() => {
    if (!currentSkillData?.questions || activeTab !== 'speaking') return []
    const num = Math.ceil(currentSkillData.questions.length / 3)
    return ['All Parts', ...Array.from({length: num}, (_, i) => `Part ${i+1}`)]
  }, [currentSkillData, activeTab])

  if (loading && !data) return <Spin size="large" className="flex h-screen items-center justify-center" />
  if (!data) return <Empty description="No data found" className="mt-20" />

  const tabIcons = {
    speaking: <SoundOutlined />,
    listening: <CustomerServiceOutlined />,
    reading: <ReadOutlined />,
    writing: <EditOutlined />,
    grammar: <AppstoreOutlined />
  }

  const QuestionHeaderDisplay = ({ question }) => {
    const formatPartContent = content => {
      if (!content) return null
      return content.startsWith('Part') ? (content.includes(':') ? content.split(':')[1].trim() : content.split('-').slice(1).join(' ').trim()) : content
    }
    return (
      <div className="mb-4 rounded-lg bg-[#F5F8FF] p-5">
        {question.resources?.audio && renderAudioPlayer(question.resources.audio)}
        <div className="mb-3 text-lg font-bold text-gray-900">{formatPartContent(question.partContent)}</div>
        {question.partSubContent && <div className="mb-2 text-sm font-bold uppercase text-gray-500">{question.partSubContent}</div>}
        <div className="mb-2 whitespace-pre-wrap text-lg font-medium leading-relaxed text-gray-800">
          {question.questionContent || question.Content}
        </div>
        {question.resources?.images?.length > 0 && <img src={question.resources.images[0]} alt="Q" className="mt-4 max-h-[300px] rounded-lg border border-gray-200" />}
      </div>
    )
  }

  return (
    <Layout className="min-h-screen bg-white">
      <SharedHeader />
      <Content className="mx-auto w-full max-w-7xl p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)} className="border-none px-0 shadow-none">Back in history</Button>
          <div className="flex items-center gap-3">
            <Tag color="blue" className="px-3 py-1 text-sm">Level: {data.participantInfo.finalLevel || 'N/A'}</Tag>
            <Tag color="green" className="px-3 py-1 text-sm">Total score: {data.participantInfo.totalScore || 0}</Tag>
          </div>
        </div>

        <div className="mb-6">
          <Title level={2} className="!mb-1 text-[#111827]">Answer Review</Title>
          <Text type="secondary">Review your answers and learn from detailed explanations</Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={Object.keys(data.skills).map(key => ({
            key,
            label: <div className="flex items-center gap-2 px-2 py-1">{tabIcons[key]}<span className="capitalize">{key === 'grammar' ? 'Grammar & Vocab' : key}</span></div>
          }))}
          className="mb-6 border-b border-gray-200"
        />

        <div className="mb-8 flex flex-col items-center justify-between rounded-xl bg-[#003087] p-6 text-white shadow-lg md:flex-row">
          <div>
            <h2 className="mb-1 text-2xl font-bold capitalize">{activeTab} Performance</h2>
            <p className="text-blue-100 opacity-90">Great job! You demonstrated strong communication skills.</p>
          </div>
          <div className="mt-4 flex gap-8 md:mt-0">
            <div className="text-center">
              <div className="text-4xl font-bold">{currentSkillData?.score || 0}<span className="text-2xl font-normal text-blue-300">/{maxScore}</span></div>
              <div className="text-xs uppercase opacity-80">Score</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">
                {['writing', 'speaking'].includes(activeTab)
                  ? '--'
                  : `${countGreenQuestions}/${currentSkillData?.questions.length}`}
              </div>
              <div className="text-xs uppercase tracking-wider opacity-80">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{data.participantInfo.timeSpent || '28m'}</div>
              <div className="text-xs uppercase tracking-wider opacity-80">Time Spent</div>
            </div>
          </div>
        </div>

        <Row gutter={24}>
          {!(activeTab === 'speaking' || activeTab === 'writing') && (
            <Col xs={24} lg={6} className="mb-6">
              <Card className="rounded-lg border border-gray-200 shadow-sm" bodyStyle={{ padding: '16px' }}>
                <div className="mb-4 flex items-center justify-between">
                  <Title level={5} className="!mb-0">Question Navigator</Title>
                  {(fStatus !== 'all' || fType !== 'all') && (
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={() => { setFStatus('all'); setFType('all'); }}
                      className="p-0 text-xs"
                    >
                      Reset
                    </Button>
                  )}
                </div>

                <Segmented
                  block
                  size="small"
                  value={fStatus}
                  onChange={setFStatus}
                  className="mb-3"
                  options={[
                    { label: 'All', value: 'all' },
                    { label: 'Correct', value: 'correct' },
                    { label: 'Wrong', value: 'incorrect' },
                  ]}
                />

                <Select
                  size="small"
                  value={fType}
                  onChange={setFType}
                  className="mb-4 w-full"
                  options={availableTypes.map(type => ({
                    label: type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1),
                    value: type
                  }))}
                />

                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Found: {filteredQuestions.length} Questions
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {filteredQuestions.map((q, index) => {
                    const isSelected = q.id === selectedQuestionId
                    const isTrulyCorrect = checkIsFullyCorrect(q)
                    let bgColor = isSelected ? '!bg-[#003087] !text-white' : isTrulyCorrect ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                    if (['writing'].includes(activeTab) && !isSelected) bgColor = q.userResponse ? 'bg-blue-50 text-blue-600' : 'bg-gray-100'
                    return (
                      <div key={q.id} onClick={() => setSelectedQuestionId(q.id)} className={`flex h-10 cursor-pointer items-center justify-center rounded font-semibold transition-all ${bgColor} hover:opacity-80`}>
                        {currentSkillData.questions.indexOf(q) + 1}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </Col>
          )}

          <Col xs={24} lg={(activeTab === 'speaking' || activeTab === 'writing') ? 24 : 18}>
            {activeTab === 'speaking' ? (
              <div className="flex flex-col gap-6">
                {Object.entries(speakingGroups).map(([partName, questions]) => (
                  <SpeakingPartView key={partName} partName={partName} questions={questions} />
                ))}
              </div>
            ) : activeTab === 'writing' ? (
              <div className="flex flex-col gap-6">
                {currentSkillData?.questions.map((q, idx) => (
                  <div key={q.id || idx} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <Title level={4} className="!mb-4">{`Writing Task ${idx + 1}:`}</Title>
                    <QuestionHeaderDisplay question={q} />
                    <SubjectiveAnswerView question={q} />
                  </div>
                ))}
              </div>
            ) : currentQuestion ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <Title level={4} className="!mb-4">{`Question ${currentSkillData.questions.indexOf(currentQuestion) + 1}:`}</Title>
                <QuestionHeaderDisplay question={currentQuestion} />
                {activeTab === 'writing' ? <SubjectiveAnswerView question={currentQuestion} /> : <AnswerComparison question={currentQuestion} />}
                {activeTab !== 'writing' && currentQuestion.isCorrect && (
                  <div className="mt-6 rounded-lg border border-blue-100 bg-[#F0F9FF] p-5">
                    <div className="mb-2 flex items-center gap-2 text-[#003087]">
                      <BulbFilled className="text-xl" />
                      <span className="text-lg font-bold">Explanation</span>
                    </div>
                    <div className="leading-relaxed text-gray-700">The correct answer is derived from the key information provided in the question text.</div>
                  </div>
                )}
              </div>
            ) : <Empty />}
          </Col>
        </Row>
      </Content>
    </Layout>
  )
}

export default ResultPage
