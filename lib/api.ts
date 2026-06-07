const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL belum diset di .env.local")
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const contentType = res.headers.get("content-type") || ""

  let data: any = null

  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null)
  } else {
    const text = await res.text().catch(() => "")
    data = text ? { message: text } : null
  }

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Terjadi kesalahan")
  }

  return data
}