export const VIETNAMESE_PHONE_REGEX = /^0\d{9}$/

export const sanitizePhoneNumber = value => String(value ?? '').replace(/\D/g, '')

export const isValidVietnamesePhoneNumber = value => VIETNAMESE_PHONE_REGEX.test(sanitizePhoneNumber(value))

export const getRegisterErrorMessage = error => {
  const apiErrors = error?.response?.data?.errors
  const apiMessage = error?.response?.data?.message

  const normalizedErrors = Array.isArray(apiErrors)
    ? apiErrors.map(item => String(item).replace(/Student Code/gi, 'Student ID'))
    : typeof apiErrors === 'string'
      ? apiErrors.replace(/Student Code/gi, 'Student ID')
      : null

  const normalizedMessage = typeof apiMessage === 'string' ? apiMessage.replace(/Student Code/gi, 'Student ID') : ''

  const messages = Array.isArray(normalizedErrors)
    ? normalizedErrors
    : [normalizedErrors || normalizedMessage].filter(Boolean)

  const hasInvalidPhoneError = messages.some(message =>
    /invalid phone format|invalid phone number format/i.test(message)
  )

  if (hasInvalidPhoneError) {
    return 'Invalid phone number format'
  }

  if (messages.length > 0) {
    return messages[0]
  }

  return 'Sign up failed. Please try again.'
}
