import RouteProvider from '@app/providers/RouteProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './main.css'
import { Provider } from 'react-redux'

import store from './providers/store'

const queryClient = new QueryClient()

const isAuthenticated = localStorage.getItem('access_token') !== null
const isPublicAuthRoute = ['/reset-password', '/login', '/forgot-password', '/register', '/'].includes(window.location.pathname)

if (!isAuthenticated && !isPublicAuthRoute) {
  window.location.href = '/login'
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