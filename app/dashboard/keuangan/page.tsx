"use client"

import { useEffect, useMemo, useState } from "react"
import { Printer, Search } from "lucide-react"

import { apiFetch } from "@/lib/api"
import {
  getAllowedTingkat,
  getUser,
  isAdminKeuangan,
  UserLogin,
} from "@/lib/auth"

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

type LogSpp = {
  id_logspp?: string
  nominal: number
  bulan: number
  kelas: number
  status: string
  bayar: "csh" | "trf" | "sbs"
  created_at: string
}

type LogPpdb = {
  id_log?: string
  nominal: string
  jenis: "d" | "p" | "l"
  bayar: "csh" | "trf" | null
  created_at: string
}

type Siswa = {
  id_siswa: string
  nama_lengkap: string
  tahun: number
  log_spp?: LogSpp[]
  log_ppdb?: LogPpdb[]
  siswa_baru?: {
    kelas_ppdb?: {
      id_kelas?: string
      tingkat?: number | string
      nama_kelas?: string
    }
  }
  kelas_terkini?: {
    tingkat?: number | string
    nama_kelas?: string
    tahun_ajaran?: string | null
  }
}

type Kelas = {
  id_kelas: string
  tingkat: number | string
  nama_kelas: string
}

const today = new Date().toISOString().slice(0, 10)

const formatRupiah = (value: number) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`

const toNumber = (value: any) => {
  if (!value) return 0
  return Number(String(value).replace(/\D/g, "")) || 0
}

const isInDateRange = (value: string, start: string, end: string) => {
  if (!value) return false

  const date = new Date(value)
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T23:59:59`)

  return date >= startDate && date <= endDate
}

const isUangMasuk = (bayar?: string | null) => {
  return bayar === "csh" || bayar === "trf"
}

