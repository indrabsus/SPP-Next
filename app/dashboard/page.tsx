"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Loader2,
  PieChart as PieChartIcon,
  RefreshCcw,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { apiFetch } from "@/lib/api"
import {
  getAllowedTingkat,
  getUser,
  isAdminKeuangan,
  UserLogin,
} from "@/lib/auth"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type LogSpp = {
  id_logspp: string
  id_siswa: string
  nominal: number
  bulan: number
  kelas: number
  status: string
  bayar: "csh" | "trf" | "sbs"
  created_at: string
  siswa_ppdb?: {
    nama_lengkap: string
    siswa_baru?: {
      kelas_ppdb?: {
        tingkat: number | string
        nama_kelas: string
      }
    }
  }
}

type Siswa = {
  id_siswa: string
  nama_lengkap: string
  tahun: number
}

const bulanLabel: Record<number, string> = {
  1: "Juli",
  2: "Agustus",
  3: "September",
  4: "Oktober",
  5: "November",
  6: "Desember",
  7: "Januari",
  8: "Februari",
  9: "Maret",
  10: "April",
  11: "Mei",
  12: "Juni",
  13: "Tunggakan Kelas 10",
  14: "Tunggakan Kelas 11",
  15: "Tunggakan Kelas 12",
  16: "Daftar Ulang Kelas 11",
  17: "Daftar Ulang Kelas 12",
  18: "PKL",
  19: "Ujian Akhir",
}

const bayarLabel: Record<string, string> = {
  csh: "Cash",
  trf: "Transfer",
  sbs: "Dibebaskan",
}

