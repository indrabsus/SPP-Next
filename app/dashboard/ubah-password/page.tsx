"use client"

import { useState } from "react"
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react"

import { apiFetch } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function UbahPasswordPage() {
  const [passwordLama, setPasswordLama] = useState("")
  const [passwordBaru, setPasswordBaru] = useState("")
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("")

  const [showLama, setShowLama] = useState(false)
  const [showBaru, setShowBaru] = useState(false)
  const [showKonfirmasi, setShowKonfirmasi] = useState(false)

  const [loading, setLoading] = useState(false)

  const passwordMatch =
    passwordBaru.length > 0 && passwordBaru === konfirmasiPassword

  const passwordTidakSama =
    konfirmasiPassword.length > 0 && passwordBaru !== konfirmasiPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordLama || !passwordBaru || !konfirmasiPassword) {
      alert("Semua field wajib diisi")
      return
    }

    if (passwordBaru.length < 6) {
      alert("Password baru minimal 6 karakter")
      return
    }

    if (passwordBaru !== konfirmasiPassword) {
      alert("Konfirmasi password tidak sama")
      return
    }

    setLoading(true)

    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          password_lama: passwordLama,
          password_baru: passwordBaru,
          konfirmasi_password: konfirmasiPassword,
        }),
      })

      alert("Password berhasil diubah")

      setPasswordLama("")
      setPasswordBaru("")
      setKonfirmasiPassword("")
    } catch (error: any) {
      alert(error.message || "Gagal mengubah password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ubah Password</h1>
        <p className="text-muted-foreground">
          Perbarui password akun Anda secara berkala agar lebih aman.
        </p>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Form Ubah Password
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Password Lama</Label>

              <div className="relative">
                <Input
                  type={showLama ? "text" : "password"}
                  value={passwordLama}
                  onChange={(e) => setPasswordLama(e.target.value)}
                  placeholder="Masukkan password lama"
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowLama((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showLama ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Password Baru</Label>

              <div className="relative">
                <Input
                  type={showBaru ? "text" : "password"}
                  value={passwordBaru}
                  onChange={(e) => setPasswordBaru(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowBaru((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showBaru ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {passwordBaru.length > 0 && passwordBaru.length < 6 && (
                <p className="text-sm text-red-500">
                  Password baru minimal 6 karakter.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Konfirmasi Password Baru</Label>

              <div className="relative">
                <Input
                  type={showKonfirmasi ? "text" : "password"}
                  value={konfirmasiPassword}
                  onChange={(e) => setKonfirmasiPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowKonfirmasi((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showKonfirmasi ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {passwordTidakSama && (
                <p className="text-sm text-red-500">
                  Konfirmasi password belum sama.
                </p>
              )}

              {passwordMatch && (
                <p className="flex items-center gap-1 text-sm text-emerald-500">
                  <ShieldCheck className="w-4 h-4" />
                  Konfirmasi password cocok.
                </p>
              )}
            </div>

            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Gunakan password yang mudah diingat tetapi sulit ditebak. Hindari
              memakai nama, tanggal lahir, atau password yang sama dengan akun
              lain.
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Simpan Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}