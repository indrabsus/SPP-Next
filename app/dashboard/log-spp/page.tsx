"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpDown,
  ImageIcon,
  Pencil,
  Printer,
  Search,
  Trash2,
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

const KODE_AKSES_EDIT_TANGGAL = "123oke"

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

  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPage, setTotalPage] = useState(1)

  const [sortKey, setSortKey] = useState<SortKey>("waktu")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [openPrint, setOpenPrint] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [openBukti, setOpenBukti] = useState(false)
const [selectedBukti, setSelectedBukti] = useState<string | null>(null)

  const [openEditTanggal, setOpenEditTanggal] = useState(false)
  const [editTanggalTarget, setEditTanggalTarget] = useState<LogSpp | null>(
    null
  )
  const [kodeAksesInput, setKodeAksesInput] = useState("")
  const [tanggalBaru, setTanggalBaru] = useState("")
  const [savingTanggal, setSavingTanggal] = useState(false)

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
  }, [user, tingkat, metode, tahunAjaran])

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
    setStartDate(today)
    setEndDate(today)
    setOpenPrint(true)
  }

  const printLaporan = () => {
    if (!startDate || !endDate) {
      alert("Tanggal awal dan akhir wajib diisi")
      return
    }

    const url = `https://sakuci.id/rekapharianspp?start_date=${startDate}&end_date=${endDate}`
    window.open(url, "_blank")
    setOpenPrint(false)
  }

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

  const bukaEditTanggal = (item: LogSpp) => {
    setEditTanggalTarget(item)
    setTanggalBaru(toDatetimeLocalValue(item.created_at))
    setKodeAksesInput("")
    setOpenEditTanggal(true)
  }

  const simpanEditTanggal = async () => {
    if (!editTanggalTarget) return

    if (kodeAksesInput !== KODE_AKSES_EDIT_TANGGAL) {
      alert("Kode akses salah.")
      return
    }

    if (!tanggalBaru) {
      alert("Tanggal wajib diisi")
      return
    }

    setSavingTanggal(true)

    try {
      await apiFetch(`/spp/updatelog/${editTanggalTarget.id_logspp}`, {
        method: "PUT",
        body: JSON.stringify({
          created_at: new Date(tanggalBaru).toISOString(),
        }),
      })

      alert("Tanggal berhasil diperbarui")
      setOpenEditTanggal(false)
      getLogSpp(page)
    } catch (error: any) {
      alert(error.message || "Gagal memperbarui tanggal")
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
                            size="sm"
                            variant="outline"
                            onClick={() => printBukti(item.id_logspp)}
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Bukti
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => bukaEditTanggal(item)}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Tanggal
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

            <Button onClick={printLaporan}>
              <Printer className="w-4 h-4 mr-2" />
              Buka Laporan
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
            <DialogTitle>Edit Tanggal Pembayaran</DialogTitle>
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
              <Label>Kode Akses</Label>
              <Input
                type="password"
                value={kodeAksesInput}
                onChange={(e) => setKodeAksesInput(e.target.value)}
                placeholder="Masukkan kode akses"
              />
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
    </div>
  )
}