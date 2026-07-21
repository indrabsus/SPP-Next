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
  nominal: number
  bulan: number
  kelas: number
  status: string
  bayar: "csh" | "trf" | "sbs"
}

type LogPpdb = {
  nominal: string
  jenis: "d" | "p" | "l"
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
  tingkat: number | string
  nama_kelas: string
}

type MasterSpp = {
  tahun: number
  spp10: number
  spp11: number
  spp12: number
  daftar_ulang_11: number
  daftar_ulang_12: number
  pkl: number
  ujian_akhir: number
}

type MasterPpdb = {
  tahun: number
  ppdb: number
}

type ExtraTagihanKey =
  | "du11"
  | "du12"
  | "spp10"
  | "spp11"
  | "pkl"
  | "ujian"

const extraTagihanOptions: {
  key: ExtraTagihanKey
  label: string
}[] = [
  { key: "du11", label: "Daftar Ulang Kelas 11" },
  { key: "du12", label: "Daftar Ulang Kelas 12" },
  { key: "spp10", label: "Tunggakan SPP Kelas 10" },
  { key: "spp11", label: "Tunggakan SPP Kelas 11" },
  { key: "pkl", label: "Tunggakan PKL" },
  { key: "ujian", label: "Tunggakan Ujian Akhir" },
]

const bulanTagihan = [
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
]

// Kelas 12 cuma menagih SPP untuk 10 bulan pertama (Juli-April) - Mei & Juni
// (value "11" & "12") disembunyikan dari pilihan bulan, dan nominal SPP/bulan
// disesuaikan agar total setahun tetap sama (spp12 * 12 / 10).
const JUMLAH_BULAN_SPP_KELAS_12 = 10
const BULAN_SPP_DISEMBUNYIKAN_KELAS_12 = ["11", "12"]

const getBulanTagihanUntukTingkat = (tingkatValue: string) => {
  if (tingkatValue === "12") {
    return bulanTagihan.filter(
      (item) => !BULAN_SPP_DISEMBUNYIKAN_KELAS_12.includes(item.value)
    )
  }

  return bulanTagihan
}

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

const toNumber = (value: any) => {
  if (!value) return 0
  return Number(String(value).replace(/\D/g, "")) || 0
}

