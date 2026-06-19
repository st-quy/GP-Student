// Minimum word count removed — only max word limits are enforced

export const DEFAULT_MAX_WORDS = {
  1: 10,
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

export const limitTextByWords = (text = '', maxWords) => {
  if (!maxWords) return text

  const value = String(text)
  const wordMatches = [...value.matchAll(/\S+/g)]

  if (wordMatches.length <= maxWords) return value

  const lastAllowedWord = wordMatches[maxWords - 1]
  return value.slice(0, lastAllowedWord.index + lastAllowedWord[0].length)
}

const parseWordRange = (text = '') => {
  const normalizedText = String(text)
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')

  const betweenMatch = normalizedText.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*words?/i)
  if (betweenMatch) {
    return { maxWords: Number(betweenMatch[2]) }
  }

  const spacedRangeMatch = normalizedText.match(/\b(?:use|write(?:\s+in\s+sentences?)?)\s+(\d+)\s+(\d+)\s*words?/i)
  if (spacedRangeMatch) {
    return { maxWords: Number(spacedRangeMatch[2]) }
  }

  return { maxWords: null }
}

const parseAllowedMax = (text = '') => {
  const match = String(text).match(/up to\s+(\d+)\s*words?/i)
  return match ? Number(match[1]) : null
}

export const getWritingWordLimits = ({ question, part, partNumber, questionIndex }) => {
  const parsedPartRange = parseWordRange(part?.Content)
  const parsedQuestionRange = parseWordRange(question?.Content)
  const explicitMaxWords = question?.maxWords ?? question?.MaxWords

  const maxWords =
    explicitMaxWords ??
    parseAllowedMax(question?.SubContent) ??
    parseAllowedMax(part?.SubContent) ??
    getLimitValue(DEFAULT_MAX_WORDS, partNumber, questionIndex) ??
    parsedQuestionRange.maxWords ??
    parsedPartRange.maxWords

  return {
    maxWords
  }
}
