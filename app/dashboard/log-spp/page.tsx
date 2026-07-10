"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ArrowUpDown,
  Camera,
  ImageIcon,
  Pencil,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import {
  canDeleteLogSpp,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type LogSpp = {
  id_logspp: string
  id_siswa: string
  nominal: number
  bulan: number
  kelas: number
  status: string
  bayar: "csh" | "trf" | "sbs"
  bukti?: string | null
  created_at: string
  siswa_ppdb?: {
    id_siswa: string
    nama_lengkap: string
    siswa_baru?: {
      id_siswa: string
      id_kelas: string
      kelas_ppdb?: {
        id_kelas: string
        tingkat: number | string
        nama_kelas: string
      }
    }
    kelas_terkini?: {
      tingkat?: number | string
      nama_kelas?: string
      tahun_ajaran?: string | null
    } | null
  }
}

type SortKey =
  | "nama"
  | "kelas"
  | "nominal"
  | "keterangan"
  | "waktu"
  | "bayar"

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

const formatTanggal = (value: string) => {
  if (!value) return "-"

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const getKeterangan = (log: LogSpp) => {
  const bulan = bulanLabel[Number(log.bulan)] || "-"
  const kelas = log.kelas ? `Kelas ${log.kelas}` : "-"
  return `${bulan} / ${kelas}`
}

const toDatetimeLocalValue = (value: string) => {
  if (!value) return ""

  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function LogSppPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [data, setData] = useState<LogSpp[]>([])
  const [loading, setLoading] = useState(false)

  const [keyword, setKeyword] = useState("")
  const [tingkat, setTingkat] = useState("semua")
  const [metode, setMetode] = useState("semua")
  const [tahunAjaran, setTahunAjaran] = useState("")
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState<string[]>([])
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")

  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPage, setTotalPage] = useState(1)

  const [sortKey, setSortKey] = useState<SortKey>("waktu")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [openPrint, setOpenPrint] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loadingLaporan, setLoadingLaporan] = useState(false)
  const [laporanData, setLaporanData] = useState<LogSpp[]>([])
  const [laporanRange, setLaporanRange] = useState<{
    start: string
    end: string
  } | null>(null)

  const [openBukti, setOpenBukti] = useState(false)
const [selectedBukti, setSelectedBukti] = useState<string | null>(null)

  const [openEditTanggal, setOpenEditTanggal] = useState(false)
  const [editTanggalTarget, setEditTanggalTarget] = useState<LogSpp | null>(
    null
  )
  const [tanggalBaru, setTanggalBaru] = useState("")
  const [bayarBaru, setBayarBaru] = useState<"csh" | "trf" | "sbs">("csh")
  const [savingTanggal, setSavingTanggal] = useState(false)

  const [buktiBaru, setBuktiBaru] = useState<File | null>(null)
  const [buktiBaruPreviewUrl, setBuktiBaruPreviewUrl] = useState<
    string | null
  >(null)
  const [buktiBaruMode, setBuktiBaruMode] = useState<"file" | "kamera">(
    "file"
  )
  const [kameraAktif, setKameraAktif] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

const openModalBukti = (bukti: string | null | undefined) => {
  if (!bukti) return

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
  const url = bukti.startsWith("http") ? bukti : `${baseUrl}${bukti}`

  setSelectedBukti(url)
  setOpenBukti(true)
}

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) return

    const allowed = getAllowedTingkat(currentUser)

    setUser(currentUser)

    if (isAdminKeuangan(currentUser)) {
      setTingkat("semua")
    } else {
      setTingkat(allowed[0] || "semua")
    }
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

  const getLogSpp = async (targetPage = page) => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set("page", String(targetPage))
      params.set("limit", String(limit))

      if (keyword.trim()) {
        params.set("keyword", keyword.trim())
      }

      if (tahunAjaran) {
        params.set("tahun_ajaran", tahunAjaran)
      }

      if (filterStartDate) {
        params.set("start_date", filterStartDate)
      }

      if (filterEndDate) {
        params.set("end_date", filterEndDate)
      }

      if (isAdminKeuangan(user)) {
        if (tingkat !== "semua") {
          params.set("tingkat", tingkat)
        }
      } else {
        const tingkatStaf = allowedTingkat[0]
        if (tingkatStaf) {
          params.set("tingkat", tingkatStaf)
        }
      }

      const res = await apiFetch(`/spp/log?${params.toString()}`)

      let result: LogSpp[] = res?.data || []

      if (metode !== "semua") {
        result = result.filter((item) => item.bayar === metode)
      }

      setData(result)
      setTotal(res?.total || result.length || 0)
      setTotalPage(res?.totalPage || 1)
      setPage(res?.page || targetPage)
    } catch (error: any) {
      alert(error.message || "Gagal mengambil log SPP")
      setData([])
      setTotal(0)
      setTotalPage(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && tahunAjaran) {
      getLogSpp(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tingkat, metode, tahunAjaran, filterStartDate, filterEndDate])

  const handleCari = () => {
    getLogSpp(1)
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sortedData = useMemo(() => {
    const result = [...data]

    result.sort((a, b) => {
      const getValue = (item: LogSpp) => {
        if (sortKey === "nama") return item.siswa_ppdb?.nama_lengkap || ""

        if (sortKey === "kelas") {
          const tingkatSiswa =
            item.siswa_ppdb?.kelas_terkini?.tingkat || item.kelas || ""
          const namaKelas = item.siswa_ppdb?.kelas_terkini?.nama_kelas || ""

          return `${tingkatSiswa} ${namaKelas}`
        }

        if (sortKey === "nominal") return Number(item.nominal || 0)
        if (sortKey === "keterangan") return getKeterangan(item)
        if (sortKey === "waktu") return new Date(item.created_at).getTime()
        if (sortKey === "bayar") return bayarLabel[item.bayar] || item.bayar

        return ""
      }

      const valueA = getValue(a)
      const valueB = getValue(b)

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA
      }

      const strA = String(valueA).toLowerCase()
      const strB = String(valueB).toLowerCase()

      if (strA < strB) return sortDirection === "asc" ? -1 : 1
      if (strA > strB) return sortDirection === "asc" ? 1 : -1

      return 0
    })

    return result
  }, [data, sortKey, sortDirection])

  const bukaPrint = () => {
    const today = new Date().toISOString().slice(0, 10)
    setStartDate(filterStartDate || today)
    setEndDate(filterEndDate || today)
    setOpenPrint(true)
  }

  const getTanggalLokal = (value: string) => {
    // created_at dari backend formatnya "YYYY-MM-DD HH:mm:ss" (bukan ISO
    // UTC) - ambil 10 karakter pertama langsung, jangan di-parse ulang
    // lewat `new Date()` supaya tidak salah hari kalau berubah ke format
    // ISO+Z (bisa geser tanggal akibat konversi timezone).
    return value.slice(0, 10)
  }

  const printLaporan = async () => {
    if (!startDate || !endDate) {
      alert("Tanggal awal dan akhir wajib diisi")
      return
    }

    setLoadingLaporan(true)

    try {
      // Filter tanggal dilakukan di frontend (bukan backend) - endpoint
      // /spp/log diambil apa adanya lalu disaring created_at-nya di sini,
      // supaya fitur ini tidak bergantung pada deploy backend.
      const params = new URLSearchParams()
      params.set("limit", "100000")

      const res = await apiFetch(`/spp/log?${params.toString()}`)
      const semuaRows: LogSpp[] = res?.data || []

      const rows = semuaRows.filter((item) => {
        const tanggal = getTanggalLokal(item.created_at)
        return tanggal >= startDate && tanggal <= endDate
      })

      if (rows.length === 0) {
        alert("Tidak ada transaksi pada rentang tanggal tersebut")
        return
      }

      setLaporanRange({ start: startDate, end: endDate })
      setLaporanData(rows)
      setOpenPrint(false)
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data laporan")
    } finally {
      setLoadingLaporan(false)
    }
  }

  useEffect(() => {
    if (laporanData.length === 0 || !laporanRange) return

    // document.title dipakai browser sebagai nama file default pas "Save as
    // PDF" di dialog print - diganti sementara biar nama filenya ikut
    // rentang tanggal laporan, bukan judul aplikasi yang generik.
    const originalTitle = document.title
    const namaFile = `Laporan-SPP_${laporanRange.start.split("-").reverse().join("-")}_sd_${laporanRange.end
      .split("-")
      .reverse()
      .join("-")}`

    document.title = namaFile

    const restoreTitle = () => {
      document.title = originalTitle
    }

    window.addEventListener("afterprint", restoreTitle)

    const timer = setTimeout(() => window.print(), 150)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("afterprint", restoreTitle)
      document.title = originalTitle
    }
  }, [laporanData, laporanRange])

  const formatTanggalSingkat = (value: string) => {
    if (!value) return "-"

    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const laporanSortedData = useMemo(() => {
    return [...laporanData].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [laporanData])

  const laporanTotalTrf = laporanData
    .filter((item) => item.bayar === "trf")
    .reduce((sum, item) => sum + Number(item.nominal || 0), 0)

  const laporanTotalCash = laporanData
    .filter((item) => item.bayar === "csh")
    .reduce((sum, item) => sum + Number(item.nominal || 0), 0)

  const laporanTotalSbs = laporanData
    .filter((item) => item.bayar === "sbs")
    .reduce((sum, item) => sum + Number(item.nominal || 0), 0)

  const laporanTotalKeseluruhan = laporanTotalTrf + laporanTotalCash

  const printBukti = (id_logspp: string) => {
    window.open(`https://sakuci.id/${id_logspp}/sppsiswa`, "_blank")
  }

  const hapusLog = async (id_logspp: string) => {
    if (!canDeleteLogSpp(user)) {
      alert("Akses ditolak. Hanya admin keuangan yang boleh menghapus log.")
      return
    }

    if (!confirm("Yakin hapus pembayaran ini?")) return

    try {
      await apiFetch(`/spp/deletelog/${id_logspp}`, {
        method: "DELETE",
      })

      alert("Berhasil dihapus")
      getLogSpp(page)
    } catch (error: any) {
      alert(error.message || "Gagal menghapus log")
    }
  }

  const stopKamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setKameraAktif(false)
  }

  const startKamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setKameraAktif(true)
    } catch (error: any) {
      alert("Gagal mengakses kamera: " + (error.message || "tidak diizinkan"))
      setBuktiBaruMode("file")
    }
  }

  const ambilFotoBukti = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return

        const file = new File([blob], `bukti-kamera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        })

        setBuktiBaru(file)
        stopKamera()
      },
      "image/jpeg",
      0.9
    )
  }

  const ambilUlangFotoBukti = () => {
    setBuktiBaru(null)
    startKamera()
  }

  useEffect(() => {
    if (buktiBaruMode === "kamera" && openEditTanggal) {
      startKamera()
    } else {
      stopKamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buktiBaruMode, openEditTanggal])

  useEffect(() => {
    return () => stopKamera()
  }, [])

  useEffect(() => {
    if (!buktiBaru) {
      setBuktiBaruPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(buktiBaru)
    setBuktiBaruPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [buktiBaru])

  const bukaEditTanggal = (item: LogSpp) => {
    setEditTanggalTarget(item)
    setTanggalBaru(toDatetimeLocalValue(item.created_at))
    setBayarBaru(item.bayar)
    setBuktiBaru(null)
    setBuktiBaruMode("file")
    setOpenEditTanggal(true)
  }

  const simpanEditTanggal = async () => {
    if (!editTanggalTarget) return

    if (!tanggalBaru) {
      alert("Tanggal wajib diisi")
      return
    }

    setSavingTanggal(true)

    try {
      const formData = new FormData()
      formData.append("created_at", new Date(tanggalBaru).toISOString())
      formData.append("bayar", bayarBaru)

      if (buktiBaru) {
        formData.append("bukti", buktiBaru)
      }

      await apiFetch(`/spp/updatelog/${editTanggalTarget.id_logspp}`, {
        method: "PUT",
        body: formData,
      })

      alert("Data berhasil diperbarui")
      setOpenEditTanggal(false)
      getLogSpp(page)
    } catch (error: any) {
      alert(error.message || "Gagal memperbarui data")
    } finally {
      setSavingTanggal(false)
    }
  }

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPage) return
    getLogSpp(targetPage)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body > *:not(#print-area-laporan-spp) {
            display: none !important;
          }

          #print-area-laporan-spp {
            width: 100%;
            background: white !important;
            padding: 8px;
            color: #000 !important;
          }

          #print-area-laporan-spp * {
            color: #000 !important;
            background-color: transparent !important;
          }

          #print-area-laporan-spp table {
            font-size: 10px;
            width: 100%;
          }

          #print-area-laporan-spp th,
          #print-area-laporan-spp td {
            padding: 2px 4px !important;
            line-height: 1.2 !important;
          }

          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Log Pembayaran SPP</h1>
          <p className="text-muted-foreground">
            Riwayat transaksi pembayaran siswa.
          </p>
        </div>

        <Button onClick={bukaPrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print Laporan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Log</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Label>Pencarian</Label>
              <div className="flex gap-2">
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari nama siswa atau kelas..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCari()
                  }}
                />

                <Button onClick={handleCari}>
                  <Search className="w-4 h-4 mr-2" />
                  Cari
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Tingkat</Label>
              <Select
                value={tingkat}
                onValueChange={setTingkat}
                disabled={!isAdminKeuangan(user)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent>
                  {isAdminKeuangan(user) && (
                    <SelectItem value="semua">Semua Tingkat</SelectItem>
                  )}

                  {isAdminKeuangan(user)
                    ? ["10", "11", "12"].map((item) => (
                        <SelectItem key={item} value={item}>
                          Kelas {item}
                        </SelectItem>
                      ))
                    : allowedTingkat.map((item) => (
                        <SelectItem key={item} value={item}>
                          Kelas {item}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            <div>
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

            <div>
              <Label>Metode Bayar</Label>
              <Select value={metode} onValueChange={setMetode}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode bayar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Metode</SelectItem>
                  <SelectItem value="csh">Cash</SelectItem>
                  <SelectItem value="trf">Transfer</SelectItem>
                  <SelectItem value="sbs">Dibebaskan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tanggal Awal</Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Tanggal Akhir</Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilterStartDate("")
                  setFilterEndDate("")
                }}
                disabled={!filterStartDate && !filterEndDate}
              >
                Reset Tanggal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Data Log SPP</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {total} transaksi
          </p>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("nama")}
                    className="flex items-center gap-2"
                  >
                    Nama Siswa
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("kelas")}
                    className="flex items-center gap-2"
                  >
                    Kelas
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("nominal")}
                    className="flex items-center gap-2"
                  >
                    Nominal
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("keterangan")}
                    className="flex items-center gap-2"
                  >
                    Keterangan
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("waktu")}
                    className="flex items-center gap-2"
                  >
                    Waktu
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>

                <TableHead>
                  
                  <button
                    onClick={() => handleSort("bayar")}
                    className="flex items-center gap-2"
                  >
                    Bayar
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>

                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-6 text-muted-foreground"
                  >
                    Data log belum ada
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((item, index) => {
                  const namaSiswa = item.siswa_ppdb?.nama_lengkap || "-"
                  const namaKelas =
                    item.siswa_ppdb?.kelas_terkini?.nama_kelas || "-"
                  const tingkatSiswa =
                    item.siswa_ppdb?.kelas_terkini?.tingkat ||
                    item.kelas ||
                    "-"

                  return (
                    <TableRow key={item.id_logspp}>
                      <TableCell>{(page - 1) * limit + index + 1}</TableCell>

                      <TableCell className="font-medium">
                        {namaSiswa}
                      </TableCell>

                      <TableCell>
                        {tingkatSiswa} {namaKelas}
                      </TableCell>

                      <TableCell className="font-semibold">
                        {formatRupiah(item.nominal)}
                      </TableCell>

                      <TableCell>{getKeterangan(item)}</TableCell>

                      <TableCell>{formatTanggal(item.created_at)}</TableCell>

                      <TableCell>
                        {bayarLabel[item.bayar] || item.bayar}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          
                          {item.bukti ? (
    <Button
      size="sm"
      variant="outline"
      onClick={() => openModalBukti(item.bukti)}
    >
      <ImageIcon className="w-4 h-4 mr-2" />
      Lihat
    </Button>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
                          <Button
                            size="icon-sm"
                            variant="outline"
                            title="Bukti"
                            onClick={() => printBukti(item.id_logspp)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => bukaEditTanggal(item)}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </Button>

                          {canDeleteLogSpp(user) && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => hapusLog(item.id_logspp)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Hapus
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Halaman {page} dari {totalPage} - {limit} data per halaman
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Sebelumnya
              </Button>

              <Button
                variant="outline"
                disabled={page >= totalPage}
                onClick={() => goToPage(page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openPrint} onOpenChange={setOpenPrint}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Laporan Harian SPP</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPrint(false)}>
              Batal
            </Button>

            <Button onClick={printLaporan} disabled={loadingLaporan}>
              <Printer className="w-4 h-4 mr-2" />
              {loadingLaporan ? "Menyiapkan..." : "Buka Laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={openBukti} onOpenChange={setOpenBukti}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>Bukti Pembayaran</DialogTitle>
    </DialogHeader>

    {selectedBukti ? (
      <div className="max-h-[75vh] overflow-auto rounded-lg border bg-muted p-2">
        {selectedBukti.toLowerCase().endsWith(".pdf") ? (
          <iframe
            src={selectedBukti}
            className="w-full h-[70vh] rounded-md"
          />
        ) : (
          <img
            src={selectedBukti}
            alt="Bukti pembayaran"
            className="mx-auto max-h-[70vh] rounded-md object-contain"
          />
        )}
      </div>
    ) : (
      <p className="text-muted-foreground">Bukti tidak tersedia.</p>
    )}
  </DialogContent>
</Dialog>

      <Dialog open={openEditTanggal} onOpenChange={setOpenEditTanggal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Log Pembayaran</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Siswa</Label>
              <Input
                value={editTanggalTarget?.siswa_ppdb?.nama_lengkap || ""}
                disabled
              />
            </div>

            <div>
              <Label>Tanggal &amp; Waktu Baru</Label>
              <Input
                type="datetime-local"
                value={tanggalBaru}
                onChange={(e) => setTanggalBaru(e.target.value)}
              />
            </div>

            <div>
              <Label>Status Pembayaran</Label>
              <Select
                value={bayarBaru}
                onValueChange={(value) =>
                  setBayarBaru(value as "csh" | "trf" | "sbs")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csh">Cash</SelectItem>
                  <SelectItem value="trf">Transfer</SelectItem>
                  <SelectItem value="sbs">Dibebaskan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bukti Pembayaran (opsional)</Label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={buktiBaruMode === "file" ? "default" : "outline"}
                  onClick={() => {
                    setBuktiBaruMode("file")
                    setBuktiBaru(null)
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={buktiBaruMode === "kamera" ? "default" : "outline"}
                  onClick={() => {
                    setBuktiBaruMode("kamera")
                    setBuktiBaru(null)
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ambil dari Kamera
                </Button>
              </div>

              {buktiBaruMode === "file" && !buktiBaru && (
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setBuktiBaru(e.target.files?.[0] || null)}
                />
              )}

              {buktiBaruMode === "kamera" && !buktiBaru && (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-w-sm rounded-lg border bg-black"
                  />

                  <Button
                    type="button"
                    size="sm"
                    onClick={ambilFotoBukti}
                    disabled={!kameraAktif}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Ambil Foto
                  </Button>
                </div>
              )}

              {buktiBaru && buktiBaruPreviewUrl && (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-2.5">
                  <img
                    src={buktiBaruPreviewUrl}
                    alt="Preview bukti"
                    className="h-20 w-20 rounded-lg object-cover"
                  />

                  <div className="flex-1 text-sm text-muted-foreground truncate">
                    {buktiBaru.name}
                  </div>

                  {buktiBaruMode === "kamera" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={ambilUlangFotoBukti}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Ambil Ulang
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => setBuktiBaru(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenEditTanggal(false)}
            >
              Batal
            </Button>

            <Button onClick={simpanEditTanggal} disabled={savingTanggal}>
              {savingTanggal ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {laporanData.length > 0 &&
        laporanRange &&
        typeof document !== "undefined" &&
        createPortal(
          <div id="print-area-laporan-spp" className="hidden print:block">
            <div className="flex items-center gap-3 border-b-2 border-black pb-1 mb-2">
              <img
                src="/logo.png"
                alt="Logo Sekolah"
                className="h-12 w-12 object-contain"
              />
              <div className="flex-1 text-center">
                <p className="font-bold text-base">SMK SANGKURIANG 1 CIMAHI</p>
                <p className="text-xs">
                  Laporan Pembayaran SPP - Periode{" "}
                  {formatTanggalSingkat(laporanRange.start)} s/d{" "}
                  {formatTanggalSingkat(laporanRange.end)}
                </p>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">No</th>
                  <th className="border border-black px-2 py-1 text-left">Nama Siswa</th>
                  <th className="border border-black px-2 py-1 text-left">Kelas</th>
                  <th className="border border-black px-2 py-1 text-left">Nominal</th>
                  <th className="border border-black px-2 py-1 text-left">Tanggal Bayar</th>
                  <th className="border border-black px-2 py-1 text-left">Keterangan</th>
                  <th className="border border-black px-2 py-1 text-left">Metode</th>
                </tr>
              </thead>
              <tbody>
                {laporanSortedData.map((item, index) => {
                  const namaKelas = item.siswa_ppdb?.kelas_terkini?.nama_kelas || "-"
                  const tingkatSiswa =
                    item.siswa_ppdb?.kelas_terkini?.tingkat || item.kelas || "-"

                  return (
                    <tr key={item.id_logspp}>
                      <td className="border border-black px-2 py-1">{index + 1}</td>
                      <td className="border border-black px-2 py-1">
                        {item.siswa_ppdb?.nama_lengkap || "-"}
                      </td>
                      <td className="border border-black px-2 py-1">
                        {tingkatSiswa} {namaKelas}
                      </td>
                      <td className="border border-black px-2 py-1">
                        {formatRupiah(item.nominal)}
                      </td>
                      <td className="border border-black px-2 py-1">
                        {formatTanggal(item.created_at)}
                      </td>
                      <td className="border border-black px-2 py-1">
                        {getKeterangan(item)}
                      </td>
                      <td className="border border-black px-2 py-1">
                        {bayarLabel[item.bayar] || item.bayar}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="mt-2 text-xs space-y-0.5">
              <p>Transfer: {formatRupiah(laporanTotalTrf)}</p>
              <p>Cash: {formatRupiah(laporanTotalCash)}</p>
              <p>Dibebaskan: {formatRupiah(laporanTotalSbs)}</p>
              <p className="font-semibold">
                Total (Transfer + Cash): {formatRupiah(laporanTotalKeseluruhan)}
              </p>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}