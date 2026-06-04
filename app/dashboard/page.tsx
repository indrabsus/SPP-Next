"use client"

import { useEffect, useState } from "react"
import { CreditCard, Users, Wallet, FileText } from "lucide-react"

import { getAllowedTingkat, getUser, UserLogin } from "@/lib/auth"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserLogin | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  if (!user) return null

  const allowedTingkat = getAllowedTingkat(user.role)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Kelola pembayaran SPP sesuai hak akses tingkat.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Hak Akses
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Users className="w-7 h-7" />
            <p className="text-2xl font-bold">
              {allowedTingkat.join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Pembayaran Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <CreditCard className="w-7 h-7" />
            <p className="text-2xl font-bold">Rp 0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Tunggakan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Wallet className="w-7 h-7" />
            <p className="text-2xl font-bold">Rp 0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Laporan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <FileText className="w-7 h-7" />
            <p className="text-2xl font-bold">Aktif</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pembayaran SPP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Klik tombol di bawah untuk mulai mencari siswa dan melakukan pembayaran.
          </p>

          <Button onClick={() => router.push("/dashboard/pembayaran")}>
            Buka Pembayaran SPP
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}