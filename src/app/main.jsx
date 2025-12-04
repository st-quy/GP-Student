import RouteProvider from '@app/providers/RouteProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './main.css'
import { Provider } from 'react-redux'

import store from './providers/store'

const queryClient = new QueryClient()

const hasCurrentSkill = localStorage.getItem('current_skill') !== null

const currentPath = window.location.pathname

// Danh sách các trang được phép truy cập mà không cần 'current_skill'
// Bao gồm: trang chủ, trang kết quả, trang profile, trang login...
const allowWithoutSkill = [
  '/result', 
  '/profile', 
  '/login', 
  '/register', 
  '/forgot-password',
  '/reset-password',
  '/introduction'
]

// Kiểm tra xem đường dẫn hiện tại có nằm trong danh sách cho phép không
const isAllowedPage = allowWithoutSkill.some(route => currentPath.startsWith(route))

if (!hasCurrentSkill && currentPath !== '/' && !isAllowedPage) {
  window.location.href = '/'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <RouteProvider />
      </Suspense>
    </QueryClientProvider>
  </Provider>
)
