export const PHONE_REG = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g
export const EMAIL_REG = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export const PASSWORD_RULES = [
  { regex: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
  { regex: /[a-z]/, message: 'Password must contain at least one lowercase letter' },
  { regex: /\d/, message: 'Password must contain at least one number' },
  { regex: /[@$!%*?&]/, message: 'Password must contain at least one special character (@$!%*?&)' },
  { regex: /^.{8,}$/, message: 'Password must be at least 8 characters long' },
  { regex: /^\S*$/, message: 'No spaces allowed' }
]
