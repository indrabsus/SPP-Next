"use client"

import { useEffect, useState } from "react"
import { Download, Upload, DatabaseBackup, ShieldAlert } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { getUser, isAdminKeuangan, UserLogin } from "@/lib/auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function BackupRestorePage() {
  const [user, setUser] = useState<UserLogin | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loadingBackup, setLoadingBackup] = useState(false)
  const [loadingRestore, setLoadingRestore] = useState(false)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const downloadBackup = async () => {
    if (!user || !isAdminKeuangan(user)) {
      alert("Akses ditolak")
      return
    }

    setLoadingBackup(true)

    try {
      const token = localStorage.getItem("token")

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/spp/backup`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.message || "Gagal download backup")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      const tanggal = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19)

      const a = document.createElement("a")
      a.href = url
      a.download = `backup-spp-${tanggal}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      alert(error.message || "Gagal membuat backup")
    } finally {
      setLoadingBackup(false)
    }
  }

  const restoreBackup = async () => {
    if (!user || !isAdminKeuangan(user)) {
      alert("Akses ditolak")
      return
    }

    if (!file) {
      alert("Pilih file backup JSON terlebih dahulu")
      return
    }

    if (!confirm("Yakin restore data SPP dari file ini? Data lama tidak dihapus, data yang ID-nya sama akan dilewati.")) {
      return
    }

    setLoadingRestore(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await apiFetch("/spp/restore", {
        method: "POST",
        body: formData,
      })

      alert(
        `Restore selesai.\n\nMaster masuk: ${res.data?.master_inserted || 0}\nMaster dilewati: ${res.data?.master_skipped || 0}\nLog masuk: ${res.data?.log_inserted || 0}\nLog dilewati: ${res.data?.log_skipped || 0}`
      )

      setFile(null)
    } catch (error: any) {
      alert(error.message || "Restore gagal")
    } finally {
      setLoadingRestore(false)
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
            Menu Backup & Restore hanya bisa diakses oleh admin keuangan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backup & Restore SPP</h1>
        <p className="text-muted-foreground">
          Backup dan restore data master SPP serta log pembayaran SPP.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseBackup className="w-5 h-5" />
              Backup Data SPP
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download file JSON berisi data master SPP dan log pembayaran SPP.
            </p>

            <Button onClick={downloadBackup} disabled={loadingBackup}>
              <Download className="w-4 h-4 mr-2" />
              {loadingBackup ? "Membuat Backup..." : "Download Backup"}
            </Button>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Restore Data SPP
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload file backup JSON. Data yang sudah ada akan dilewati.
            </p>

            <div>
              <Label>File Backup JSON</Label>
              <Input
                type="file"
                accept=".json,application/json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button
              variant="destructive"
              onClick={restoreBackup}
              disabled={loadingRestore}
            >
              <Upload className="w-4 h-4 mr-2" />
              {loadingRestore ? "Restore..." : "Restore Data"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}