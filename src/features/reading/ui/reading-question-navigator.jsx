import { MenuOutlined } from '@ant-design/icons'
import QuestionNavigator from '@shared/ui/question-navigatior'
import PopupSubmission from '@shared/ui/submission/popup-submission'
import TimeRemaining from '@shared/ui/time-remaining'
import { Button } from 'antd'
import { useState, useEffect } from 'react'

const QuestionNavigatorContainer = ({
  testData,
  userAnswers,
  flaggedQuestions,
  setCurrentPartIndex,
  currentPartIndex,
  handleSubmit
}) => {
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false)
  const [partStatuses, setPartStatuses] = useState([])
  const [isPopupOpen, setIsPopupOpen] = useState(false)

 useEffect(() => {
    const statuses = testData.Parts.map((part, index) => {
      const partQuestions = part.Questions

      // --- LOGIC KIỂM TRA "ALL ANSWERED" ĐẦY ĐỦ ---
      const allAnswered = partQuestions.every(q => {
        const answer = userAnswers[q.ID]

        // 1. Nếu không có câu trả lời, chắc chắn là "chưa trả lời"
        if (answer === undefined) {
          return false
        }

        // 2. Xử lý các loại câu hỏi phức tạp (lưu câu trả lời dưới dạng object/array)
        switch (q.Type) {
          case 'dropdown-list': {
            // Câu trả lời phải là 1 object
            if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) {
              return false
            }

            let parsedAnswerContent
            try {
              parsedAnswerContent =
                typeof q.AnswerContent === 'string' ? JSON.parse(q.AnswerContent) : q.AnswerContent
            } catch (e) {
              return false // Lỗi parse JSON
            }

            let expectedKeysCount = 0
            let answeredKeysCount = 0

            if (parsedAnswerContent.options && Array.isArray(parsedAnswerContent.options)) {
              // Đây là dạng câu hỏi điền vào chỗ trống (như Part 1)
              // Đếm số lượng key mong đợi (ví dụ: "1", "2", "3", "4", "5")
              expectedKeysCount = parsedAnswerContent.options.filter(opt => opt.key !== '0').length
              
              // Đếm số lượng key đã được trả lời (bỏ qua '0' và các giá trị rỗng)
              answeredKeysCount = Object.keys(answer).filter(
                key => key !== '0' && answer[key] !== undefined && answer[key] !== ''
              ).length

            } else if (parsedAnswerContent.leftItems) {
              // Đây là dạng câu hỏi matching (nối cột)
              expectedKeysCount = parsedAnswerContent.leftItems.length

              // Đếm số lượng key đã được trả lời
              answeredKeysCount = Object.keys(answer).filter(
                key => answer[key] !== undefined && answer[key] !== ''
              ).length
            }

            // Nếu không có key nào thì coi như chưa trả lời
            if (expectedKeysCount === 0) {
              return false
            }

            // Chỉ "đã trả lời" khi SỐ LƯỢNG trả lời = SỐ LƯỢNG mong đợi
            return answeredKeysCount === expectedKeysCount
          }

          case 'ordering': {
            // Dạng { partIndex: ..., answer: [...] }
            if (typeof answer !== 'object' || answer === null || !answer.answer || !Array.isArray(answer.answer)) {
              return false
            }
            
            let options = []
            try {
              const parsedContent = typeof q.AnswerContent === 'string' ? JSON.parse(q.AnswerContent) : q.AnswerContent
              options = Array.isArray(parsedContent) ? parsedContent : parsedContent.options || []
            } catch (e) { /* Bỏ qua lỗi */ }

            if (!Array.isArray(options) || options.length === 0) {
                return false; // Không có options thì không thể "answered"
            }

            // Chỉ tính là "đã trả lời" khi số lượng item trong câu trả lời BẰNG số lượng options
            return answer.answer.length === options.length
          }

          case 'matching': {
            // Dạng { leftItemKey: rightItemKey, ... }
            if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) {
              return false
            }

            let leftItems = []
            try {
              const parsedContent = typeof q.AnswerContent === 'string' ? JSON.parse(q.AnswerContent) : q.AnswerContent
              leftItems = parsedContent.leftItems || []
            } catch (e) { /* Bỏ qua lỗi */ }

            if (leftItems.length === 0) {
                return false; // Không có item thì không thể "answered"
            }

            // Kiểm tra xem tất cả các item bên trái đã có câu trả lời chưa
            // Note: Đây là logic đếm, giống như dropdown-list
            const answeredCount = Object.keys(answer).filter(
              key => leftItems.includes(key) && answer[key] !== undefined && answer[key] !== ''
            ).length
            
            return answeredCount === leftItems.length
          }

          // 3. Xử lý các loại câu hỏi đơn giản (như multiple-choice)
          default:
            return answer !== ''
        }
      })
      // --- KẾT THÚC LOGIC KIỂM TRA "ALL ANSWERED" ---


      const hasFlagged = partQuestions.some(q => Array.isArray(flaggedQuestions) && flaggedQuestions.includes(q.ID))

      // --- LOGIC GÁN TRẠNG THÁI (ĐÃ SỬA) ---
      // Ưu tiên:
      
      if (allAnswered && hasFlagged) {
        return 'answered-flagged'
      }
      if (allAnswered) {
        return 'answered' // (Màu xanh) Chỉ khi đã trả lời HẾT
      }
      if (hasFlagged) {
        return 'flagged' // (Màu vàng/cam)
      }
      
      // Nếu không rơi vào các trường hợp trên, nó là 'unanswered' (Màu xám)
      // Kể cả khi nó là câu hỏi hiện tại (index === currentPartIndex)
      return 'unanswered'
    })
    setPartStatuses(statuses)
  }, [testData.Parts, userAnswers, flaggedQuestions, currentPartIndex])
  const handlePartChange = index => {
    setCurrentPartIndex(index)
    setIsNavigatorOpen(false)
  }

  const handleAutoSubmit = () => {
    setIsPopupOpen(true)
  }

  const handleTimeoutSubmit = () => {
    setIsPopupOpen(false)
    handleSubmit()
  }

  return (
    <>
      <div className="relative">
        <Button
          className="fixed bottom-[50%] right-5 z-[48] rounded-full bg-blue-500 p-2 text-white shadow-lg md:hidden"
          onClick={() => setIsNavigatorOpen(!isNavigatorOpen)}
        >
          <MenuOutlined />
        </Button>
        <div
          className={`border-black-300 fixed right-2 h-auto w-60 rounded-lg border bg-white p-2 shadow-lg ${
            isNavigatorOpen ? 'block' : 'hidden'
          } bottom-[65%] z-[48] md:block mdL:bottom-[70%]`}
        >
          <TimeRemaining duration={35 * 60} onAutoSubmit={handleAutoSubmit} />
          <QuestionNavigator
            values={partStatuses.map(status => ({
              type: status
            }))}
            action={handlePartChange}
            position={currentPartIndex}
          />
        </div>
      </div>

      <div className="z-[50]">
        <PopupSubmission isOpen={isPopupOpen} type="timeout" onSubmit={handleTimeoutSubmit} />
      </div>
    </>
  )
}

export default QuestionNavigatorContainer
