import { Form, Input, Typography } from 'antd'

const { Text, Title } = Typography

const QuestionForm = ({
  currentPart,
  partNumber,
  answers,
  handleTextChange,
  countWords,
  wordCounts,
  DEFAULT_MAX_WORDS
}) => {
  const handleTextAreaChange = (fieldName, value, maxWords) => {
    const wordCount = countWords(value || '')
    if (!maxWords || wordCount <= maxWords) {
      handleTextChange(fieldName, value)
    }
  }

  const handleKeyDown = (e, fieldName, maxWords) => {
    if (maxWords && wordCounts[fieldName] >= maxWords) {
      if (e.key === ' ' || e.keyCode === 32) {
        e.preventDefault()
      }
    }
  }

  const index = currentPart.SubContent.indexOf(',')
  const first = index !== -1 ? currentPart.SubContent.slice(0, index + 1) : currentPart.SubContent
  const rest = index !== -1 ? currentPart.SubContent.slice(index + 1).trim() : ''
const commaIndex = currentPart.SubContent.indexOf(',');

// Tìm vị trí dấu chấm cuối cùng (kết thúc nội dung)
const lastPeriodIndex = currentPart.SubContent.lastIndexOf('.');

// Cắt phần lời chào
const greeting = currentPart.SubContent.slice(0, commaIndex + 1).trim();

// Cắt phần nội dung từ sau dấu phẩy đến dấu chấm cuối cùng
const content = currentPart.SubContent.slice(commaIndex + 1, lastPeriodIndex + 1).trim();

// Cắt phần chữ ký từ sau dấu chấm cuối cùng
const signature = currentPart.SubContent.slice(lastPeriodIndex + 1).trim();

  return (
    <Form layout="vertical">
      <div className="mb-4 flex items-center justify-between">
        <Title level={5} className="text-justify">
          {currentPart.Content.replace(/^Part\s*\d+:\s*/i, '')
            .replace(/\(\d+(\.\d+)?\s*points?\)/i, '')
            .trim()}
        </Title>
      </div>
      <div className='mb-4 w-full'>
        <Typography>
          {greeting}
          <br />
          {content}
          <br/>
          {signature}
        </Typography>
        </div>

      {[...currentPart.Questions]
        .sort((a, b) => a.Sequence - b.Sequence)
        .map((question, index) => {
          const fieldName = `answer-${currentPart.ID}-${index}`
          const maxWords =
            question.maxWords ??
            (Array.isArray(DEFAULT_MAX_WORDS[partNumber])
              ? DEFAULT_MAX_WORDS[partNumber][index]
              : DEFAULT_MAX_WORDS[partNumber])

          return (
            <Form.Item
              key={index}
              label={
                <Text className="text-base">
                  {(() => {
                    const cleanedContent = question.Content.replace(/^\d+\.\s*/, '')
                      .replace(/\(\d+(\.\d+)?\s*points?\)/i, '')
                      .trim()

                    const match = cleanedContent.match(/^([A-Z][a-z]+):\s*(.*)$/)
                    if (match) {
                      const [, name, content] = match
                      return (
                        <>
                          <strong>{name}:</strong> {content}
                        </>
                      )
                    }
                    return cleanedContent
                  })()}
                </Text>
              }
            >
              <Input.TextArea
                rows={partNumber === 1 ? 1 : 5}
                autoSize={partNumber === 1 ? { minRows: 1, maxRows: 3 } : { minRows: 5, maxRows: 10 }}
                className="w-full"
                placeholder="Enter your answer here"
                value={answers[fieldName] || ''}
                onChange={e => handleTextAreaChange(fieldName, e.target.value, maxWords)}
                onKeyDown={e => handleKeyDown(e, fieldName, maxWords)}
                disabled={maxWords && wordCounts[fieldName] > maxWords}
              />
              {maxWords && (
                <Text
                  className={`mt-1 block text-sm ${wordCounts[fieldName] === maxWords ? 'text-red-500' : 'text-gray-500'}`}
                >
                  {`Word count: ${wordCounts[fieldName] || 0} / ${maxWords}`}
                </Text>
              )}
            </Form.Item>
          )
        })}
    </Form>
  )
}

export default QuestionForm
