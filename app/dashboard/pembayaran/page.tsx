"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, ReceiptText, Search } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { getAllowedTingkat, getUser, UserLogin } from "@/lib/auth"

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
  nominal: number
  bulan: number
  kelas: number
  status: string
  bayar: "csh" | "trf" | "sbs"
  created_at: string
}

type Siswa = {
  id_siswa: string
  nama_lengkap: string
  tahun: number
  log_spp?: LogSpp[]
  siswa_baru?: {
    kelas_ppdb?: {
      id_kelas?: string
      tingkat?: number | string
      nama_kelas?: string
    }
  }
}

type Kelas = {
  id_kelas: string
  tingkat: number | string
  nama_kelas: string
}

type MasterSpp = {
  id_spp: string
  tahun: number
  spp10: number
  spp11: number
  spp12: number
  daftar_ulang_11: number
  daftar_ulang_12: number
  pkl: number
  ujian_akhir: number
}

const bulanSpp = [
  { value: "1", label: "Juli" },
  { value: "2", label: "Agustus" },
  { value: "3", label: "September" },
  { value: "4", label: "Oktober" },
  { value: "5", label: "November" },
  { value: "6", label: "Desember" },
  { value: "7", label: "Januari" },
  { value: "8", label: "Februari" },
  { value: "9", label: "Maret" },
  { value: "10", label: "April" },
  { value: "11", label: "Mei" },
  { value: "12", label: "Juni" },
  { value: "13", label: "Tunggakan Kelas 10" },
  { value: "14", label: "Tunggakan Kelas 11" },
  { value: "15", label: "Tunggakan Kelas 12" },
  { value: "16", label: "Daftar Ulang Kelas 11" },
  { value: "17", label: "Daftar Ulang Kelas 12" },
  { value: "18", label: "PKL" },
  { value: "19", label: "Ujian Akhir" },
]

const bulanTagihan = bulanSpp.slice(0, 12)

const ITEMS_PER_PAGE = 50

const getBulanSekarangSpp = () => {
  const bulan = new Date().getMonth() + 1

  const mapping: Record<number, string> = {
    7: "1",
    8: "2",
    9: "3",
    10: "4",
    11: "5",
    12: "6",
    1: "7",
    2: "8",
    3: "9",
    4: "10",
    5: "11",
    6: "12",
  }

  return mapping[bulan] || "1"
}

