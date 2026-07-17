"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUpDown,
  Camera,
  ChevronLeft,
  ChevronRight,
  Filter,
  History,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import {
  getAllowedTingkat,
  getUser,
  isAdminKeuangan,
  UserLogin,
} from "@/lib/auth"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

type LogPpdb = {
  id_log: string
  nominal: string
  jenis: "d" | "p" | "l"
  bayar: "csh" | "trf" | null
  created_at: string
}

type Siswa = {
  id_siswa: string
  nama_lengkap: string
  tahun: number
  log_ppdb?: LogPpdb[]
  log_spp?: LogSpp[]
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

type MasterPpdb = {
  id_ppdb: string
  daftar: number
  ppdb: number
  tahun: number
}

type ExtraTagihanKey =
  | "du11"
  | "du12"
  | "spp10"
  | "spp11"
  | "pkl"
  | "ujian"

type PaymentMode = "spp" | "ppdb"

const extraTagihanOptions = [
  { key: "du11", label: "Daftar Ulang Kelas 11" },
  { key: "du12", label: "Daftar Ulang Kelas 12" },
  { key: "spp10", label: "Tunggakan SPP Kelas 10" },
  { key: "spp11", label: "Tunggakan SPP Kelas 11" },
  { key: "pkl", label: "Tunggakan PKL" },
  { key: "ujian", label: "Tunggakan Ujian Akhir" },
] as const

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

// Kelas 12 cuma menagih SPP untuk 10 bulan pertama (Juli-April) - Mei & Juni
// (value "11" & "12") disembunyikan dari pilihan bulan.
const JUMLAH_BULAN_SPP_KELAS_12 = 10
const BULAN_SPP_DISEMBUNYIKAN_KELAS_12 = ["11", "12"]

const getBulanSppUntukTingkat = (tingkatSiswa: string) => {
  if (tingkatSiswa === "12") {
    return bulanSpp.filter(
      (item) => !BULAN_SPP_DISEMBUNYIKAN_KELAS_12.includes(item.value)
    )
  }

  return bulanSpp
}

const getBulanTagihanUntukTingkat = (tingkatValue: string) => {
  if (tingkatValue === "12") {
    return bulanTagihan.filter(
      (item) => !BULAN_SPP_DISEMBUNYIKAN_KELAS_12.includes(item.value)
    )
  }

  return bulanTagihan
}

// Bulan 13/14/15 ("Tunggakan Kelas 10/11/12") itu tagihan yang menempel ke
// tingkat tertentu, terlepas dari tingkat siswa sekarang - jadi log_spp.kelas
// harus ikut angka tunggakannya, bukan tingkat siswa saat ini.
const KELAS_TUNGGAKAN_BY_BULAN: Record<string, string> = {
  "13": "10",
  "14": "11",
  "15": "12",
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

const getLabelBulan = (bulanValue: number) => {
  const found = bulanSpp.find((item) => item.value === String(bulanValue))
  return found?.label || "-"
}

const getLabelBayar = (value: string) => {
  if (value === "csh") return "Cash"
  if (value === "trf") return "Transfer"
  if (value === "sbs") return "Dibebaskan"
  return value
}

const toNumber = (value: any) => {
  if (!value) return 0

  return (
    Number(
      String(value)
        .replace(/\./g, "")
        .replace(/,/g, "")
        .replace(/[^\d]/g, "")
    ) || 0
  )
}

export default function PembayaranPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [tingkat, setTingkat] = useState("")
  const [idKelas, setIdKelas] = useState("semua")
  const [tahunAjaran, setTahunAjaran] = useState("")
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState<string[]>([])
  const [keyword, setKeyword] = useState("")
  const [bulanFilter, setBulanFilter] = useState(getBulanSekarangSpp())
  const [showPpdb, setShowPpdb] = useState(false)

  const [kelas, setKelas] = useState<Kelas[]>([])
  const [dataSiswa, setDataSiswa] = useState<Siswa[]>([])
  const [masterSpp, setMasterSpp] = useState<Record<number, MasterSpp>>({})
  const [masterPpdb, setMasterPpdb] = useState<Record<number, MasterPpdb>>({})

  const [loading, setLoading] = useState(false)
  const [loadingKelas, setLoadingKelas] = useState(false)

  const [sortKey, setSortKey] = useState<
    "nama" | "kelas" | "tunggakan" | "ppdb" | ExtraTagihanKey
  >("nama")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)

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

  const [open, setOpen] = useState(false)
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null)

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("spp")
  const [bulan, setBulan] = useState("")
  const [nominal, setNominal] = useState("0")
  const [bayar, setBayar] = useState<"csh" | "trf" | "sbs">("csh")
  const [bukti, setBukti] = useState<File | null>(null)
  const [buktiPreviewUrl, setBuktiPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [buktiMode, setBuktiMode] = useState<"file" | "kamera">("file")
  const [kameraAktif, setKameraAktif] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [logLast, setLogLast] = useState<LogSpp[]>([])
  const [loadingLogLast, setLoadingLogLast] = useState(false)

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

  const getSiswa = async () => {
    if (!tingkat) return

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

      await Promise.all(tahunUnik.map((tahun) => getMasterSpp(Number(tahun))))
      await Promise.all(tahunUnik.map((tahun) => getMasterPpdb(Number(tahun))))
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data siswa")
    } finally {
      setLoading(false)
    }
  }

  const getLogLast = async (id_siswa: string) => {
    setLoadingLogLast(true)

    try {
      const res = await apiFetch(`/spp/loglast/${id_siswa}`)
      setLogLast(res.data || [])
    } catch (error) {
      console.error(error)
      setLogLast([])
    } finally {
      setLoadingLogLast(false)
    }
  }

  useEffect(() => {
    if (tingkat) {
      setIdKelas("semua")
      resetExtraTagihanByTingkat(tingkat)
      getKelas(tingkat)

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
    if (tingkat && tahunAjaran) {
      getSiswa()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkat, idKelas, tahunAjaran])

  const getTingkatSiswa = (siswa: Siswa) => {
    return String(siswa.kelas_terkini?.tingkat || tingkat)
  }

  const getNamaKelas = (siswa: Siswa) => {
    return siswa.kelas_terkini?.nama_kelas || "-"
  }

  const getNominalSpp = (siswa: Siswa) => {
    const master = masterSpp[siswa.tahun]
    const tingkatSiswa = getTingkatSiswa(siswa)

    if (!master) return 0

    if (tingkatSiswa === "10") return Number(master.spp10 || 0)
    if (tingkatSiswa === "11") return Number(master.spp11 || 0)

    if (tingkatSiswa === "12") {
      // Kelas 12 cuma nagih SPP 10 bulan (Juli-April, bulan 11 & 12
      // dikosongkan), bukan 12 bulan penuh - total setahun dipertahankan
      // sama dengan menaikkan nominal per bulannya (x12/10).
      return Math.round((Number(master.spp12 || 0) * 12) / JUMLAH_BULAN_SPP_KELAS_12)
    }

    return 0
  }

  const getTargetPpdb = (siswa: Siswa) => {
    const master = masterPpdb[siswa.tahun]
    return Number(master?.ppdb || 0)
  }

  const getTotalBayarPpdb = (siswa: Siswa) => {
    return (
      siswa.log_ppdb
        ?.filter((log) => log.jenis === "p")
        .reduce((total, log) => total + toNumber(log.nominal), 0) || 0
    )
  }

  const getTunggakanPpdb = (siswa: Siswa) => {
    const target = getTargetPpdb(siswa)
    const totalBayar = getTotalBayarPpdb(siswa)
    return Math.max(target - totalBayar, 0)
  }

  const getTotalBayarByStatus = (
    siswa: Siswa,
    status: string,
    kelasTagihan?: number
  ) => {
    return (
      siswa.log_spp
        ?.filter((log) => {
          if (log.status !== status) return false
          if (kelasTagihan) return Number(log.kelas) === kelasTagihan
          return true
        })
        .reduce((total, log) => total + Number(log.nominal || 0), 0) || 0
    )
  }

  const getTotalBayarSpp = (siswa: Siswa) => {
    const tingkatSiswa = Number(getTingkatSiswa(siswa))
    return getTotalBayarByStatus(siswa, "spp", tingkatSiswa)
  }

  const getTunggakanSpp = (siswa: Siswa) => {
    const nominalPerBulan = getNominalSpp(siswa)
    const totalTagihan = nominalPerBulan * Number(bulanFilter)
    const totalBayar = getTotalBayarSpp(siswa)

    return Math.max(totalTagihan - totalBayar, 0)
  }

  const getNominalExtraTagihan = (siswa: Siswa, key: ExtraTagihanKey) => {
    const master = masterSpp[siswa.tahun]
    if (!master) return 0

    if (key === "du11") {
      return Math.max(
        Number(master.daftar_ulang_11 || 0) -
          getTotalBayarByStatus(siswa, "du11"),
        0
      )
    }

    if (key === "du12") {
      return Math.max(
        Number(master.daftar_ulang_12 || 0) -
          getTotalBayarByStatus(siswa, "du12"),
        0
      )
    }

    if (key === "spp10") {
      const totalTagihan = Number(master.spp10 || 0) * 12
      const totalBayar = getTotalBayarByStatus(siswa, "spp", 10)
      return Math.max(totalTagihan - totalBayar, 0)
    }

    if (key === "spp11") {
      const totalTagihan = Number(master.spp11 || 0) * 12
      const totalBayar = getTotalBayarByStatus(siswa, "spp", 11)
      return Math.max(totalTagihan - totalBayar, 0)
    }

    if (key === "pkl") {
      return Math.max(
        Number(master.pkl || 0) - getTotalBayarByStatus(siswa, "pkl"),
        0
      )
    }

    if (key === "ujian") {
      return Math.max(
        Number(master.ujian_akhir || 0) -
          getTotalBayarByStatus(siswa, "ujian"),
        0
      )
    }

    return 0
  }

  const getStatusByBulan = (bulanValue: string) => {
    if (bulanValue === "16") return "du11"
    if (bulanValue === "17") return "du12"
    if (bulanValue === "18") return "pkl"
    if (bulanValue === "19") return "ujian"

    return "spp"
  }

  const getNominalDefaultByBulan = (siswa: Siswa, bulanValue: string) => {
    const master = masterSpp[siswa.tahun]
    if (!master) return 0

    if (bulanValue === "16") return Number(master.daftar_ulang_11 || 0)
    if (bulanValue === "17") return Number(master.daftar_ulang_12 || 0)
    if (bulanValue === "18") return Number(master.pkl || 0)
    if (bulanValue === "19") return Number(master.ujian_akhir || 0)

    return getNominalSpp(siswa)
  }

  const handleSort = (
    key: "nama" | "kelas" | "tunggakan" | "ppdb" | ExtraTagihanKey
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
        if (sortKey === "kelas") return `${getTingkatSiswa(item)} ${getNamaKelas(item)}`
        if (sortKey === "tunggakan") return getTunggakanSpp(item)
        if (sortKey === "ppdb") return getTunggakanPpdb(item)

        return getNominalExtraTagihan(item, sortKey as ExtraTagihanKey)
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
  }, [
    dataSiswa,
    sortKey,
    sortDirection,
    masterSpp,
    masterPpdb,
    bulanFilter,
    extraTagihan,
    showPpdb,
  ])

  const totalPage = Math.ceil(sortedSiswa.length / ITEMS_PER_PAGE) || 1

  const paginatedSiswa = sortedSiswa.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

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
      setBuktiMode("file")
    }
  }

  const ambilFoto = () => {
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

        setBukti(file)
        stopKamera()
      },
      "image/jpeg",
      0.9
    )
  }

  useEffect(() => {
    if (buktiMode === "kamera" && open) {
      startKamera()
    } else {
      stopKamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buktiMode, open])

  useEffect(() => {
    return () => stopKamera()
  }, [])

  const ambilUlangFoto = () => {
    setBukti(null)
    startKamera()
  }

  useEffect(() => {
    if (!bukti) {
      setBuktiPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(bukti)
    setBuktiPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [bukti])

  const bukaModalBayar = (siswa: Siswa, mode: PaymentMode = "spp") => {
    setSelectedSiswa(siswa)
    setPaymentMode(mode)
    setBukti(null)
    setBuktiMode("file")
    setLogLast([])
    setOpen(true)

    if (mode === "ppdb") {
      setBulan("ppdb")
      setNominal(String(getTunggakanPpdb(siswa)))
      setBayar("csh")
    } else {
      const tingkatSiswa = getTingkatSiswa(siswa)
      const bulanDefault =
        tingkatSiswa === "12" &&
        BULAN_SPP_DISEMBUNYIKAN_KELAS_12.includes(bulanFilter)
          ? "10"
          : bulanFilter

      setBulan(bulanDefault)
      setNominal(String(getNominalSpp(siswa)))
      setBayar("csh")
    }

    getLogLast(siswa.id_siswa)
  }

  const handleChangeJenisPembayaran = (value: string) => {
    setBulan(value)

    if (!selectedSiswa) return

    const nominalDefault = getNominalDefaultByBulan(selectedSiswa, value)
    setNominal(String(nominalDefault))
  }

  const simpanPembayaran = async () => {
    if (!selectedSiswa) return

    if (!nominal || Number(nominal) <= 0) {
      alert("Nominal tidak valid")
      return
    }

    setSaving(true)

    try {
      const formData = new FormData()

      formData.append("id_siswa", selectedSiswa.id_siswa)
      formData.append("nominal", String(Number(nominal)))
      formData.append("bayar", bayar)

      if (bukti) {
        formData.append("bukti", bukti)
      }

      if (paymentMode === "ppdb") {
        formData.append("petugas", user?.username || "admin")

        await apiFetch("/ppdb/bayarppdb", {
          method: "POST",
          body: formData,
        })
      } else {
        if (!bulan) {
          alert("Pilih jenis pembayaran dulu")
          return
        }

        const kelasUntukLog =
          KELAS_TUNGGAKAN_BY_BULAN[bulan] || getTingkatSiswa(selectedSiswa)

        formData.append("bulan", String(Number(bulan)))
        formData.append("kelas", String(Number(kelasUntukLog)))
        formData.append("status", getStatusByBulan(bulan))

        await apiFetch("/spp/bayar", {
          method: "POST",
          body: formData,
        })
      }

      alert("Pembayaran berhasil disimpan")
      setOpen(false)
      setBukti(null)
      getSiswa()
    } catch (error: any) {
      alert(error.message || "Gagal menyimpan pembayaran")
    } finally {
      setSaving(false)
    }
  }

  const jumlahKolomTambahan =
    Object.values(extraTagihan).filter(Boolean).length + (showPpdb ? 1 : 0)

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Wallet className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pembayaran SPP</h1>
          <p className="text-sm text-muted-foreground">
            Cari siswa, lihat tunggakan, lalu input pembayaran.
          </p>
        </div>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Filter Data Siswa
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-col md:flex-row gap-3">
            {isAdminKeuangan(user) && (
              <div className="max-w-xs w-full">
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

            <div className="max-w-xs w-full">
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
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Label>Cari Siswa</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Cari nama siswa..."
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") getSiswa()
                    }}
                  />
                </div>

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
              <Label>Bulan Tagihan SPP</Label>
              <Select value={bulanFilter} onValueChange={setBulanFilter}>
                <SelectTrigger>
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
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <Label className="flex items-center gap-2 text-foreground">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              Kolom Tunggakan
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                <Checkbox
                  checked={showPpdb}
                  onCheckedChange={(checked) => setShowPpdb(checked === true)}
                />
                Tunggakan PPDB
              </label>

              {extraTagihanOptions.map((item) => {
                const enabled = isExtraEnabled(item.key)

                return (
                  <label
                    key={item.key}
                    className={`flex items-center gap-2 text-sm select-none ${
                      enabled ? "cursor-pointer" : "opacity-40"
                    }`}
                  >
                    <Checkbox
                      checked={extraTagihan[item.key]}
                      disabled={!enabled}
                      onCheckedChange={(checked) =>
                        setExtraTagihan((prev) => ({
                          ...prev,
                          [item.key]: checked === true,
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

      <Card className="dashboard-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Data Siswa
          </CardTitle>
          <Badge variant="secondary" className="font-semibold">
            {sortedSiswa.length} siswa
          </Badge>
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

                <TableHead>SPP / Bulan</TableHead>

                <TableHead>
                  <button
                    onClick={() => handleSort("tunggakan")}
                    className="flex items-center gap-2"
                  >
                    Tunggakan SPP
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>

                {showPpdb && (
                  <TableHead>
                    <button
                      onClick={() => handleSort("ppdb")}
                      className="flex items-center gap-2"
                    >
                      Tunggakan PPDB
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </TableHead>
                )}

                {extraTagihanOptions.map((item) => {
                  if (!extraTagihan[item.key]) return null

                  return (
                    <TableHead key={item.key}>
                      <button
                        onClick={() => handleSort(item.key)}
                        className="flex items-center gap-2"
                      >
                        {item.label}
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </TableHead>
                  )
                })}

                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6 + jumlahKolomTambahan}
                    className="py-10"
                  >
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengambil data siswa...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedSiswa.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6 + jumlahKolomTambahan}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Data siswa belum ada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSiswa.map((siswa, index) => (
                  <TableRow key={siswa.id_siswa}>
                    <TableCell>
                      {(page - 1) * ITEMS_PER_PAGE + index + 1}
                    </TableCell>

                    <TableCell className="font-medium">
                      {siswa.nama_lengkap}
                    </TableCell>

                    <TableCell>
                      {getTingkatSiswa(siswa)} {getNamaKelas(siswa)}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {formatRupiah(getNominalSpp(siswa))}
                    </TableCell>

                    <TableCell className="font-semibold text-red-600 dark:text-red-400">
                      {formatRupiah(getTunggakanSpp(siswa))}
                    </TableCell>

                    {showPpdb && (
                      <TableCell className="font-semibold text-red-600 dark:text-red-400">
                        {formatRupiah(getTunggakanPpdb(siswa))}
                      </TableCell>
                    )}

                    {extraTagihanOptions.map((item) => {
                      if (!extraTagihan[item.key]) return null

                      return (
                        <TableCell
                          key={item.key}
                          className="font-semibold text-red-600 dark:text-red-400"
                        >
                          {formatRupiah(
                            getNominalExtraTagihan(siswa, item.key)
                          )}
                        </TableCell>
                      )
                    })}

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => bukaModalBayar(siswa, "spp")}
                        >
                          <ReceiptText className="w-4 h-4 mr-2" />
                          Bayar SPP
                        </Button>

                        {showPpdb && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => bukaModalBayar(siswa, "ppdb")}
                          >
                            Bayar PPDB
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelumnya
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPage}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Berikutnya
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {paymentMode === "ppdb"
                ? "Input Pembayaran PPDB"
                : "Input Pembayaran SPP"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nama Siswa</Label>
              <Input value={selectedSiswa?.nama_lengkap || ""} disabled />
            </div>

            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <Label className="flex items-center gap-2 text-foreground">
                <History className="w-4 h-4 text-muted-foreground" />
                3 Pembayaran SPP Terakhir
              </Label>

              {loadingLogLast ? (
                <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengambil log pembayaran...
                </div>
              ) : logLast.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada riwayat pembayaran.
                </p>
              ) : (
                <div className="space-y-2">
                  {logLast.map((log) => (
                    <div
                      key={log.id_logspp}
                      className="rounded-lg bg-background border p-2.5 text-sm flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {getLabelBulan(Number(log.bulan))} / Kelas {log.kelas}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTanggal(log.created_at)} -{" "}
                          {getLabelBayar(log.bayar)}
                        </p>
                      </div>

                      <p className="font-semibold shrink-0">
                        {formatRupiah(log.nominal)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {paymentMode === "spp" ? (
              <div>
                <Label>Jenis Pembayaran</Label>
                <Select value={bulan} onValueChange={handleChangeJenisPembayaran}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {getBulanSppUntukTingkat(
                      selectedSiswa ? getTingkatSiswa(selectedSiswa) : tingkat
                    ).map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5 text-sm">
                <p className="font-medium">Pembayaran PPDB</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                  <span>
                    Target:{" "}
                    <span className="text-foreground font-medium">
                      {formatRupiah(
                        selectedSiswa ? getTargetPpdb(selectedSiswa) : 0
                      )}
                    </span>
                  </span>
                  <span className="text-border">|</span>
                  <span>
                    Sudah bayar:{" "}
                    <span className="text-foreground font-medium">
                      {formatRupiah(
                        selectedSiswa ? getTotalBayarPpdb(selectedSiswa) : 0
                      )}
                    </span>
                  </span>
                  <span className="text-border">|</span>
                  <span>
                    Tunggakan:{" "}
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {formatRupiah(
                        selectedSiswa ? getTunggakanPpdb(selectedSiswa) : 0
                      )}
                    </span>
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Select
                  value={bayar}
                  onValueChange={(value: any) => setBayar(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csh">Cash</SelectItem>
                    <SelectItem value="trf">Transfer</SelectItem>
                    {paymentMode === "spp" && (
                      <SelectItem value="sbs">Subsidi / Dibebaskan</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bukti Pembayaran</Label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={buktiMode === "file" ? "default" : "outline"}
                  onClick={() => {
                    setBuktiMode("file")
                    setBukti(null)
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={buktiMode === "kamera" ? "default" : "outline"}
                  onClick={() => {
                    setBuktiMode("kamera")
                    setBukti(null)
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ambil dari Kamera
                </Button>
              </div>

              {buktiMode === "file" && !bukti && (
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setBukti(e.target.files?.[0] || null)}
                />
              )}

              {buktiMode === "kamera" && !bukti && (
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
                    onClick={ambilFoto}
                    disabled={!kameraAktif}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Ambil Foto
                  </Button>
                </div>
              )}

              {bukti && buktiPreviewUrl && (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-2.5">
                  <img
                    src={buktiPreviewUrl}
                    alt="Preview bukti"
                    className="h-20 w-20 rounded-lg object-cover"
                  />

                  <div className="flex-1 text-sm text-muted-foreground truncate">
                    {bukti.name}
                  </div>

                  {buktiMode === "kamera" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={ambilUlangFoto}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Ambil Ulang
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => setBukti(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>

            <Button onClick={simpanPembayaran} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}