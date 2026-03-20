import RouteProvider from '@app/providers/RouteProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './main.css'
import { Provider } from 'react-redux'

import store from './providers/store'

const queryClient = new QueryClient()

const safePaths = ['/', '/profile', '/login', '/register', '/forgot-password', '/reset-password']
const hasCurrentSkill = localStorage.getItem('current_skill') !== null
const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password']

if (!hasCurrentSkill && !safePaths.includes(window.location.pathname)) {
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