export default function LaporanKeuanganPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [tingkat, setTingkat] = useState("")
  const [idKelas, setIdKelas] = useState("semua")
  const [tahunAjaran, setTahunAjaran] = useState("")
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState<string[]>([])
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)

  const [kelas, setKelas] = useState<Kelas[]>([])
  const [siswa, setSiswa] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) return

    const allowed = getAllowedTingkat(currentUser)

    setUser(currentUser)
    setTingkat(allowed[0] || "")
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

  const allowedTingkat = user ? getAllowedTingkat(user) : []

  const getKelas = async (tingkatValue: string) => {
    if (!tingkatValue) return

    try {
      const res = await apiFetch(`/kelas/data/${tingkatValue}`)
      setKelas(res.data || [])
      setIdKelas("semua")
    } catch (error: any) {
      alert(error.message || "Gagal mengambil kelas")
    }
  }

  useEffect(() => {
    if (tingkat) {
      getKelas(tingkat)
      setSiswa([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkat])

  const getLaporan = async () => {
    if (!tingkat) {
      alert("Pilih tingkat terlebih dahulu")
      return
    }

    if (!startDate || !endDate) {
      alert("Tanggal awal dan akhir wajib diisi")
      return
    }

    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set("tingkat", tingkat)

      if (tahunAjaran) {
        params.set("tahun_ajaran", tahunAjaran)
      }

      if (idKelas !== "semua") {
        params.set("id_kelas", idKelas)
      }

      const res = await apiFetch(`/spp/siswa?${params.toString()}`)
      setSiswa(res.data || [])
    } catch (error: any) {
      alert(error.message || "Gagal mengambil laporan")
    } finally {
      setLoading(false)
    }
  }

  const laporanPerSiswa = useMemo(() => {
    return siswa.map((item) => {
      const kelasData = item.kelas_terkini
      const namaKelas = kelasData?.nama_kelas || "-"
      const tingkatSiswa = kelasData?.tingkat || tingkat

      const totalSpp =
        item.log_spp
          ?.filter((log) => {
            return (
              log.status === "spp" &&
              isUangMasuk(log.bayar) &&
              isInDateRange(log.created_at, startDate, endDate)
            )
          })
          .reduce((total, log) => total + Number(log.nominal || 0), 0) || 0

      const totalDibebaskan =
        item.log_spp
          ?.filter((log) => {
            return (
              log.status === "spp" &&
              log.bayar === "sbs" &&
              isInDateRange(log.created_at, startDate, endDate)
            )
          })
          .reduce((total, log) => total + Number(log.nominal || 0), 0) || 0

      const totalPpdb =
        item.log_ppdb
          ?.filter((log) => {
            return (
              log.jenis === "p" &&
              isInDateRange(log.created_at, startDate, endDate)
            )
          })
          .reduce((total, log) => total + toNumber(log.nominal), 0) || 0

      return {
        id_siswa: item.id_siswa,
        nama: item.nama_lengkap,
        tingkat: String(tingkatSiswa),
        kelas: namaKelas,
        kelasLengkap: `${tingkatSiswa} ${namaKelas}`,
        totalSpp,
        totalDibebaskan,
        totalPpdb,
        total: totalSpp + totalPpdb,
      }
    })
  }, [siswa, startDate, endDate, tingkat])

  const laporanPerKelas = useMemo(() => {
    const map = new Map<
      string,
      {
        kelas: string
        tingkat: string
        jumlahSiswa: number
        totalSpp: number
        totalDibebaskan: number
        totalPpdb: number
        total: number
      }
    >()

    laporanPerSiswa.forEach((item) => {
      const key = item.kelasLengkap

      const current =
        map.get(key) ||
        {
          kelas: item.kelas,
          tingkat: item.tingkat,
          jumlahSiswa: 0,
          totalSpp: 0,
          totalDibebaskan: 0,
          totalPpdb: 0,
          total: 0,
        }

      current.jumlahSiswa += 1
      current.totalSpp += item.totalSpp
      current.totalDibebaskan += item.totalDibebaskan
      current.totalPpdb += item.totalPpdb
      current.total += item.total

      map.set(key, current)
    })

    return Array.from(map.values()).sort((a, b) =>
      `${a.tingkat} ${a.kelas}`.localeCompare(`${b.tingkat} ${b.kelas}`)
    )
  }, [laporanPerSiswa])

  const summary = useMemo(() => {
    return laporanPerSiswa.reduce(
      (acc, item) => {
        acc.totalSiswa += 1
        acc.totalSpp += item.totalSpp
        acc.totalDibebaskan += item.totalDibebaskan
        acc.totalPpdb += item.totalPpdb
        acc.total += item.total

        if (item.total > 0 || item.totalDibebaskan > 0) {
          acc.siswaBayar += 1
        }

        return acc
      },
      {
        totalSiswa: 0,
        siswaBayar: 0,
        totalSpp: 0,
        totalDibebaskan: 0,
        totalPpdb: 0,
        total: 0,
      }
    )
  }, [laporanPerSiswa])

  const printPdf = () => {
    window.print()
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #print-area,
          #print-area * {
            visibility: visible;
          }

          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 14px;
            color: #000 !important;
          }

          /* Paksa teks hitam biar tetap kebaca walau lagi dark mode. */
          #print-area * {
            color: #000 !important;
            background-color: transparent !important;
          }

          .no-print {
            display: none !important;
          }

          .print-summary {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 6px !important;
            margin-bottom: 8px !important;
          }

          .print-card {
            border: 1px solid #ccc !important;
            padding: 6px !important;
            box-shadow: none !important;
            border-radius: 4px !important;
          }

          .print-card div {
            padding: 0 !important;
          }

          .print-title {
            font-size: 10px !important;
            color: #444 !important;
            margin-bottom: 2px !important;
          }

          .print-value {
            font-size: 12px !important;
            font-weight: 700 !important;
            margin: 0 !important;
          }

          table {
            font-size: 9px;
          }

          th,
          td {
            padding: 3px 4px !important;
          }

          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        }
      `}</style>

      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
          <p className="text-muted-foreground">
            Laporan pemasukan SPP dan PPDB berdasarkan tingkat, kelas, dan
            rentang tanggal.
          </p>
        </div>

        <Button onClick={printPdf} disabled={laporanPerSiswa.length === 0}>
          <Printer className="w-4 h-4 mr-2" />
          Print / PDF
        </Button>
      </div>

      <Card className="dashboard-card no-print">
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {isAdminKeuangan(user) && (
              <div>
                <Label>Tingkat</Label>
                <Select value={tingkat} onValueChange={setTingkat}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTingkat.map((item) => (
                      <SelectItem key={item} value={item}>
                        Kelas {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Tahun Ajaran</Label>
              <Select value={tahunAjaran} onValueChange={setTahunAjaran}>
                <SelectTrigger className="w-full">
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

            <div>
              <Label>Kelas</Label>
              <Select value={idKelas} onValueChange={setIdKelas}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Kelas</SelectItem>
                  {kelas.map((item) => (
                    <SelectItem key={item.id_kelas} value={item.id_kelas}>
                      {item.nama_kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tanggal Awal</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Tanggal Akhir</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <Button
                className="w-full"
                onClick={getLaporan}
                disabled={loading}
              >
                <Search className="w-4 h-4 mr-2" />
                {loading ? "Mengambil..." : "Tampilkan Laporan"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div id="print-area" className="space-y-6">
        <div className="hidden print:block text-center space-y-1">
          <h1 className="text-xl font-bold">LAPORAN KEUANGAN SPP & PPDB</h1>
          <p>
            Tingkat: {tingkat || "-"} | Kelas:{" "}
            {idKelas === "semua"
              ? "Semua Kelas"
              : kelas.find((item) => item.id_kelas === idKelas)?.nama_kelas ||
                "-"}
          </p>
          <p>
            Periode: {startDate} s.d. {endDate}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 print-summary">
          <Card className="dashboard-card print-card">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground print-title">
                Total Siswa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold print-value">
                {summary.totalSiswa}
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card print-card">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground print-title">
                Siswa Bayar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold print-value">
                {summary.siswaBayar}
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card print-card">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground print-title">
                Total SPP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold print-value">
                {formatRupiah(summary.totalSpp)}
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card print-card">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground print-title">
                Dibebaskan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600 print-value">
                {formatRupiah(summary.totalDibebaskan)}
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card print-card">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground print-title">
                Total PPDB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold print-value">
                {formatRupiah(summary.totalPpdb)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Rekap Per Kelas</CardTitle>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Jumlah Siswa</TableHead>
                  <TableHead>Total SPP</TableHead>
                  <TableHead>Dibebaskan</TableHead>
                  <TableHead>Total PPDB</TableHead>
                  <TableHead>Total Uang Masuk</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {laporanPerKelas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Silakan pilih filter lalu tampilkan laporan.
                    </TableCell>
                  </TableRow>
                ) : (
                  laporanPerKelas.map((item, index) => (
                    <TableRow key={`${item.tingkat}-${item.kelas}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.tingkat}</TableCell>
                      <TableCell>{item.kelas}</TableCell>
                      <TableCell>{item.jumlahSiswa}</TableCell>
                      <TableCell>{formatRupiah(item.totalSpp)}</TableCell>
                      <TableCell className="text-amber-600 font-semibold">
                        {formatRupiah(item.totalDibebaskan)}
                      </TableCell>
                      <TableCell>{formatRupiah(item.totalPpdb)}</TableCell>
                      <TableCell className="font-bold">
                        {formatRupiah(item.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Detail Per Siswa</CardTitle>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>SPP</TableHead>
                  <TableHead>Dibebaskan</TableHead>
                  <TableHead>PPDB</TableHead>
                  <TableHead>Total Uang Masuk</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {laporanPerSiswa.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Belum ada data laporan.
                    </TableCell>
                  </TableRow>
                ) : (
                  laporanPerSiswa.map((item, index) => (
                    <TableRow key={item.id_siswa}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell>{item.tingkat}</TableCell>
                      <TableCell>{item.kelas}</TableCell>
                      <TableCell>{formatRupiah(item.totalSpp)}</TableCell>
                      <TableCell className="text-amber-600 font-semibold">
                        {formatRupiah(item.totalDibebaskan)}
                      </TableCell>
                      <TableCell>{formatRupiah(item.totalPpdb)}</TableCell>
                      <TableCell className="font-bold">
                        {formatRupiah(item.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {laporanPerSiswa.length > 0 && (
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Total Uang Masuk</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatRupiah(summary.total)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Total ini tidak termasuk nominal yang dibebaskan.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}