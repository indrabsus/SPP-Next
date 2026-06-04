export type Role = "admin" | "admin10" | "admin11" | "admin12"

export type UserLogin = {
  id: string
  nama: string
  username: string
  role: Role
}

export function getRoleByUsername(username: string): Role {
  const user = username.toLowerCase()

  if (user === "adminkeuangan") return "admin"
  if (user === "stafkeuangan10") return "admin10"
  if (user === "stafkeuangan11") return "admin11"
  if (user === "stafkeuangan12") return "admin12"

  return "admin10"
}

export function getAllowedTingkat(role: Role) {
  if (role === "admin") return ["10", "11", "12"]
  if (role === "admin10") return ["10"]
  if (role === "admin11") return ["11"]
  if (role === "admin12") return ["12"]

  return []
}

export function saveAuth(token: string, user: UserLogin) {
  localStorage.setItem("token", token)
  localStorage.setItem("user", JSON.stringify(user))
}

export function getUser(): UserLogin | null {
  if (typeof window === "undefined") return null

  const user = localStorage.getItem("user")
  return user ? JSON.parse(user) : null
}

export function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}