const formatRupiah = (value: number) => {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

const formatDateOnly = (date: Date) => {
  return date.toISOString().slice(0, 10)
}

const isSameDate = (value: string, target: Date) => {
  if (!value) return false
  return formatDateOnly(new Date(value)) === formatDateOnly(target)
}

const isSameMonth = (value: string, target: Date) => {
  if (!value) return false

  const date = new Date(value)

  return (
    date.getMonth() === target.getMonth() &&
    date.getFullYear() === target.getFullYear()
  )
}

const isUangMasuk = (item: LogSpp) => {
  return item.bayar === "csh" || item.bayar === "trf"
}

export default function DashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState<UserLogin | null>(null)
  const [logs, setLogs] = useState<LogSpp[]>([])
  const [siswa, setSiswa] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getUser()

    if (!currentUser) {
      router.push("/login")
      return
    }

    setUser(currentUser)
  }, [router])

  const allowedTingkat = user ? getAllowedTingkat(user) : []

  const getDashboardData = async () => {
    if (!user) return

    setLoading(true)

    try {
      const tingkatParam =
        isAdminKeuangan(user) ? "" : `&tingkat=${allowedTingkat[0]}`

      const logRes = await apiFetch(
        `/spp/log?page=1&limit=500${tingkatParam}`
      )

      setLogs(logRes.data || [])

      const siswaResult: Siswa[] = []

      for (const tingkat of allowedTingkat) {
        const res = await apiFetch(`/spp/siswa?tingkat=${tingkat}`)
        siswaResult.push(...(res.data || []))
      }

      setSiswa(siswaResult)
    } catch (error) {
      console.error("Gagal mengambil dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      getDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const stats = useMemo(() => {
    const today = new Date()

    const pembayaranHariIni = logs
      .filter((item) => isSameDate(item.created_at, today))
      .filter(isUangMasuk)
      .reduce((total, item) => total + Number(item.nominal || 0), 0)

    const pembayaranBulanIni = logs
      .filter((item) => isSameMonth(item.created_at, today))
      .filter(isUangMasuk)
      .reduce((total, item) => total + Number(item.nominal || 0), 0)

    const dibebaskanBulanIni = logs
      .filter((item) => isSameMonth(item.created_at, today))
      .filter((item) => item.bayar === "sbs")
      .reduce((total, item) => total + Number(item.nominal || 0), 0)

    const totalSiswa = siswa.length

    return {
      pembayaranHariIni,
      pembayaranBulanIni,
      dibebaskanBulanIni,
      totalSiswa,
    }
  }, [logs, siswa])

  const chartHarian = useMemo(() => {
    const result: { tanggal: string; total: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      const tanggalKey = formatDateOnly(date)

      const total = logs
        .filter((item) => formatDateOnly(new Date(item.created_at)) === tanggalKey)
        .filter(isUangMasuk)
        .reduce((sum, item) => sum + Number(item.nominal || 0), 0)

      result.push({
        tanggal: date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        }),
        total,
      })
    }

    return result
  }, [logs])

  const chartMetode = useMemo(() => {
    const cash = logs
      .filter((item) => item.bayar === "csh")
      .reduce((sum, item) => sum + Number(item.nominal || 0), 0)

    const transfer = logs
      .filter((item) => item.bayar === "trf")
      .reduce((sum, item) => sum + Number(item.nominal || 0), 0)

    const dibebaskan = logs
      .filter((item) => item.bayar === "sbs")
      .reduce((sum, item) => sum + Number(item.nominal || 0), 0)

    return [
      { name: "Cash", value: cash },
      { name: "Transfer", value: transfer },
      { name: "Dibebaskan", value: dibebaskan },
    ].filter((item) => item.value > 0)
  }, [logs])

  const chartKelas = useMemo(() => {
    const map = new Map<string, number>()

    logs.filter(isUangMasuk).forEach((item) => {
      const tingkat =
        item.siswa_ppdb?.siswa_baru?.kelas_ppdb?.tingkat || item.kelas || "-"
      const namaKelas =
        item.siswa_ppdb?.siswa_baru?.kelas_ppdb?.nama_kelas || "-"

      const kelas = `${tingkat} ${namaKelas}`
      const current = map.get(kelas) || 0

      map.set(kelas, current + Number(item.nominal || 0))
    })

    return Array.from(map.entries())
      .map(([kelas, total]) => ({
        kelas,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [logs])

  const transaksiTerakhir = useMemo(() => {
    return [...logs]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 8)
  }, [logs])

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Dashboard Keuangan
            </h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>Hak akses tingkat:</span>
              <Badge variant="secondary" className="font-semibold">
                {allowedTingkat.length > 0
                  ? allowedTingkat.join(", ")
                  : "Tidak ada akses"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={getDashboardData}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button onClick={() => router.push("/dashboard/pembayaran")}>
            Buka Pembayaran
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="dashboard-card">
          <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Mengambil data dashboard...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="dashboard-card gap-0 py-5 transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Dibebaskan Bulan Ini
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">
                    {formatRupiah(stats.dibebaskanBulanIni)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tidak masuk uang kas
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-card gap-0 py-5 transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Hari Ini
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">
                    {formatRupiah(stats.pembayaranHariIni)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cash + transfer
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-card gap-0 py-5 transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bulan Ini
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">
                    {formatRupiah(stats.pembayaranBulanIni)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cash + transfer
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-card gap-0 py-5 transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Data Aktif
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 dark:text-violet-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{stats.totalSiswa}</p>
                  <p className="text-xs text-muted-foreground">
                    Siswa terambil
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="dashboard-card xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Uang Masuk 7 Hari Terakhir
                </CardTitle>
              </CardHeader>

              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartHarian}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      opacity={0.15}
                    />
                    <XAxis
                      dataKey="tanggal"
                      tick={{ fill: "currentColor", fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: "currentColor", fontSize: 12 }}
                      tickFormatter={(value) =>
                        `${Number(value) / 1000000}jt`
                      }
                    />
                    <Tooltip
                      formatter={(value: any) => formatRupiah(Number(value))}
                    />
                    <Bar
                      dataKey="total"
                      radius={[8, 8, 0, 0]}
                      fill="#3b82f6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Komposisi Metode
                </CardTitle>
              </CardHeader>

              <CardContent className="h-[320px]">
                {chartMetode.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Belum ada data metode pembayaran.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartMetode}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={95}
                        label={(item) => item.name}
                      >
                        {chartMetode.map((_, index) => (
                          <Cell
                            key={index}
                            fill={
                              ["#22c55e", "#3b82f6", "#f59e0b"][
                                index % 3
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => formatRupiah(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Top Kelas Berdasarkan Uang Masuk
                </CardTitle>
              </CardHeader>

              <CardContent className="h-[320px]">
                {chartKelas.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Belum ada data kelas.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartKelas} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        opacity={0.15}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        tickFormatter={(value) =>
                          `${Number(value) / 1000000}jt`
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="kelas"
                        width={90}
                        tick={{ fill: "currentColor", fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: any) => formatRupiah(Number(value))}
                      />
                      <Bar
                        dataKey="total"
                        radius={[0, 8, 8, 0]}
                        fill="#14b8a6"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Transaksi Terbaru
                </CardTitle>
              </CardHeader>

              <CardContent>
                {transaksiTerakhir.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada transaksi.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {transaksiTerakhir.map((item) => {
                      const nama =
                        item.siswa_ppdb?.nama_lengkap || "Tanpa Nama"
                      const kelas =
                        item.siswa_ppdb?.siswa_baru?.kelas_ppdb?.nama_kelas ||
                        "-"
                      const tingkat =
                        item.siswa_ppdb?.siswa_baru?.kelas_ppdb?.tingkat ||
                        item.kelas
                      const inisial = nama.charAt(0).toUpperCase()

                      return (
                        <div
                          key={item.id_logspp}
                          className="dashboard-soft-card flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {inisial}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{nama}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {tingkat} {kelas} •{" "}
                                {bulanLabel[Number(item.bulan)] || "-"} •{" "}
                                {bayarLabel[item.bayar] || item.bayar}
                              </p>
                            </div>
                          </div>

                          <p
                            className={`shrink-0 font-semibold ${
                              item.bayar === "sbs"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {formatRupiah(item.nominal)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}