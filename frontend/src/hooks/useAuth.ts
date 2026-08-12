import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import api from "@/lib/api"
import { saveAuth, clearAuth, getStoredUser } from "@/lib/auth"
import type { User } from "@/lib/types"

// ── Login ────────────────────────────────────────────────────
interface LoginPayload {
  email: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LoginPayload) => {
      const res = await api.post<{ token: string; user: User }>("/auth/login", data)
      return res.data
    },
    onSuccess: ({ token, user }) => {
      saveAuth(token, user)
      queryClient.setQueryData(["me"], user)
    },
  })
}

// ── Register ─────────────────────────────────────────────────
interface RegisterPayload {
  first_name: string
  last_name: string
  email: string
  phone?: string
  password: string
  role: "student" | "teacher" | "parent"
  grade_code?: User["grade_code"]
  section_code?: User["section_code"]
  student_code?: string
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterPayload) => {
      const res = await api.post<{ message: string; token: string }>("/auth/register", data)
      return res.data
    },
  })
}

interface RequestPasswordResetPayload {
  email: string
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (data: RequestPasswordResetPayload) => {
      const res = await api.post<{ message: string }>("/auth/request-password-reset", data)
      return res.data
    },
  })
}

interface ResetPasswordPayload {
  email: string
  code: string
  password: string
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: ResetPasswordPayload) => {
      const res = await api.post<{ message: string }>("/auth/reset-password", data)
      return res.data
    },
  })
}

// ── Current user ─────────────────────────────────────────────
export function useMe() {
  return useQuery<User>({
    queryKey: ["me"],
    queryFn:  async () => {
      const res = await api.get<User>("/auth/me")
      return res.data
    },
    // Seed from localStorage so first render isn't empty
    initialData: getStoredUser() ?? undefined,
    staleTime: 1000 * 60 * 5, // 5 min
  })
}

// ── Update profile ───────────────────────────────────────────
interface ProfilePayload {
  first_name?: string
  last_name?: string
  age?: number | null
  phone?: string | null
  college?: string | null
  school_cycle?: User["school_cycle"]
  grade_code?: User["grade_code"]
  section_code?: User["section_code"]
  year_of_study?: string | null
  avatar_url?: string | null
  password?: string
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProfilePayload }) => {
      const res = await api.put(`/users/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
    },
  })
}

// ── Logout ───────────────────────────────────────────────────
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate    = useNavigate()

  return () => {
    clearAuth()
    queryClient.clear()
    navigate({ to: "/login" })
  }
}
