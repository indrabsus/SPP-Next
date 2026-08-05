"use client"

import { useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  ListChecks,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import { getUser, isAdminKeuangan, UserLogin } from "@/lib/auth"

import { Badge } from "@/components/ui/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type LogAktivitas = {
  id_log: string
  username: string | null
  modul: string
  aksi: "create" | "update" | "delete"
  keterangan: string
  created_at: string
}

const modulOptions = [
  { value: "semua", label: "Semua Modul" },
  { value: "siswa", label: "Siswa" },
  { value: "kelas", label: "Kelas" },
  { value: "master_spp", label: "Master SPP" },
  { value: "pembayaran_lainnya", label: "Pembayaran Lainnya" },
  { value: "log_spp", label: "Log SPP" },
  { value: "log_ppdb", label: "Log PPDB" },
  { value: "arsip", label: "Arsip" },
  { value: "setting", label: "Setting" },
]

const getModulLabel = (value: string) => {
  return modulOptions.find((item) => item.value === value)?.label || value
}

const getAksiBadge = (aksi: LogAktivitas["aksi"]) => {
  if (aksi === "create") {
    return (
      <Badge variant="default" className="bg-emerald-600 text-white">
        Tambah
      </Badge>
    )
  }

  if (aksi === "delete") {
    return <Badge variant="destructive">Hapus</Badge>
  }

  return <Badge variant="secondary">Ubah</Badge>
}

const formatTanggal = (value: string) => {
  if (!value) return "-"

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const ITEMS_PER_PAGE = 50

export default function LogAktivitasPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [modul, setModul] = useState("semua")
  const [keyword, setKeyword] = useState("")
  const [tanggalMulai, setTanggalMulai] = useState("")
  const [tanggalSelesai, setTanggalSelesai] = useState("")

  const [data, setData] = useState<LogAktivitas[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const getLogAktivitas = async (targetPage = 1) => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set("page", String(targetPage))
      params.set("limit", String(ITEMS_PER_PAGE))

      if (modul !== "semua") params.set("modul", modul)
      if (keyword.trim()) params.set("keyword", keyword.trim())
      if (tanggalMulai) params.set("tanggal_mulai", tanggalMulai)
      if (tanggalSelesai) params.set("tanggal_selesai", tanggalSelesai)

      const res = await apiFetch(`/log-aktivitas?${params.toString()}`)

      setData(res.data || [])
      setPage(res.pagination?.page || 1)
      setTotalPage(res.pagination?.total_pages || 1)
      setTotal(res.pagination?.total || 0)
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data log aktivitas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) getLogAktivitas(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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
            Menu Log Aktivitas hanya untuk admin keuangan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ListChecks className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Aktivitas</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat semua perubahan data: edit siswa, pindah kelas, master
            SPP, log pembayaran, arsip, dan setting.
          </p>
        </div>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Filter
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Modul</Label>
              <Select value={modul} onValueChange={setModul}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih modul" />
                </SelectTrigger>
                <SelectContent>
                  {modulOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
              />
            </div>

            <div>
              <Label>Tanggal Selesai</Label>
              <Input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
              />
            </div>

            <div>
              <Label>Cari</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="User atau keterangan..."
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") getLogAktivitas(1)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => getLogAktivitas(1)}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Terapkan Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="dashboard-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Riwayat Perubahan</CardTitle>
          <Badge variant="secondary" className="font-semibold">
            {total} log
          </Badge>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Modul</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengambil data log aktivitas...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Belum ada log aktivitas
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id_log}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatTanggal(item.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.username || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getModulLabel(item.modul)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getAksiBadge(item.aksi)}</TableCell>
                    <TableCell className="text-sm">
                      {item.keterangan}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Halaman {page} dari {totalPage} - {ITEMS_PER_PAGE} data per
              halaman
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => getLogAktivitas(page - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelumnya
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPage || loading}
                onClick={() => getLogAktivitas(page + 1)}
              >
                Berikutnya
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
