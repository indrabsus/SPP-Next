"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { isAllowedKeuanganUser, saveAuth } from "@/lib/auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password) {
      alert("Username dan password wajib diisi")
      return
    }

    setLoading(true)

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const loginUser = {
        ...res.data,
        role: res.data.username,
        nama_role: res.data.username,
      }

      if (!isAllowedKeuanganUser(loginUser)) {
        alert("Akun ini tidak memiliki akses ke aplikasi keuangan.")
        return
      }

      saveAuth(res.token, loginUser)

      router.push("/dashboard")
    } catch (error: any) {
      alert(error.message || "Login gagal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-md dashboard-card">
        <CardHeader>
          <CardTitle className="text-2xl">Login Keuangan</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
              />
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
              />
            </div>

            <Button className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}