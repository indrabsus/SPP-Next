const API_URL = process.env.NEXT_PUBLIC_API_URL

// Bot WA sekarang dihosting terpisah (project wabot-claude), bukan lagi
// bagian dari backend sakuci-express - endpoint /wa/status, /wa/chats,
// /wa/kirim dipanggil ke sini, dengan kontrak response yang sama persis
// (lihat README wabot-claude) supaya tidak perlu ubah cara pemanggilannya.
const WA_API_URL = process.env.NEXT_PUBLIC_WA_API_URL

// Pesan yang dikembalikan backend (middleware auth) saat token tidak ada /
// tidak valid / kedaluwarsa. Kalau ini muncul padahal kita memang sedang
// mengirim token, berarti sesi login sudah tidak berlaku lagi.
const AUTH_ERROR_MESSAGES = ["Invalid Token.", "Access Denied. No Token Provided."]

function paksaLogout() {
  if (typeof window === "undefined") return

  localStorage.removeItem("token")
  localStorage.removeItem("user")

  if (window.location.pathname !== "/") {
    window.location.href = "/"
  }
}

async function fetchDariBase(
  baseUrl: string | undefined,
  envName: string,
  path: string,
  options: RequestInit
) {
  if (!baseUrl) {
    throw new Error(`${envName} belum diset di .env.local`)
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

  const res = await fetch(`${baseUrl}${path}`, {
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
    const message = data?.message || data?.error || "Terjadi kesalahan"

    if (token && (res.status === 401 || AUTH_ERROR_MESSAGES.includes(message))) {
      paksaLogout()
      // Jangan lempar error ke pemanggil (biar tidak sempat muncul alert
      // "Invalid Token" sesaat sebelum redirect ke halaman login).
      return new Promise<never>(() => {})
    }

    throw new Error(message)
  }

  return data
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  return fetchDariBase(API_URL, "NEXT_PUBLIC_API_URL", path, options)
}

export async function waFetch(path: string, options: RequestInit = {}) {
  return fetchDariBase(WA_API_URL, "NEXT_PUBLIC_WA_API_URL", path, options)
}
