export const DEFAULT_MIN_WORDS = {
  1: 1,
  2: 20,
  3: 30,
  4: [50, 120]
}

export const DEFAULT_MAX_WORDS = {
  1: 5,
  2: 45,
  3: 60,
  4: [75, 225]
}

const getLimitValue = (config, partNumber, questionIndex) => {
  const configuredValue = config?.[partNumber]

  if (Array.isArray(configuredValue)) {
    return configuredValue[questionIndex] ?? null
  }

  return configuredValue ?? null
}

const parseWordRange = (text = '') => {
  const normalizedText = String(text)
  const betweenMatch = normalizedText.match(/(\d+)\s*-\s*(\d+)\s*words?/i)
  if (betweenMatch) {
    return {
      minWords: Number(betweenMatch[1]),
      maxWords: Number(betweenMatch[2])
    }
  }

  const exactMatch = normalizedText.match(/about\s+(\d+)\s*words?/i)
  if (exactMatch) {
    return {
      minWords: Number(exactMatch[1]),
      maxWords: null
    }
  }

  return {
    minWords: null,
    maxWords: null
  }
}

const parseAllowedMax = (text = '') => {
  const match = String(text).match(/up to\s+(\d+)\s*words?/i)
  return match ? Number(match[1]) : null
}

export const getWritingWordLimits = ({ question, part, partNumber, questionIndex }) => {
  const parsedPartRange = parseWordRange(part?.Content)
  const parsedQuestionRange = parseWordRange(question?.Content)
  const explicitMinWords = question?.minWords
  const explicitMaxWords = question?.maxWords

  const minWords =
    explicitMinWords ??
    parsedQuestionRange.minWords ??
    parsedPartRange.minWords ??
    getLimitValue(DEFAULT_MIN_WORDS, partNumber, questionIndex)

  const maxWords =
    explicitMaxWords ??
    parseAllowedMax(question?.SubContent) ??
    parsedQuestionRange.maxWords ??
    parsedPartRange.maxWords ??
    getLimitValue(DEFAULT_MAX_WORDS, partNumber, questionIndex)

  return {
    minWords,
    maxWords
  }
}
