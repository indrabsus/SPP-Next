"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Printer, Search, Trash2, ImageIcon  } from "lucide-react"

import { apiFetch } from "@/lib/api"
import {
  canDeleteLogSpp,
  getUser,
  UserLogin,
} from "@/lib/auth"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

type LogPpdb = {
  id_log: string
  id_siswa: string
  nominal: string | number
  no_invoice: string
  jenis: "d" | "p" | "l"
  petugas: string | null
  bukti: string | null
  bayar: "csh" | "trf" | "sbs" | null
  created_at: string
  siswa_ppdb?: {
    id_siswa: string
    nama_lengkap: string
    tahun: number
    siswa_baru?: {
      kelas_ppdb?: {
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

type MasterPpdb = {
  id_ppdb: string
  daftar: number
  ppdb: number
  tahun: number
  kode_akses?: string
}

type SortKey =
  | "nama"
  | "tahun"
  | "kelas"
  | "nominal"
  | "jenis"
  | "bayar"
  | "petugas"
  | "waktu"

const bayarLabel: Record<string, string> = {
  csh: "Cash",
  trf: "Transfer",
  sbs: "Dibebaskan",
}

const jenisLabel: Record<string, string> = {
  d: "Daftar",
  p: "PPDB",
  l: "Lainnya",
}

const tahunSekarang = new Date().getFullYear()

const formatRupiah = (value: string | number) => {
  const angka = Number(String(value || 0).replace(/[^\d]/g, "")) || 0
  return `Rp ${angka.toLocaleString("id-ID")}`
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

const toNumber = (value: string | number) => {
  return Number(String(value || 0).replace(/[^\d]/g, "")) || 0
}

export default function LogPpdbPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [data, setData] = useState<LogPpdb[]>([])
  const [loading, setLoading] = useState(false)

  const [keyword, setKeyword] = useState("")
  const [tahun, setTahun] = useState(String(tahunSekarang))
  const [metode, setMetode] = useState("semua")
  const [jenis, setJenis] = useState("semua")
  const [tahunAjaran, setTahunAjaran] = useState("")
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState<string[]>([])

  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPage, setTotalPage] = useState(1)

  const [sortKey, setSortKey] = useState<SortKey>("waktu")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [openBukti, setOpenBukti] = useState(false)
const [selectedBukti, setSelectedBukti] = useState<string | null>(null)

  const [masterPpdb, setMasterPpdb] = useState<Record<number, MasterPpdb>>({})

  const [openHapus, setOpenHapus] = useState(false)
  const [hapusTarget, setHapusTarget] = useState<LogPpdb | null>(null)
  const [kodeAksesHapusInput, setKodeAksesHapusInput] = useState("")
  const [loadingHapus, setLoadingHapus] = useState(false)
  const [savingHapus, setSavingHapus] = useState(false)

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

    setUser(currentUser)
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

  const getLogPpdb = async (targetPage = page) => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set("page", String(targetPage))
      params.set("limit", String(limit))

      if (tahun !== "semua") {
        params.set("tahun", tahun)
      }

      if (tahunAjaran) {
        params.set("tahun_ajaran", tahunAjaran)
      }

      if (keyword.trim()) {
        params.set("keyword", keyword.trim())
      }

      if (jenis !== "semua") {
        params.set("jenis", jenis)
      }

      const res = await apiFetch(`/spp/logppdb?${params.toString()}`)

      let result: LogPpdb[] = res?.data || []

      if (metode !== "semua") {
        result = result.filter((item) => item.bayar === metode)
      }

      setData(result)
      setTotal(res?.total || result.length || 0)
      setTotalPage(res?.totalPage || 1)
      setPage(res?.page || targetPage)
    } catch (error: any) {
      alert(error.message || "Gagal mengambil log PPDB")
      setData([])
      setTotal(0)
      setTotalPage(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && tahunAjaran) {
      getLogPpdb(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tahun, metode, jenis, tahunAjaran])

  const handleCari = () => {
    getLogPpdb(1)
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
      const getValue = (item: LogPpdb) => {
        if (sortKey === "nama") return item.siswa_ppdb?.nama_lengkap || ""
        if (sortKey === "tahun") return Number(item.siswa_ppdb?.tahun || 0)

        if (sortKey === "kelas") {
          const tingkat = item.siswa_ppdb?.kelas_terkini?.tingkat || ""
          const namaKelas = item.siswa_ppdb?.kelas_terkini?.nama_kelas || ""

          return `${tingkat} ${namaKelas}`
        }

        if (sortKey === "nominal") return toNumber(item.nominal)
        if (sortKey === "jenis") return jenisLabel[item.jenis] || item.jenis
        if (sortKey === "bayar") return bayarLabel[item.bayar || ""] || "-"
        if (sortKey === "petugas") return item.petugas || ""
        if (sortKey === "waktu") return new Date(item.created_at).getTime()

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

  const summary = useMemo(() => {
    const totalCashTransfer = data
      .filter((item) => item.bayar === "csh" || item.bayar === "trf")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    const totalDibebaskan = data
      .filter((item) => item.bayar === "sbs")
      .reduce((sum, item) => sum + toNumber(item.nominal), 0)

    return {
      totalTransaksi: data.length,
      totalCashTransfer,
      totalDibebaskan,
    }
  }, [data])

  const printBukti = (id_log: string) => {
    window.open(`https://sakuci.id/${id_log}/ppdbLog`, "_blank")
  }

  const getMasterPpdb = async (tahun: number) => {
    if (!tahun) return null
    if (masterPpdb[tahun]) return masterPpdb[tahun]

    try {
      const res = await apiFetch(`/ppdb/masterppdb?tahun=${tahun}`)

      setMasterPpdb((prev) => ({
        ...prev,
        [tahun]: res.data,
      }))

      return res.data
    } catch (error) {
      console.error(error)
      return null
    }
  }

  const bukaHapus = async (item: LogPpdb) => {
    if (!canDeleteLogSpp(user)) {
      alert("Akses ditolak. Hanya admin keuangan yang boleh menghapus log.")
      return
    }

    setHapusTarget(item)
    setKodeAksesHapusInput("")
    setOpenHapus(true)

    const tahun = item.siswa_ppdb?.tahun
    if (tahun) {
      setLoadingHapus(true)
      await getMasterPpdb(Number(tahun))
      setLoadingHapus(false)
    }
  }

  const konfirmHapus = async () => {
    if (!hapusTarget) return

    const tahun = hapusTarget.siswa_ppdb?.tahun
    const kodeAksesValid = tahun ? masterPpdb[Number(tahun)]?.kode_akses : null

    if (!kodeAksesValid) {
      alert("Kode akses untuk tahun PPDB ini belum diatur di master PPDB.")
      return
    }

    if (kodeAksesHapusInput !== kodeAksesValid) {
      alert("Kode akses salah.")
      return
    }

    setSavingHapus(true)

    try {
      await apiFetch(`/spp/deletelogppdb/${hapusTarget.id_log}`, {
        method: "DELETE",
      })

      alert("Berhasil dihapus")
      setOpenHapus(false)
      getLogPpdb(page)
    } catch (error: any) {
      alert(error.message || "Gagal menghapus log PPDB")
    } finally {
      setSavingHapus(false)
    }
  }

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPage) return
    getLogPpdb(targetPage)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Log Pembayaran PPDB</h1>
          <p className="text-muted-foreground">
            Riwayat transaksi pembayaran PPDB siswa.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.totalTransaksi}</p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Uang Masuk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatRupiah(summary.totalCashTransfer)}
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Dibebaskan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {formatRupiah(summary.totalDibebaskan)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Filter Log PPDB</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Label>Pencarian</Label>
              <div className="flex gap-2">
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari nama siswa, invoice, atau petugas..."
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Tahun Siswa</Label>
              <Select value={tahun} onValueChange={setTahun}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Tahun</SelectItem>
                  {Array.from({ length: 8 }).map((_, index) => {
                    const year = tahunSekarang - index
                    return (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Jenis</Label>
              <Select value={jenis} onValueChange={setJenis}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Jenis</SelectItem>
                  <SelectItem value="d">Daftar</SelectItem>
                  <SelectItem value="p">PPDB</SelectItem>
                  <SelectItem value="l">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <Label>Metode Bayar</Label>
              <Select value={metode} onValueChange={setMetode}>
                <SelectTrigger className="w-full">
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

            <div className="flex items-end">
              <Button className="w-full" onClick={() => getLogPpdb(1)}>
                Tampilkan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="dashboard-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Data Log PPDB</CardTitle>
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
                    onClick={() => handleSort("tahun")}
                    className="flex items-center gap-2"
                  >
                    Tahun
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

                <TableHead>No Invoice</TableHead>

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
                    onClick={() => handleSort("jenis")}
                    className="flex items-center gap-2"
                  >
                    Jenis
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

                <TableHead>
                  <button
                    onClick={() => handleSort("petugas")}
                    className="flex items-center gap-2"
                  >
                    Petugas
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

                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center py-6 text-muted-foreground"
                  >
                    Data log PPDB belum ada
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((item, index) => {
                  const namaSiswa = item.siswa_ppdb?.nama_lengkap || "-"
                  const tahunSiswa = item.siswa_ppdb?.tahun || "-"
                  const tingkat = item.siswa_ppdb?.kelas_terkini?.tingkat || "-"
                  const namaKelas =
                    item.siswa_ppdb?.kelas_terkini?.nama_kelas || "-"

                  return (
                    <TableRow key={item.id_log}>
                      <TableCell>{(page - 1) * limit + index + 1}</TableCell>

                      <TableCell className="font-medium">
                        {namaSiswa}
                      </TableCell>

                      <TableCell>{tahunSiswa}</TableCell>

                      <TableCell>
                        {tingkat} {namaKelas}
                      </TableCell>

                      <TableCell>{item.no_invoice}</TableCell>

                      <TableCell className="font-semibold">
                        {formatRupiah(item.nominal)}
                      </TableCell>

                      <TableCell>{jenisLabel[item.jenis] || item.jenis}</TableCell>

                      <TableCell>
                        {item.bayar
                          ? bayarLabel[item.bayar] || item.bayar
                          : "-"}
                      </TableCell>

                      <TableCell>{item.petugas || "-"}</TableCell>

                      <TableCell>{formatTanggal(item.created_at)}</TableCell>

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
                            onClick={() => printBukti(item.id_log)}
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Bukti
                          </Button>

                          {canDeleteLogSpp(user) && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => bukaHapus(item)}
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

      <Dialog open={openHapus} onOpenChange={setOpenHapus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Log PPDB</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Siswa</Label>
              <Input
                value={hapusTarget?.siswa_ppdb?.nama_lengkap || ""}
                disabled
              />
            </div>

            <div>
              <Label>Kode Akses</Label>
              <Input
                type="password"
                value={kodeAksesHapusInput}
                onChange={(e) => setKodeAksesHapusInput(e.target.value)}
                placeholder="Masukkan kode akses dari master PPDB"
                disabled={loadingHapus}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenHapus(false)}>
              Batal
            </Button>

            <Button
              variant="destructive"
              onClick={konfirmHapus}
              disabled={loadingHapus || savingHapus}
            >
              {savingHapus ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}