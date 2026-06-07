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

  setLoadingRestore(true)

  try {
    const text = await file.text()
    const json = JSON.parse(text)

    const masterSpp = Array.isArray(json.master_spp) ? json.master_spp : []
    const logSpp = Array.isArray(json.log_spp) ? json.log_spp : []

    const token = localStorage.getItem("token")

    let totalMasterInserted = 0
    let totalMasterSkipped = 0
    let totalLogInserted = 0
    let totalLogSkipped = 0

    // restore master dulu
    if (masterSpp.length > 0) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/spp/restore-chunk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            master_spp: masterSpp,
            log_spp: [],
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || "Restore master gagal")
      }

      totalMasterInserted += data.data?.master_inserted || 0
      totalMasterSkipped += data.data?.master_skipped || 0
    }

    // restore log per 300 data
    const chunkSize = 300

    for (let i = 0; i < logSpp.length; i += chunkSize) {
      const chunk = logSpp.slice(i, i + chunkSize)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/spp/restore-chunk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            master_spp: [],
            log_spp: chunk,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data?.message || `Restore log gagal pada data ke-${i + 1}`
        )
      }

      totalLogInserted += data.data?.log_inserted || 0
      totalLogSkipped += data.data?.log_skipped || 0
    }

    alert(
      `Restore selesai.\n\nMaster masuk: ${totalMasterInserted}\nMaster dilewati: ${totalMasterSkipped}\nLog masuk: ${totalLogInserted}\nLog dilewati: ${totalLogSkipped}`
    )

    setFile(null)
  } catch (error: any) {
    console.error(error)
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