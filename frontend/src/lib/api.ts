import axios from "axios"

// Set VITE_API_URL in frontend/.env (e.g. http://localhost:5000 for dev,
// https://api.edutopia.example.com for production).
const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5000"

const api = axios.create({
  baseURL: API_ORIGIN,
  headers: { "Content-Type": "application/json" },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 — clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export { API_ORIGIN }

export function assetUrl(pathname: string | null | undefined) {
  if (!pathname) return null
  return pathname.startsWith("http") ? pathname : `${API_ORIGIN}${pathname}`
}

export default api
