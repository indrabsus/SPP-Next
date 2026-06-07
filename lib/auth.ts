export type UserLogin = {
  userId: string
  username: string
  id_role: string | number
  role?: string
  nama_role?: string
  gambar?: string | null
  id_data?: string
}

const allowedUsernames = [
  "adminkeuangan",
  "stafkeuangan10",
  "stafkeuangan11",
  "stafkeuangan12",
]

export const saveAuth = (token: string, user: UserLogin) => {
  localStorage.setItem("token", token)
  localStorage.setItem("user", JSON.stringify(user))
}

export const getToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export const getUser = (): UserLogin | null => {
  if (typeof window === "undefined") return null

  const raw = localStorage.getItem("user")
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const logout = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

export const getUsernameRole = (user: UserLogin | null) => {
  return String(user?.username || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim()
}

export const isAllowedKeuanganUser = (user: UserLogin | null) => {
  return allowedUsernames.includes(getUsernameRole(user))
}

export const isAdminKeuangan = (user: UserLogin | null) => {
  return getUsernameRole(user) === "adminkeuangan"
}

export const getAllowedTingkat = (user: UserLogin | null) => {
  const username = getUsernameRole(user)

  if (username === "adminkeuangan") return ["10", "11", "12"]
  if (username === "stafkeuangan10") return ["10"]
  if (username === "stafkeuangan11") return ["11"]
  if (username === "stafkeuangan12") return ["12"]

  return []
}

export const canDeleteLogSpp = (user: UserLogin | null) => {
  return getUsernameRole(user) === "adminkeuangan"
}