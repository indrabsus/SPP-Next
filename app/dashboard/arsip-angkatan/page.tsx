"use client"

import { useEffect, useState } from "react"
import {
  DatabaseBackup,
  Download,
  FileText,
  RefreshCcw,
  ScrollText,
  ShieldAlert,
  Upload,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Summary = {
  tahun_ajaran: string
  total_riwayat_kelas: number
  total_siswa: number
  total_log_spp: number
  total_log_ppdb: number
}

type RestoreResult = {
  siswa_ppdb: { inserted: number; skipped: number }
  siswa_baru: { inserted: number; skipped: number }
  riwayat_kelas: { inserted: number; skipped: number }
  log_spp: { inserted: number; skipped: number }
  log_ppdb: { inserted: number; skipped: number }
}

export default function BackupRestoreTahunAjaranPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [tahunAjaran, setTahunAjaran] = useState("")
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState<string[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  const [loadingSummary, setLoadingSummary] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    setUser(getUser())
  }, [])

  useEffect(() => {
    apiFetch("/riwayat-kelas/tahun-list")
      .then((res) => {
        const list: string[] = res.data || []
        setDaftarTahunAjaran(list)
        setTahunAjaran((prev) => prev || list[0] || "")
      })
      .catch(() => setDaftarTahunAjaran([]))
  }, [])

  const cekSummary = async () => {
    if (!tahunAjaran) {
      alert("Pilih tahun ajaran dulu")
      return
    }

    setLoadingSummary(true)

    try {
      const res = await apiFetch(
        `/spp/arsip/summary-ta/${encodeURIComponent(tahunAjaran)}`
      )
      setSummary(res.data)
    } catch (error: any) {
      alert(error.message || "Gagal mengambil summary")
      setSummary(null)
    } finally {
      setLoadingSummary(false)
    }
  }

  useEffect(() => {
    if (tahunAjaran) cekSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaran])

  const downloadBackup = async () => {
    if (!tahunAjaran) return

    setDownloading(true)

    try {
      const token = localStorage.getItem("token")

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/spp/arsip/backup-ta/${encodeURIComponent(
          tahunAjaran
        )}`,
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
      a.download = `backup-tahun-ajaran-${tahunAjaran.replace(/\//g, "-")}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      alert(error.message || "Gagal download backup")
    } finally {
      setDownloading(false)
    }
  }

  const restoreBackup = async () => {
    if (!file) {
      alert("Pilih file backup JSON dulu")
      return
    }

    setRestoring(true)

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      if (json.app !== "backup-tahun-ajaran") {
        throw new Error(
          "File ini bukan backup tahun ajaran yang valid dari menu ini."
        )
      }

      const res = await apiFetch("/spp/arsip/restore-ta", {
        method: "POST",
        body: JSON.stringify({
          siswa_ppdb: json.siswa_ppdb || [],
          siswa_baru: json.siswa_baru || [],
          riwayat_kelas: json.riwayat_kelas || [],
          log_spp: json.log_spp || [],
          log_ppdb: json.log_ppdb || [],
        }),
      })

      const data: RestoreResult = res.data

      alert(
        `Restore selesai untuk tahun ajaran ${json.tahun_ajaran}.

Siswa: ${data.siswa_ppdb.inserted} masuk, ${data.siswa_ppdb.skipped} dilewati
Siswa Baru: ${data.siswa_baru.inserted} masuk, ${data.siswa_baru.skipped} dilewati
Riwayat Kelas: ${data.riwayat_kelas.inserted} masuk, ${data.riwayat_kelas.skipped} dilewati
Log SPP: ${data.log_spp.inserted} masuk, ${data.log_spp.skipped} dilewati
Log PPDB: ${data.log_ppdb.inserted} masuk, ${data.log_ppdb.skipped} dilewati`
      )

      setFile(null)
      if (json.tahun_ajaran === tahunAjaran) cekSummary()
    } catch (error: any) {
      alert(error.message || "Gagal restore data")
    } finally {
      setRestoring(false)
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
            Menu Backup & Restore hanya untuk admin keuangan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backup & Restore Tahun Ajaran</h1>
        <p className="text-muted-foreground">
          Backup dan restore data riwayat_kelas beserta siswa dan log
          pembayaran terkait, per tahun ajaran.
        </p>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Pilih Tahun Ajaran</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 max-w-lg">
            <div className="flex-1">
              <Label>Tahun Ajaran</Label>
              <Select value={tahunAjaran} onValueChange={setTahunAjaran}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun ajaran" />
                </SelectTrigger>
                <SelectContent>
                  {daftarTahunAjaran.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={cekSummary}
              disabled={loadingSummary}
              className="self-end"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {loadingSummary ? "Memuat..." : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Riwayat Kelas
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Users className="w-7 h-7" />
                <p className="text-2xl font-bold">
                  {summary.total_riwayat_kelas}
                </p>
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Siswa
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
                  Log SPP
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <ScrollText className="w-7 h-7" />
                <p className="text-2xl font-bold">{summary.total_log_spp}</p>
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Log PPDB
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <FileText className="w-7 h-7" />
                <p className="text-2xl font-bold">{summary.total_log_ppdb}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseBackup className="w-5 h-5" />
                  Download Backup
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Satu file JSON berisi riwayat_kelas, data siswa, dan log
                  SPP/PPDB untuk tahun ajaran {tahunAjaran}.
                </p>

                <Button onClick={downloadBackup} disabled={downloading}>
                  <Download className="w-4 h-4 mr-2" />
                  {downloading ? "Membuat Backup..." : "Download Backup"}
                </Button>
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Restore Backup
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload file backup JSON. Data yang sudah ada tidak akan
                  ditimpa - cuma yang hilang saja yang ditambahkan kembali.
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
                  variant="outline"
                  onClick={restoreBackup}
                  disabled={restoring}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {restoring ? "Restore..." : "Restore Data"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
