"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldAlert } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { getUser, isAdminKeuangan, UserLogin } from "@/lib/auth"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function SettingStafPage() {
  const [user, setUser] = useState<UserLogin | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stafBolehEditHapus, setStafBolehEditHapus] = useState(false)

  useEffect(() => {
    setUser(getUser())
  }, [])

  useEffect(() => {
    if (!user || !isAdminKeuangan(user)) {
      setLoading(false)
      return
    }

    apiFetch("/setting/staf-edit-hapus")
      .then((res) =>
        setStafBolehEditHapus(!!res?.data?.staf_boleh_edit_hapus)
      )
      .catch(() => setStafBolehEditHapus(false))
      .finally(() => setLoading(false))
  }, [user])

  const ubahSetting = async (checked: boolean) => {
    setSaving(true)
    setStafBolehEditHapus(checked)

    try {
      await apiFetch("/setting/staf-edit-hapus", {
        method: "PUT",
        body: JSON.stringify({ staf_boleh_edit_hapus: checked }),
      })
    } catch (error: any) {
      // Gagal simpan - kembalikan tampilan switch ke kondisi semula
      setStafBolehEditHapus(!checked)
      alert(error.message || "Gagal menyimpan setting")
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
                <Label htmlFor="staf-edit-hapus">
                  Izinkan staf keuangan edit &amp; hapus
                </Label>
                <p className="text-sm text-muted-foreground">
                  Berlaku untuk Log SPP dan Log PPDB, sama untuk semua staf
                  keuangan.
                </p>
              </div>

              <Switch
                id="staf-edit-hapus"
                checked={stafBolehEditHapus}
                disabled={saving}
                onCheckedChange={ubahSetting}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
