"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { getUser, isAdminKeuangan, UserLogin } from "@/lib/auth"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SettingStafPage() {
  const [user, setUser] = useState<UserLogin | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stafBolehEditHapus, setStafBolehEditHapus] = useState(false)

  useEffect(() => {
    const currentUser = getUser()
    setUser(currentUser)

    if (!currentUser || !isAdminKeuangan(currentUser)) {
      setLoading(false)
      return
    }

    apiFetch("/setting/staf-edit-hapus")
      .then((res) =>
        setStafBolehEditHapus(!!res?.data?.staf_boleh_edit_hapus)
      )
      .catch(() => setStafBolehEditHapus(false))
      .finally(() => setLoading(false))
  }, [])

  const ubahSetting = async () => {
    const checked = !stafBolehEditHapus

    setSaving(true)
    setStafBolehEditHapus(checked)

    try {
      await apiFetch("/setting/staf-edit-hapus", {
        method: "PUT",
        body: JSON.stringify({ staf_boleh_edit_hapus: checked }),
      })
    } catch (error) {
      // Gagal simpan - kembalikan tampilan ke kondisi semula
      setStafBolehEditHapus(!checked)
      alert(
        error instanceof Error ? error.message : "Gagal menyimpan setting"
      )
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  if (!isAdminKeuangan(user)) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-5 h-5" />
            Akses Ditolak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Menu Setting hanya untuk admin keuangan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Setting</h1>
        <p className="text-muted-foreground">
          Pengaturan hak akses untuk staf keuangan.
        </p>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Akses Staf Keuangan</CardTitle>
          <CardDescription>
            Kalau diaktifkan, staf keuangan (kelas 10/11/12) bisa membuka
            menu edit dan hapus di Log SPP dan Log PPDB. Kalau nonaktif,
            hanya admin keuangan yang bisa edit dan hapus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat setting...
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <p className="font-medium">
                  Izinkan staf keuangan edit &amp; hapus
                </p>
                <p className="text-sm text-muted-foreground">
                  Berlaku untuk Log SPP dan Log PPDB, sama untuk semua staf
                  keuangan.
                </p>
              </div>

              <Button
                type="button"
                variant={stafBolehEditHapus ? "default" : "outline"}
                disabled={saving}
                onClick={ubahSetting}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : stafBolehEditHapus ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                {stafBolehEditHapus ? "Aktif" : "Nonaktif"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
