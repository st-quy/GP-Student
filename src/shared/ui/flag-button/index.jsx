import { FlagFilled, FlagOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { useState, useEffect } from 'react'

export default function FlagButton({ onFlag, initialFlagged = false }) {
  const [isFlagged, setIsFlagged] = useState(initialFlagged)

  const handleClick = () => {
    const newFlaggedState = !isFlagged
    setIsFlagged(newFlaggedState)

    if (onFlag) {
      onFlag(newFlaggedState)
    }
  }
  useEffect(() => {
    setIsFlagged(initialFlagged)
  }, [initialFlagged])

  return (
    <Tooltip title={isFlagged ? 'Unflag this question' : 'Flag this question for review'}>
      <Button
        icon={isFlagged ? <FlagFilled className="text-red-600" /> : <FlagOutlined />}
        className={`mx-auto flex h-10 items-center justify-center gap-2 rounded-md border px-4 transition-colors ${
          isFlagged ? 'border-red-300 bg-red-50 hover:border-red-400' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={handleClick}
      >
        <span className={`text-base font-normal ${isFlagged ? 'text-red-600' : ''}`}>
          {isFlagged ? 'Flagged' : 'Flag for Review'}
        </span>
      </Button>
    </Tooltip>
  )
}
