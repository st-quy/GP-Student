import {
  CheckCircleFilled,
  CloseCircleFilled,
  DownloadOutlined,
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
import { Button, Card, Col, Empty, Layout, Row, Spin, Tabs, Tag, Typography, message, Select } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography

const ResultPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('speaking')
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetchExamReview(id)
        if (response && response.data) {
          setData(response.data)
          const skills = response.data.skills || {}
          // Ưu tiên hiển thị tab nào có điểm hoặc có câu hỏi
          const firstSkill = Object.keys(skills).find(k => skills[k]?.questions?.length > 0)
          if (firstSkill) setActiveTab(firstSkill)
        }
      } catch (error) {
        console.error("Load result error:", error)
        message.error('Unable to download test results.')
      } finally {
        setLoading(false)
      }
    }
    if (id) loadData()
  }, [id])

  useEffect(() => {
    if (data && data.skills && data.skills[activeTab]?.questions?.length > 0) {
      setSelectedQuestionId(data.skills[activeTab].questions[0].id)
    } else {
      setSelectedQuestionId(null)
    }
  }, [activeTab, data])

  const currentSkillData = data?.skills[activeTab]
  const currentQuestion = currentSkillData?.questions.find(q => q.id === selectedQuestionId)

  // --- RENDERERS CHO TỪNG LOẠI CÂU HỎI ---

  const renderAudioPlayer = (audioUrl) => (
    <div className="w-full bg-[#F0F7FF] p-4 rounded-lg mb-4 flex items-center gap-3">
        <div className="bg-blue-500 rounded-full p-2 text-white flex items-center justify-center">
            <SoundOutlined />
        </div>
        <audio controls src={audioUrl} className="w-full" />
    </div>
  )

  // Render nội dung câu trả lời (Text/JSON)
  const formatAnswerText = (text) => {
    if (!text) return <Text type="secondary">No answer provided</Text>
    try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) {
            return (
                <div className="flex flex-col gap-2">
                    {parsed.map((item, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-gray-200 text-sm">
                            <span className="font-semibold text-gray-600">{item.key || item.left}</span>
                            <span className="mx-2">➔</span>
                            <span className="font-bold text-[#003087]">{item.value || item.right}</span>
                        </div>
                    ))}
                </div>
            )
        }
        return text
    } catch (e) {
        return text
    }
  }

  // Component hiển thị hộp so sánh đáp án (Cho Listening/Reading/Grammar)
  const AnswerComparison = ({ question }) => {
    const { userResponse, correctAnswer, isCorrect } = question
    
    // Format đáp án đúng để hiển thị
    const formattedCorrectAnswer = typeof correctAnswer === 'string' ? correctAnswer : JSON.stringify(correctAnswer)

    return (
      <Row gutter={16} className="mt-4">
        {/* Cột: Câu trả lời của bạn */}
        <Col span={12} xs={24} md={12}>
            <div className={`h-full rounded-lg border p-4 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? <CheckCircleFilled className="text-green-500" /> : <CloseCircleFilled className="text-red-500" />}
                    <Text strong>Your Answer</Text>
                </div>
                <div className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {!isCorrect && <div className="text-xs uppercase font-bold mb-1">Incorrect</div>}
                    {formatAnswerText(userResponse?.text)}
                </div>
            </div>
        </Col>

        {/* Cột: Đáp án đúng */}
        <Col span={12} xs={24} md={12}>
            <div className="h-full rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircleFilled className="text-green-500" />
                    <Text strong>Correct Answer</Text>
                </div>
                <div className="text-sm font-semibold text-green-700">
                    <div className="text-xs uppercase font-bold text-green-600 mb-1">Option / Value</div>
                    {formatAnswerText(formattedCorrectAnswer)}
                </div>
            </div>
        </Col>
      </Row>
    )
  }

  // Component hiển thị cho Speaking/Writing (Không có cột đúng/sai, chỉ có bài làm + nhận xét)
  const SubjectiveAnswerView = ({ question }) => {
    const { userResponse } = question
    const isSpeaking = activeTab === 'speaking'

    return (
      <div className="mt-4 flex flex-col gap-4">
        {/* Box bài làm */}
        <div className="bg-[#F8F9FA] border border-gray-200 rounded-lg p-5">
            <Title level={5} className="text-[#003087] mb-3">
                {isSpeaking ? 'Your Speaking Response' : 'Your Answer'}
            </Title>
            
            {isSpeaking && userResponse?.audio ? (
                <div className="bg-white p-3 rounded border border-gray-200">
                    <audio controls src={userResponse.audio} className="w-full" />
                </div>
            ) : (
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {userResponse?.text || <span className="text-gray-400 italic">No response recorded.</span>}
                </div>
            )}
        </div>

        {/* Box nhận xét giáo viên (nếu có) */}
        {userResponse?.comment && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <EditOutlined className="text-[#003087]" />
                    <Text strong className="text-lg">Teacher's Comment</Text>
                </div>
                <Paragraph className="text-gray-600 mb-0">
                    {userResponse.comment}
                </Paragraph>
            </div>
        )}
      </div>
    )
  }

  if (loading) return <Spin size="large" className="flex h-screen items-center justify-center" />
  if (!data) return <Empty description="No data found" className="mt-20" />

  // Icon mapping
  const tabIcons = {
    speaking: <SoundOutlined />,
    listening: <CustomerServiceOutlined />,
    reading: <ReadOutlined />,
    writing: <EditOutlined />,
    grammar: <AppstoreOutlined />
  }

  return (
    <Layout className="min-h-screen bg-white">
      <SharedHeader />
      <Content className="mx-auto w-full max-w-7xl p-6">
        {/* Top Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            icon={<LeftOutlined />}
            onClick={() => navigate(-1)}
            className="w-fit border-none bg-transparent px-0 shadow-none hover:bg-transparent"
          >
            Back in history
          </Button>
          <div className="flex items-center gap-3">
             <Tag color="blue" className="px-3 py-1 text-sm">
                Level: {data.participantInfo.finalLevel || 'N/A'}
             </Tag>
             <Tag color="green" className="px-3 py-1 text-sm">
                Total score: {data.participantInfo.totalScore || 0}
             </Tag>
          </div>
        </div>
        <div className="flex justify-between items-start mb-6">
            <div>
                <Title level={2} className="!mb-1 !text-[#111827]">Full English Proficiency Exam - Answer Review</Title>
                <Text type="secondary">Review your answers and learn from detailed explanations</Text>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="text-gray-500 text-sm">Completed on {new Date(data.participantInfo.date).toLocaleDateString()}</div>
                <Button type="primary" icon={<DownloadOutlined />} className="bg-[#003087]">Download Report (PDF)</Button>
            </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6 border-b border-gray-200">
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={Object.keys(data.skills).map(key => ({
                    key,
                    label: (
                        <div className="flex items-center gap-2 px-2 py-1">
                            {tabIcons[key]}
                            <span className="capitalize">{key === 'grammar' ? 'Grammar & Vocabulary' : key}</span>
                        </div>
                    )
                }))}
                className="custom-tabs"
            />
        </div>

        {/* Blue Score Banner */}
        <div className="bg-[#003087] rounded-xl p-6 text-white mb-8 shadow-lg flex flex-col md:flex-row justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold mb-1 capitalize">
                    {activeTab === 'grammar' ? 'Grammar & Vocabulary' : activeTab} Performance
                </h2>
                <p className="text-blue-100 opacity-90">Great job! You demonstrated strong communication skills.</p>
            </div>
            <div className="flex gap-8 mt-4 md:mt-0">
                <div className="text-center">
                    <div className="text-4xl font-bold">{currentSkillData?.score || 0}<span className="text-2xl text-blue-300 font-normal">/20</span></div>
                    <div className="text-xs uppercase tracking-wider opacity-80">Score</div>
                </div>
                <div className="text-center">
                    {/* Mock data for Correct count if not available */}
                    <div className="text-4xl font-bold">
                        {['writing', 'speaking'].includes(activeTab) ? '--' : 
                         `${currentSkillData?.questions.filter(q => q.isCorrect).length}/${currentSkillData?.questions.length}`}
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
            {/* Left Sidebar: Filters & Navigator */}
            <Col xs={24} lg={6} className="mb-6">
                <Card className="shadow-sm border border-gray-200 rounded-lg">
                    <Title level={5} className="mb-4">Filters</Title>
                    <div className="mb-6">
                        <Text className="block mb-2 text-gray-600 text-sm">Filter by Part</Text>
                        <Select defaultValue="All Parts" className="w-full" size="large">
                            <Select.Option value="All Parts">All Parts</Select.Option>
                        </Select>
                    </div>
                    
                    <Title level={5} className="mb-3 text-sm text-gray-600">Question Navigator</Title>
                    <div className="grid grid-cols-5 gap-2">
                        {currentSkillData?.questions.map((q, index) => {
                            const isSelected = q.id === selectedQuestionId
                            let bgColor = 'bg-gray-100 text-gray-600'
                            
                            if (isSelected) {
                                bgColor = '!bg-[#003087] !text-white'
                            } else if (['writing', 'speaking'].includes(activeTab)) {
                                bgColor = q.userResponse ? 'bg-blue-50 text-blue-600' : 'bg-gray-100'
                            } else {
                                bgColor = q.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                            }

                            return (
                                <div
                                    key={q.id}
                                    onClick={() => setSelectedQuestionId(q.id)}
                                    className={`
                                        h-10 flex items-center justify-center rounded font-semibold cursor-pointer transition-all
                                        ${bgColor} hover:opacity-80
                                    `}
                                >
                                    {index + 1}
                                </div>
                            )
                        })}
                    </div>
                </Card>
            </Col>

            {/* Right Content: Question Detail */}
            <Col xs={24} lg={18}>
                {currentQuestion ? (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        {/* Question Header */}
                        <div className="mb-4">
                            <Title level={4} className="!mb-4">
                                {`Question ${currentSkillData.questions.indexOf(currentQuestion) + 1}:`}
                            </Title>
                            
                            {/* Question Content Box */}
                            <div className="bg-[#F5F8FF] rounded-lg p-5 mb-4">
                                {currentQuestion.resources?.audio && renderAudioPlayer(currentQuestion.resources.audio)}
                                
                                {currentQuestion.partSubContent && (
                                    <div className="text-gray-500 text-sm mb-2 uppercase tracking-wide font-bold">
                                        {currentQuestion.partSubContent}
                                    </div>
                                )}
                                
                                <div className="text-gray-800 text-lg leading-relaxed">
                                    {currentQuestion.questionContent}
                                </div>

                                {currentQuestion.resources?.images?.length > 0 && (
                                    <div className="mt-4">
                                        <img 
                                            src={currentQuestion.resources.images[0]} 
                                            alt="Question" 
                                            className="max-h-[300px] rounded-lg border border-gray-200 shadow-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Answer Section */}
                        {['writing', 'speaking'].includes(activeTab) ? (
                            <SubjectiveAnswerView question={currentQuestion} />
                        ) : (
                            <AnswerComparison question={currentQuestion} />
                        )}

                        {/* Explanation Box */}
                        {!['writing', 'speaking'].includes(activeTab) && (
                            <div className="mt-6 bg-[#F0F9FF] border border-blue-100 rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-2 text-[#003087]">
                                    <div className="bg-blue-100 p-1 rounded text-blue-600">
                                        <BulbFilled />
                                    </div>
                                    <span className="font-bold text-lg">Explanation</span>
                                </div>
                                <div className="text-gray-700 leading-relaxed">
                                    {/* Mock explanation nếu backend chưa trả về */}
                                    The correct answer is derived from the key information provided in the question text.
                                    Review the grammar rules regarding this topic for more details.
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <WarningOutlined className="text-4xl mb-2" />
                        <span>Select a question to view details</span>
                    </div>
                )}
            </Col>
        </Row>
      </Content>
    </Layout>
  )
}

export default ResultPage