export default function LaporanPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [tingkat, setTingkat] = useState("")
  const [namaKelasFilter, setNamaKelasFilter] = useState("")
  const [tahunAjaran, setTahunAjaran] = useState("")
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState<string[]>([])
  const [keyword, setKeyword] = useState("")
  const [bulanFilter, setBulanFilter] = useState(getBulanSekarangSpp())

  const [kelasSemua, setKelasSemua] = useState<Kelas[]>([])
  const [siswa, setSiswa] = useState<Siswa[]>([])
  const [masterSpp, setMasterSpp] = useState<Record<number, MasterSpp>>({})
  const [masterPpdb, setMasterPpdb] = useState<Record<number, MasterPpdb>>({})

  const [loading, setLoading] = useState(false)
  const [showPpdb, setShowPpdb] = useState(false)

  const [extraTagihan, setExtraTagihan] = useState<
    Record<ExtraTagihanKey, boolean>
  >({
    du11: false,
    du12: false,
    spp10: false,
    spp11: false,
    pkl: false,
    ujian: false,
  })

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

  const resetExtraTagihanByTingkat = (tingkatValue: string) => {
    if (tingkatValue === "10") {
      setShowPpdb(false)
      setExtraTagihan({
        du11: false,
        du12: false,
        spp10: false,
        spp11: false,
        pkl: false,
        ujian: false,
      })
    }

    if (tingkatValue === "11") {
      setShowPpdb(false)
      setExtraTagihan({
        du11: true,
        du12: false,
        spp10: false,
        spp11: false,
        pkl: false,
        ujian: false,
      })
    }

    if (tingkatValue === "12") {
      setShowPpdb(true)
      setExtraTagihan({
        du11: false,
        du12: true,
        spp10: false,
        spp11: false,
        pkl: true,
        ujian: true,
      })
    }
  }

  const isExtraEnabled = (key: ExtraTagihanKey) => {
    if (tingkat === "10") return key === "du11"
    if (tingkat === "11") return key === "du11" || key === "spp10" || key === "pkl"
    if (tingkat === "12") return true

    return false
  }

  const getKelasSemua = async (tahunAjaranValue: string) => {
    if (!tahunAjaranValue) return

    try {
      const res = await apiFetch(
        `/riwayat-kelas/kelas-list?tahun_ajaran=${encodeURIComponent(tahunAjaranValue)}`
      )
      setKelasSemua(res.data || [])
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data kelas")
    }
  }

  // Daftar kelas untuk dropdown - dari riwayat_kelas (bukan kelas_ppdb)
  // supaya selalu sinkron dengan kelas yang benar-benar dipakai siswa di
  // tahun ajaran terpilih, disaring ke tingkat yang dipilih.
  const kelas = useMemo(
    () => kelasSemua.filter((item) => String(item.tingkat) === tingkat),
    [kelasSemua, tingkat]
  )

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

  const getLaporan = async () => {
    if (!tingkat) {
      alert("Pilih tingkat terlebih dahulu")
      return
    }

    if (!namaKelasFilter) {
      alert("Pilih kelas terlebih dahulu")
      return
    }

    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set("tingkat", tingkat)
      params.set("nama_kelas", namaKelasFilter)

      if (tahunAjaran) {
        params.set("tahun_ajaran", tahunAjaran)
      }

      if (keyword.trim()) {
        params.set("keyword", keyword.trim())
      }

      const res = await apiFetch(`/spp/siswa?${params.toString()}`)
      const result: Siswa[] = res.data || []

      setSiswa(result)

      const tahunUnik = [
        ...new Set(result.map((item) => item.tahun).filter(Boolean)),
      ]

      await Promise.all(tahunUnik.map((tahun) => getMasterSpp(Number(tahun))))
      await Promise.all(tahunUnik.map((tahun) => getMasterPpdb(Number(tahun))))
    } catch (error: any) {
      alert(error.message || "Gagal mengambil laporan")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tingkat) {
      setSiswa([])
      setNamaKelasFilter("")
      resetExtraTagihanByTingkat(tingkat)

      if (
        tingkat === "12" &&
        BULAN_SPP_DISEMBUNYIKAN_KELAS_12.includes(bulanFilter)
      ) {
        setBulanFilter("10")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkat])

  useEffect(() => {
    if (tahunAjaran) getKelasSemua(tahunAjaran)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaran])

  const getTingkatSiswa = (item: Siswa) => {
    return String(item.kelas_terkini?.tingkat || tingkat)
  }

  const getNamaKelas = (item: Siswa) => {
    return item.kelas_terkini?.nama_kelas || "-"
  }

  const getNominalSpp = (item: Siswa) => {
    const master = masterSpp[item.tahun]
    const t = getTingkatSiswa(item)

    if (!master) return 0

    if (t === "10") return Number(master.spp10 || 0)
    if (t === "11") return Number(master.spp11 || 0)
    if (t === "12")
      return Math.round((Number(master.spp12 || 0) * 12) / JUMLAH_BULAN_SPP_KELAS_12)

    return 0
  }

  const getTotalBayarByStatus = (
    item: Siswa,
    status: string,
    kelasTagihan?: number
  ) => {
    return (
      item.log_spp
        ?.filter((log) => {
          if (log.status !== status) return false
          if (kelasTagihan) return Number(log.kelas) === kelasTagihan
          return true
        })
        .reduce((total, log) => total + Number(log.nominal || 0), 0) || 0
    )
  }

  const getTotalDibebaskanByStatus = (
    item: Siswa,
    status: string,
    kelasTagihan?: number
  ) => {
    return (
      item.log_spp
        ?.filter((log) => {
          if (log.status !== status) return false
          if (log.bayar !== "sbs") return false
          if (kelasTagihan) return Number(log.kelas) === kelasTagihan
          return true
        })
        .reduce((total, log) => total + Number(log.nominal || 0), 0) || 0
    )
  }

  const getTotalBayarSpp = (item: Siswa) => {
    const tingkatSiswa = Number(getTingkatSiswa(item))
    return getTotalBayarByStatus(item, "spp", tingkatSiswa)
  }

  const getTotalDibebaskanSpp = (item: Siswa) => {
    const tingkatSiswa = Number(getTingkatSiswa(item))
    return getTotalDibebaskanByStatus(item, "spp", tingkatSiswa)
  }

  const getTotalTagihanSpp = (item: Siswa) => {
    return getNominalSpp(item) * Number(bulanFilter)
  }

  const getTunggakanSpp = (item: Siswa) => {
    return Math.max(getTotalTagihanSpp(item) - getTotalBayarSpp(item), 0)
  }

  const getTargetPpdb = (item: Siswa) => {
    return Number(masterPpdb[item.tahun]?.ppdb || 0)
  }

  const getTotalBayarPpdb = (item: Siswa) => {
    return (
      item.log_ppdb
        ?.filter((log) => log.jenis === "p")
        .reduce((total, log) => total + toNumber(log.nominal), 0) || 0
    )
  }

  const getTunggakanPpdb = (item: Siswa) => {
    return Math.max(getTargetPpdb(item) - getTotalBayarPpdb(item), 0)
  }

  const getNominalExtraTagihan = (item: Siswa, key: ExtraTagihanKey) => {
    const master = masterSpp[item.tahun]
    if (!master) return 0

    if (key === "du11") {
      return Math.max(
        Number(master.daftar_ulang_11 || 0) -
          getTotalBayarByStatus(item, "du11"),
        0
      )
    }

    if (key === "du12") {
      return Math.max(
        Number(master.daftar_ulang_12 || 0) -
          getTotalBayarByStatus(item, "du12"),
        0
      )
    }

    if (key === "spp10") {
      const totalTagihan = Number(master.spp10 || 0) * 12
      const totalBayar = getTotalBayarByStatus(item, "spp", 10)

      return Math.max(totalTagihan - totalBayar, 0)
    }

    if (key === "spp11") {
      const totalTagihan = Number(master.spp11 || 0) * 12
      const totalBayar = getTotalBayarByStatus(item, "spp", 11)

      return Math.max(totalTagihan - totalBayar, 0)
    }

    if (key === "pkl") {
      return Math.max(
        Number(master.pkl || 0) - getTotalBayarByStatus(item, "pkl"),
        0
      )
    }

    if (key === "ujian") {
      return Math.max(
        Number(master.ujian_akhir || 0) -
          getTotalBayarByStatus(item, "ujian"),
        0
      )
    }

    return 0
  }

  const getDibebaskanExtraTagihan = (item: Siswa, key: ExtraTagihanKey) => {
    if (key === "du11") return getTotalDibebaskanByStatus(item, "du11")
    if (key === "du12") return getTotalDibebaskanByStatus(item, "du12")
    if (key === "spp10") return getTotalDibebaskanByStatus(item, "spp", 10)
    if (key === "spp11") return getTotalDibebaskanByStatus(item, "spp", 11)
    if (key === "pkl") return getTotalDibebaskanByStatus(item, "pkl")
    if (key === "ujian") return getTotalDibebaskanByStatus(item, "ujian")

    return 0
  }

  const laporan = useMemo(() => {
    return siswa.map((item) => {
      const du11 = extraTagihan.du11 ? getNominalExtraTagihan(item, "du11") : 0
      const du12 = extraTagihan.du12 ? getNominalExtraTagihan(item, "du12") : 0
      const spp10 = extraTagihan.spp10 ? getNominalExtraTagihan(item, "spp10") : 0
      const spp11 = extraTagihan.spp11 ? getNominalExtraTagihan(item, "spp11") : 0
      const pkl = extraTagihan.pkl ? getNominalExtraTagihan(item, "pkl") : 0
      const ujian = extraTagihan.ujian ? getNominalExtraTagihan(item, "ujian") : 0
      const ppdb = showPpdb ? getTunggakanPpdb(item) : 0

      const dibebaskanSpp = getTotalDibebaskanSpp(item)

      const dibebaskanTambahan =
        (extraTagihan.du11 ? getDibebaskanExtraTagihan(item, "du11") : 0) +
        (extraTagihan.du12 ? getDibebaskanExtraTagihan(item, "du12") : 0) +
        (extraTagihan.spp10 ? getDibebaskanExtraTagihan(item, "spp10") : 0) +
        (extraTagihan.spp11 ? getDibebaskanExtraTagihan(item, "spp11") : 0) +
        (extraTagihan.pkl ? getDibebaskanExtraTagihan(item, "pkl") : 0) +
        (extraTagihan.ujian ? getDibebaskanExtraTagihan(item, "ujian") : 0)

      const dibebaskan = dibebaskanSpp + dibebaskanTambahan

      const tunggakanSpp = getTunggakanSpp(item)

      const totalTunggakan =
        tunggakanSpp + ppdb + du11 + du12 + spp10 + spp11 + pkl + ujian

      return {
        siswa: item,
        nama: item.nama_lengkap,
        kelas: `${getTingkatSiswa(item)} ${getNamaKelas(item)}`,
        sppBulanan: getNominalSpp(item),
        totalTagihanSpp: getTotalTagihanSpp(item),
        totalBayarSpp: getTotalBayarSpp(item),
        dibebaskan,
        tunggakanSpp,
        ppdb,
        du11,
        du12,
        spp10,
        spp11,
        pkl,
        ujian,
        totalTunggakan,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siswa, masterSpp, masterPpdb, showPpdb, extraTagihan, bulanFilter])

  const summary = useMemo(() => {
    return laporan.reduce(
      (acc, item) => {
        acc.totalSiswa += 1
        acc.totalTagihanSpp += item.totalTagihanSpp
        acc.totalBayarSpp += item.totalBayarSpp
        acc.dibebaskan += item.dibebaskan
        acc.tunggakanSpp += item.tunggakanSpp
        acc.ppdb += item.ppdb
        acc.du11 += item.du11
        acc.du12 += item.du12
        acc.spp10 += item.spp10
        acc.spp11 += item.spp11
        acc.pkl += item.pkl
        acc.ujian += item.ujian
        acc.totalTunggakan += item.totalTunggakan

        return acc
      },
      {
        totalSiswa: 0,
        totalTagihanSpp: 0,
        totalBayarSpp: 0,
        dibebaskan: 0,
        tunggakanSpp: 0,
        ppdb: 0,
        du11: 0,
        du12: 0,
        spp10: 0,
        spp11: 0,
        pkl: 0,
        ujian: 0,
        totalTunggakan: 0,
      }
    )
  }, [laporan])

  const jumlahKolom =
    8 +
    (showPpdb ? 1 : 0) +
    Object.values(extraTagihan).filter(Boolean).length

  const printPdf = () => {
    window.print()
  }

  const labelBulanFilter =
    bulanTagihan.find((item) => item.value === bulanFilter)?.label || "-"

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
            padding: 12px;
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

          /* Rapatkan jarak antar section (kop, ringkasan, tabel, rincian)
             supaya tidak makan halaman percuma. */
          #print-area > * + * {
            margin-top: 3px !important;
          }

          .print-tight-card {
            padding: 3px !important;
            gap: 3px !important;
            border-radius: 4px !important;
            box-shadow: none !important;
          }

          .print-tight-card [data-slot="card-header"],
          .print-tight-card [data-slot="card-content"] {
            padding: 2px 6px !important;
          }

          .print-tight-card [data-slot="card-title"] {
            font-size: 11px !important;
          }

          /* Rincian per kolom tunggakan (Ringkasan Kolom Aktif) - tetap
             ditampilkan lengkap, cuma kotaknya dirapatkan. */
          .print-detail-grid {
            gap: 3px !important;
          }

          .print-detail-item {
            padding: 2px 6px !important;
            border-radius: 3px !important;
          }

          table {
            font-size: 7px;
          }

          th,
          td {
            height: auto !important;
            padding: 1px 3px !important;
            line-height: 1.1 !important;
          }

          @page {
            size: A4 landscape;
            margin: 5mm;
          }
        }
      `}</style>

      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Laporan Keuangan Siswa</h1>
          <p className="text-muted-foreground">
            Pilih kelas, tentukan kolom tagihan, lalu cetak laporan.
          </p>
        </div>

        <Button onClick={printPdf} disabled={laporan.length === 0}>
          <Printer className="w-4 h-4 mr-2" />
          Print / PDF
        </Button>
      </div>

      <Card className="no-print dashboard-card">
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
              <Select value={namaKelasFilter} onValueChange={setNamaKelasFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {kelas.map((item) => (
                    <SelectItem key={item.nama_kelas} value={item.nama_kelas}>
                      {item.nama_kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cari Siswa</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Opsional..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") getLaporan()
                }}
              />
            </div>

            <div>
              <Label>Bulan Tagihan SPP</Label>
              <Select value={bulanFilter} onValueChange={setBulanFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih bulan tagihan" />
                </SelectTrigger>
                <SelectContent>
                  {getBulanTagihanUntukTingkat(tingkat).map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full" onClick={getLaporan} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                {loading ? "Mengambil..." : "Tampilkan"}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <Label>Kolom Tunggakan Tambahan</Label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={showPpdb}
                  onChange={(e) => setShowPpdb(e.target.checked)}
                />
                Tunggakan PPDB
              </label>

              {extraTagihanOptions.map((item) => {
                const enabled = isExtraEnabled(item.key)

                return (
                  <label
                    key={item.key}
                    className={`flex items-center gap-2 text-sm ${
                      enabled ? "" : "opacity-40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!enabled}
                      checked={extraTagihan[item.key]}
                      onChange={(e) =>
                        setExtraTagihan((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                    />
                    {item.label}
                  </label>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div id="print-area" className="space-y-6">
        <div className="hidden print:block text-center leading-tight">
          <h1 className="text-sm font-bold">LAPORAN KEUANGAN SISWA</h1>
          <p className="text-[9px]">
            Kelas: {laporan[0]?.kelas || "-"} · Tunggakan SPP s.d. Bulan:{" "}
            {labelBulanFilter} · Tanggal Cetak:{" "}
            {new Date().toLocaleDateString("id-ID")}
          </p>
        </div>

        <Card className="dashboard-card print-tight-card">
          <CardHeader>
            <CardTitle>Detail Laporan</CardTitle>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>SPP / Bulan</TableHead>
                  <TableHead>Bayar SPP</TableHead>
                  <TableHead>Dibebaskan</TableHead>
                  <TableHead>Tunggakan SPP (s.d. {labelBulanFilter})</TableHead>

                  {showPpdb && <TableHead>PPDB</TableHead>}
                  {extraTagihan.du11 && <TableHead>DU 11</TableHead>}
                  {extraTagihan.du12 && <TableHead>DU 12</TableHead>}
                  {extraTagihan.spp10 && <TableHead>SPP 10</TableHead>}
                  {extraTagihan.spp11 && <TableHead>SPP 11</TableHead>}
                  {extraTagihan.pkl && <TableHead>PKL</TableHead>}
                  {extraTagihan.ujian && <TableHead>Ujian</TableHead>}

                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {laporan.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={jumlahKolom}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Silakan pilih kelas lalu klik tampilkan.
                    </TableCell>
                  </TableRow>
                ) : (
                  laporan.map((item, index) => (
                    <TableRow key={item.siswa.id_siswa}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell>{item.kelas}</TableCell>
                      <TableCell>{formatRupiah(item.sppBulanan)}</TableCell>
                      <TableCell>{formatRupiah(item.totalBayarSpp)}</TableCell>
                      <TableCell className="text-amber-600 font-semibold">
                        {formatRupiah(item.dibebaskan)}
                      </TableCell>
                      <TableCell className="text-red-600 font-semibold">
                        {formatRupiah(item.tunggakanSpp)}
                      </TableCell>

                      {showPpdb && (
                        <TableCell className="text-red-600 font-semibold">
                          {formatRupiah(item.ppdb)}
                        </TableCell>
                      )}

                      {extraTagihan.du11 && (
                        <TableCell>{formatRupiah(item.du11)}</TableCell>
                      )}

                      {extraTagihan.du12 && (
                        <TableCell>{formatRupiah(item.du12)}</TableCell>
                      )}

                      {extraTagihan.spp10 && (
                        <TableCell>{formatRupiah(item.spp10)}</TableCell>
                      )}

                      {extraTagihan.spp11 && (
                        <TableCell>{formatRupiah(item.spp11)}</TableCell>
                      )}

                      {extraTagihan.pkl && (
                        <TableCell>{formatRupiah(item.pkl)}</TableCell>
                      )}

                      {extraTagihan.ujian && (
                        <TableCell>{formatRupiah(item.ujian)}</TableCell>
                      )}

                      <TableCell className="text-red-600 font-bold">
                        {formatRupiah(item.totalTunggakan)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {laporan.length > 0 && (
          <Card className="dashboard-card print-tight-card">
            <CardHeader>
              <CardTitle>Ringkasan Kolom Aktif</CardTitle>
            </CardHeader>

            <CardContent className="print-detail-grid grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="print-detail-item flex justify-between border rounded-lg p-3">
                <span>Tunggakan SPP (s.d. {labelBulanFilter})</span>
                <strong>{formatRupiah(summary.tunggakanSpp)}</strong>
              </div>

              <div className="print-detail-item flex justify-between border rounded-lg p-3 text-amber-600">
                <span>Dibebaskan</span>
                <strong>{formatRupiah(summary.dibebaskan)}</strong>
              </div>

              {showPpdb && (
                <div className="print-detail-item flex justify-between border rounded-lg p-3">
                  <span>PPDB</span>
                  <strong>{formatRupiah(summary.ppdb)}</strong>
                </div>
              )}

              {extraTagihan.du11 && (
                <div className="print-detail-item flex justify-between border rounded-lg p-3">
                  <span>DU 11</span>
                  <strong>{formatRupiah(summary.du11)}</strong>
                </div>
              )}

              {extraTagihan.du12 && (
                <div className="print-detail-item flex justify-between border rounded-lg p-3">
                  <span>DU 12</span>
                  <strong>{formatRupiah(summary.du12)}</strong>
                </div>
              )}

              {extraTagihan.spp10 && (
                <div className="print-detail-item flex justify-between border rounded-lg p-3">
                  <span>SPP 10</span>
                  <strong>{formatRupiah(summary.spp10)}</strong>
                </div>
              )}

              {extraTagihan.spp11 && (
                <div className="print-detail-item flex justify-between border rounded-lg p-3">
                  <span>SPP 11</span>
                  <strong>{formatRupiah(summary.spp11)}</strong>
                </div>
              )}

              {extraTagihan.pkl && (
                <div className="print-detail-item flex justify-between border rounded-lg p-3">
                  <span>PKL</span>
                  <strong>{formatRupiah(summary.pkl)}</strong>
                </div>
              )}

              {extraTagihan.ujian && (
                <div className="print-detail-item flex justify-between border rounded-lg p-3">
                  <span>Ujian</span>
                  <strong>{formatRupiah(summary.ujian)}</strong>
                </div>
              )}

              <div className="print-detail-item flex justify-between border rounded-lg p-3 text-red-600">
                <span>Total Keseluruhan</span>
                <strong>{formatRupiah(summary.totalTunggakan)}</strong>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}