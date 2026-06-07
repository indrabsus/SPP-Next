"use client"

import { useEffect, useState } from "react"
import {
  Archive,
  DatabaseBackup,
  Download,
  Search,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react"

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

type Summary = {
  tahun: number
  total_siswa: number
  total_siswa_baru: number
  total_log_spp: number
  total_log_ppdb: number
}

export default function ArsipAngkatanPage() {
  const [user, setUser] = useState<UserLogin | null>(null)
  const [tahun, setTahun] = useState("")
  const [summary, setSummary] = useState<Summary | null>(null)

  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState("")
  const [konfirmasi, setKonfirmasi] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const downloadFile = async (endpoint: string, filename: string) => {
    setDownloading(filename)

    try {
      const token = localStorage.getItem("token")

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || "Gagal download backup")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      alert(error.message || "Gagal download backup")
    } finally {
      setDownloading("")
    }
  }

  const cekSummary = async () => {
    if (!tahun) {
      alert("Isi tahun masuk dulu")
      return
    }

    setLoading(true)

    try {
      const res = await apiFetch(`/spp/arsip/summary/${tahun}`)
      setSummary(res.data)
      setKonfirmasi("")
    } catch (error: any) {
      alert(error.message || "Gagal mengambil summary")
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  const hapusAngkatan = async () => {
    if (!summary) return

    if (konfirmasi !== `HAPUS-${tahun}`) {
      alert(`Ketik HAPUS-${tahun} untuk konfirmasi`)
      return
    }

    if (
      !confirm(
        `Yakin hapus semua data angkatan ${tahun}? Pastikan backup sudah didownload.`
      )
    ) {
      return
    }

    setDeleting(true)

    try {
      const res = await apiFetch(`/spp/arsip/hapus-angkatan/${tahun}`, {
        method: "DELETE",
        body: JSON.stringify({
          konfirmasi,
        }),
      })

      alert(
        `Berhasil hapus angkatan ${tahun}

Log SPP: ${res.data?.deleted_log_spp || 0}
Log PPDB: ${res.data?.deleted_log_ppdb || 0}
Siswa Baru: ${res.data?.deleted_siswa_baru || 0}
Siswa: ${res.data?.deleted_siswa || 0}`
      )

      setSummary(null)
      setKonfirmasi("")
    } catch (error: any) {
      alert(error.message || "Gagal menghapus angkatan")
    } finally {
      setDeleting(false)
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
            Menu Arsip Angkatan hanya untuk admin keuangan.
          </p>
        </CardContent>
      </Card>
    )
  }

  const disabledDownload = !!downloading || !summary

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Arsip Angkatan</h1>
        <p className="text-muted-foreground">
          Backup data berdasarkan tahun masuk siswa, lalu hapus data angkatan
          yang sudah lulus.
        </p>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Pilih Tahun Masuk</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="max-w-md">
            <Label>Tahun Masuk</Label>
            <div className="flex gap-2">
              <Input
                value={tahun}
                onChange={(e) => {
                  setTahun(e.target.value)
                  setSummary(null)
                  setKonfirmasi("")
                }}
                placeholder="Contoh: 2023"
              />

              <Button onClick={cekSummary} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                {loading ? "Cek..." : "Cek"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Siswa PPDB
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Users className="w-7 h-7" />
                <p className="text-2xl font-bold">{summary.total_siswa}</p>
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Siswa Baru
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Archive className="w-7 h-7" />
                <p className="text-2xl font-bold">
                  {summary.total_siswa_baru}
                </p>
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Log SPP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.total_log_spp}</p>
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Log PPDB
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.total_log_ppdb}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseBackup className="w-5 h-5" />
                Download Backup
              </CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  downloadFile(
                    "/spp/arsip/backup-master",
                    `backup-master-${Date.now()}.json`
                  )
                }
                disabled={disabledDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Backup Master
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  downloadFile(
                    `/spp/arsip/backup-siswa/${tahun}`,
                    `backup-siswa-${tahun}.json`
                  )
                }
                disabled={disabledDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Backup Siswa {tahun}
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  downloadFile(
                    `/spp/arsip/backup-log-spp/${tahun}`,
                    `backup-log-spp-${tahun}.json`
                  )
                }
                disabled={disabledDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Backup Log SPP {tahun}
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  downloadFile(
                    `/spp/arsip/backup-log-ppdb/${tahun}`,
                    `backup-log-ppdb-${tahun}.json`
                  )
                }
                disabled={disabledDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Backup Log PPDB {tahun}
              </Button>
            </CardContent>
          </Card>

          <Card className="dashboard-card border-red-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Hapus Angkatan
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pastikan semua backup sudah didownload sebelum menghapus data.
                Penghapusan akan menghapus log SPP, log PPDB, siswa baru, dan
                siswa PPDB untuk tahun masuk ini.
              </p>

              <div className="max-w-md">
                <Label>
                  Ketik <b>HAPUS-{tahun}</b>
                </Label>
                <Input
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                  placeholder={`HAPUS-${tahun}`}
                />
              </div>

              <Button
                variant="destructive"
                onClick={hapusAngkatan}
                disabled={deleting || konfirmasi !== `HAPUS-${tahun}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? "Menghapus..." : "Saya Sudah Backup, Hapus"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}