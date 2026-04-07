import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { defineConfig, loadEnv } from 'vite'

const certificateDirectory = path.resolve(__dirname, '../certs')
const certificatePath = path.join(certificateDirectory, 'public.crt')
const privateKeyPath = path.join(certificateDirectory, 'private.key')
const httpsConfig =
  fs.existsSync(certificatePath) && fs.existsSync(privateKeyPath)
    ? {
        cert: fs.readFileSync(certificatePath),
        key: fs.readFileSync(privateKeyPath)
      }
    : undefined

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    base: "/",
    server: {
      port: 8080,
      strictPort: true,
      host: true,
      https: httpsConfig,
      origin: `${httpsConfig ? 'https' : 'http'}://localhost:8080`,
    },
    preview: {
      port: 8080,
      strictPort: true,
      https: httpsConfig
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve('./src'),
        '@app': path.resolve('./src/app'),
        '@features': path.resolve('./src/features'),
        '@shared': path.resolve('./src/shared'),
        '@pages': path.resolve('./src/pages'),
        '@assets': path.resolve('./src/assets')
      }
    },
    define: {
      'process.env': env
    }
  }
})