const formatRupiah = (value: number) => {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

export default function PembayaranPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [tingkat, setTingkat] = useState("")
  const [idKelas, setIdKelas] = useState("semua")
  const [keyword, setKeyword] = useState("")
  const [bulanFilter, setBulanFilter] = useState(getBulanSekarangSpp())

  const [kelas, setKelas] = useState<Kelas[]>([])
  const [dataSiswa, setDataSiswa] = useState<Siswa[]>([])
  const [masterSpp, setMasterSpp] = useState<Record<number, MasterSpp>>({})

  const [loading, setLoading] = useState(false)
  const [loadingKelas, setLoadingKelas] = useState(false)

  const [sortKey, setSortKey] = useState<
    "nama" | "tingkat" | "kelas" | "tahun" | "tunggakan"
  >("nama")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)

  const [open, setOpen] = useState(false)
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null)

  const [bulan, setBulan] = useState("")
  const [nominal, setNominal] = useState("0")
  const [bayar, setBayar] = useState("csh")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) return

    const allowed = getAllowedTingkat(currentUser.role)

    setUser(currentUser)
    setTingkat(allowed[0])
  }, [])

  const allowedTingkat = user ? getAllowedTingkat(user.role) : []

  const getKelas = async (tingkatValue: string) => {
    if (!tingkatValue) return

    setLoadingKelas(true)

    try {
      const res = await apiFetch(`/kelas/data/${tingkatValue}`)
      setKelas(res.data || [])
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data kelas")
    } finally {
      setLoadingKelas(false)
    }
  }

  const getMasterSpp = async (tahun: number) => {
    if (!tahun) return null
    if (masterSpp[tahun]) return masterSpp[tahun]

    try {
      const res = await apiFetch(`/spp/master/${tahun}`)

      setMasterSpp((prev) => ({
        ...prev,
        [tahun]: res.data,
      }))

      return res.data
    } catch (error) {
      console.error(error)
      return null
    }
  }

  const getSiswa = async () => {
    if (!tingkat) return

    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set("tingkat", tingkat)

      if (idKelas !== "semua") {
        params.set("id_kelas", idKelas)
      }

      if (keyword.trim()) {
        params.set("keyword", keyword.trim())
      }

      const res = await apiFetch(`/spp/siswa?${params.toString()}`)
      const result: Siswa[] = res.data || []

      setDataSiswa(result)
      setPage(1)

      const tahunUnik = [
        ...new Set(result.map((item) => item.tahun).filter(Boolean)),
      ]

      await Promise.all(
        tahunUnik.map((tahun) => getMasterSpp(Number(tahun)))
      )
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data siswa")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tingkat) {
      setIdKelas("semua")
      getKelas(tingkat)
    }
  }, [tingkat])

  useEffect(() => {
    if (tingkat) {
      getSiswa()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkat, idKelas])

  const getTingkatSiswa = (siswa: Siswa) => {
    return String(siswa.siswa_baru?.kelas_ppdb?.tingkat || tingkat)
  }

  const getNamaKelas = (siswa: Siswa) => {
    return siswa.siswa_baru?.kelas_ppdb?.nama_kelas || "-"
  }

  const getNominalSpp = (siswa: Siswa) => {
    const master = masterSpp[siswa.tahun]
    const tingkatSiswa = getTingkatSiswa(siswa)

    if (!master) return 0

    if (tingkatSiswa === "10") return Number(master.spp10 || 0)
    if (tingkatSiswa === "11") return Number(master.spp11 || 0)
    if (tingkatSiswa === "12") return Number(master.spp12 || 0)

    return 0
  }

 const getTotalBayarSpp = (siswa: Siswa) => {
  const tingkatSiswa = Number(getTingkatSiswa(siswa))

  return (
    siswa.log_spp
      ?.filter((log) => {
        return (
          log.status === "spp" &&
          Number(log.kelas) === tingkatSiswa
        )
      })
      .reduce(
        (total, log) =>
          total + Number(log.nominal || 0),
        0
      ) || 0
  )
}

const getTunggakanSpp = (siswa: Siswa) => {
  const nominalPerBulan = getNominalSpp(siswa)

  const totalTagihan =
    nominalPerBulan * Number(bulanFilter)

  const totalBayar =
    getTotalBayarSpp(siswa)

  return Math.max(
    totalTagihan - totalBayar,
    0
  )
}

  const handleSort = (
    key: "nama" | "tingkat" | "kelas" | "tahun" | "tunggakan"
  ) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sortedSiswa = useMemo(() => {
    const result = [...dataSiswa]

    result.sort((a, b) => {
      const getValue = (item: Siswa) => {
        if (sortKey === "nama") return item.nama_lengkap || ""
        if (sortKey === "tingkat") return getTingkatSiswa(item)
        if (sortKey === "kelas") return getNamaKelas(item)
        if (sortKey === "tahun") return item.tahun || 0
        if (sortKey === "tunggakan") return getTunggakanSpp(item)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSiswa, sortKey, sortDirection, masterSpp, bulanFilter])

  const totalPage = Math.ceil(sortedSiswa.length / ITEMS_PER_PAGE) || 1

  const paginatedSiswa = sortedSiswa.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  const bukaModalBayar = (siswa: Siswa) => {
    const nominalDefault = getNominalSpp(siswa)

    setSelectedSiswa(siswa)
    setBulan(bulanFilter)
    setNominal(String(nominalDefault))
    setBayar("csh")
    setOpen(true)
  }

  const simpanPembayaran = async () => {
    if (!selectedSiswa) return

    if (!bulan) {
      alert("Pilih jenis pembayaran dulu")
      return
    }

    if (!nominal || Number(nominal) <= 0) {
      alert("Nominal tidak valid")
      return
    }

    setSaving(true)

    try {
      await apiFetch("/spp/bayar", {
        method: "POST",
        body: JSON.stringify({
          id_siswa: selectedSiswa.id_siswa,
          nominal: Number(nominal),
          bulan: Number(bulan),
          kelas: Number(getTingkatSiswa(selectedSiswa)),
          status: "spp",
          bayar,
        }),
      })

      alert("Pembayaran berhasil disimpan")
      setOpen(false)
      getSiswa()
    } catch (error: any) {
      alert(error.message || "Gagal menyimpan pembayaran")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pembayaran SPP</h1>
        <p className="text-muted-foreground">
          Cari siswa, lihat tunggakan sesuai bulan tagihan, lalu input pembayaran.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Data Siswa</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {user.role === "admin" && (
            <div className="max-w-xs">
              <Label>Tingkat</Label>
              <Select value={tingkat} onValueChange={setTingkat}>
                <SelectTrigger>
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

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Label>Cari Siswa</Label>
              <div className="flex gap-2">
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari nama siswa..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") getSiswa()
                  }}
                />

                <Button onClick={getSiswa}>
                  <Search className="w-4 h-4 mr-2" />
                  Cari
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Kelas</Label>
              <Select
                value={idKelas}
                onValueChange={setIdKelas}
                disabled={loadingKelas}
              >
                <SelectTrigger>
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
              <Label>Bulan Tagihan</Label>
              <Select value={bulanFilter} onValueChange={setBulanFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bulan tagihan" />
                </SelectTrigger>
                <SelectContent>
                  {bulanTagihan.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Data Siswa</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {sortedSiswa.length} siswa
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
                    onClick={() => handleSort("tingkat")}
                    className="flex items-center gap-2"
                  >
                    Tingkat
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
                    onClick={() => handleSort("tahun")}
                    className="flex items-center gap-2"
                  >
                    Tahun
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>

                <TableHead>SPP / Bulan</TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("tunggakan")}
                    className="flex items-center gap-2"
                  >
                    Tunggakan
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
              ) : paginatedSiswa.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-6 text-muted-foreground"
                  >
                    Data siswa belum ada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSiswa.map((siswa, index) => {
                    const tunggakan = getTunggakanSpp(siswa)

                    return (
                    <TableRow key={siswa.id_siswa}>
  <TableCell>
    {(page - 1) * ITEMS_PER_PAGE + index + 1}
  </TableCell>

  <TableCell className="font-medium">
    {siswa.nama_lengkap}
  </TableCell>

  <TableCell>{getTingkatSiswa(siswa)}</TableCell>

  <TableCell>{getNamaKelas(siswa)}</TableCell>

  <TableCell>{siswa.tahun || "-"}</TableCell>

  <TableCell>{formatRupiah(getNominalSpp(siswa))}</TableCell>

  <TableCell className="font-semibold text-red-600">
    {formatRupiah(tunggakan)}
  </TableCell>

  <TableCell className="text-right">
    <Button size="sm" onClick={() => bukaModalBayar(siswa)}>
      <ReceiptText className="w-4 h-4 mr-2" />
      Bayar
    </Button>
  </TableCell>
</TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Halaman {page} dari {totalPage} - 50 data per halaman
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                Sebelumnya
              </Button>

              <Button
                variant="outline"
                disabled={page >= totalPage}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Pembayaran</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nama Siswa</Label>
              <Input value={selectedSiswa?.nama_lengkap || ""} disabled />
            </div>

            <div>
              <Label>Jenis Pembayaran</Label>
              <Select value={bulan} onValueChange={setBulan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  {bulanSpp.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nominal</Label>
              <Input
                type="number"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="Masukkan nominal"
              />
            </div>

            <div>
              <Label>Metode Pembayaran</Label>
              <Select value={bayar} onValueChange={setBayar}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csh">Cash</SelectItem>
                  <SelectItem value="trf">Transfer</SelectItem>
                  <SelectItem value="sbs">Subsidi / Beasiswa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>

            <Button onClick={simpanPembayaran} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}