"use client"

import { useMemo, useState, useEffect } from "react"
import {
  ArrowUpCircle,
  GraduationCap,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import { getUser, isAdminKeuangan, UserLogin } from "@/lib/auth"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

type Siswa = {
  id_siswa: string
  nama_lengkap: string
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

type RiwayatKelas = {
  id_riwayat: string
  id_siswa: string
  tahun_ajaran: string
  tingkat: string
  nama_kelas: string
  siswa_ppdb?: {
    nama_lengkap: string
    nisn: string
  }
}

const tingkatOptions = ["10", "11", "12"]

const TAHUN_AJARAN_REGEX = /^(\d{4})\/(\d{4})$/

const validasiTahunAjaran = (value: string) => {
  const match = value.trim().match(TAHUN_AJARAN_REGEX)

  if (!match) {
    return "Format tahun ajaran harus YYYY/YYYY, contoh: 2026/2027"
  }

  const awal = Number(match[1])
  const akhir = Number(match[2])

  if (akhir !== awal + 1) {
    return "Tahun kedua harus tepat satu tahun setelah tahun pertama, contoh: 2026/2027"
  }

  return null
}

// Tahun ajaran asal (sumber roster yang di-load) selalu satu tahun sebelum
// tahun ajaran tujuan yang diketik admin - bukan "tahun ajaran teraktif" di
// sistem, supaya tidak ikut geser begitu ada siswa lain yang sudah lebih
// dulu diproses ke tahun ajaran baru.
const getTahunAjaranAsal = (tahunTujuan: string) => {
  const match = tahunTujuan.trim().match(TAHUN_AJARAN_REGEX)
  if (!match) return null

  const awal = Number(match[1])
  const akhir = Number(match[2])

  return `${awal - 1}/${akhir - 1}`
}

export default function KenaikanKelasPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [tahunAjaran, setTahunAjaran] = useState("")
  const [tingkatAsal, setTingkatAsal] = useState("10")
  const [tingkatTujuan, setTingkatTujuan] = useState("11")

  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [kelasTujuan, setKelasTujuan] = useState<Kelas[]>([])
  const [keyword, setKeyword] = useState("")
  const [kelasAsalFilter, setKelasAsalFilter] = useState("semua")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [loadingSiswa, setLoadingSiswa] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [kelasTerpilih, setKelasTerpilih] = useState("")

  const [riwayat, setRiwayat] = useState<RiwayatKelas[]>([])
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)
  const [deletingId, setDeletingId] = useState("")

  useEffect(() => {
    setUser(getUser())
  }, [])

  const loadKelasTujuan = async (tingkatValue: string) => {
    try {
      const res = await apiFetch(`/kelas/data/${tingkatValue}`)
      setKelasTujuan(res.data || [])
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data kelas tujuan")
    }
  }

  useEffect(() => {
    if (user) loadKelasTujuan(tingkatTujuan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkatTujuan, user])

  const loadSiswa = async () => {
    if (!tingkatAsal) return

    const errorTahunAjaran = validasiTahunAjaran(tahunAjaran)

    if (errorTahunAjaran) {
      alert(errorTahunAjaran)
      return
    }

    const tahunAjaranAsal = getTahunAjaranAsal(tahunAjaran)

    setLoadingSiswa(true)
    setSelectedIds(new Set())
    setKeyword("")
    setKelasAsalFilter("semua")

    try {
      const params = new URLSearchParams()
      params.set("tingkat", tingkatAsal)
      params.set("tahun_ajaran", tahunAjaranAsal || "")

      const res = await apiFetch(`/spp/siswa?${params.toString()}`)
      const semuaSiswa: Siswa[] = res.data || []

      // Buang siswa yang sudah lebih dulu punya data di tahun ajaran tujuan,
      // supaya setelah refresh, yang tampil cuma sisa yang belum diproses.
      const sudahDiproses = await apiFetch(
        `/riwayat-kelas/tahun?tahun_ajaran=${encodeURIComponent(tahunAjaran.trim())}`
      )
        .then((res) => new Set((res.data || []).map((item: any) => item.id_siswa)))
        .catch(() => new Set())

      setSiswaList(semuaSiswa.filter((siswa) => !sudahDiproses.has(siswa.id_siswa)))
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data siswa")
    } finally {
      setLoadingSiswa(false)
    }
  }

  const kelasAsalOptions = useMemo(() => {
    const set = new Set(
      siswaList
        .map((siswa) => siswa.kelas_terkini?.nama_kelas)
        .filter((nama): nama is string => Boolean(nama))
    )

    return Array.from(set).sort()
  }, [siswaList])

  const filteredSiswa = useMemo(() => {
    const q = keyword.trim().toLowerCase()

    return siswaList.filter((siswa) => {
      const cocokNama = !q || siswa.nama_lengkap.toLowerCase().includes(q)

      const cocokKelas =
        kelasAsalFilter === "semua" ||
        siswa.kelas_terkini?.nama_kelas === kelasAsalFilter

      return cocokNama && cocokKelas
    })
  }, [siswaList, keyword, kelasAsalFilter])

  const allFilteredSelected =
    filteredSiswa.length > 0 &&
    filteredSiswa.every((siswa) => selectedIds.has(siswa.id_siswa))

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)

      if (allFilteredSelected) {
        filteredSiswa.forEach((siswa) => next.delete(siswa.id_siswa))
      } else {
        filteredSiswa.forEach((siswa) => next.add(siswa.id_siswa))
      }

      return next
    })
  }

  const toggleSelect = (idSiswa: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)

      if (next.has(idSiswa)) {
        next.delete(idSiswa)
      } else {
        next.add(idSiswa)
      }

      return next
    })
  }

  const loadRiwayat = async () => {
    const errorTahunAjaran = validasiTahunAjaran(tahunAjaran)

    if (errorTahunAjaran) {
      alert(errorTahunAjaran)
      return
    }

    setLoadingRiwayat(true)

    try {
      const res = await apiFetch(
        `/riwayat-kelas/tahun?tahun_ajaran=${encodeURIComponent(tahunAjaran.trim())}`
      )
      setRiwayat(res.data || [])
    } catch (error: any) {
      alert(error.message || "Gagal mengambil riwayat kelas")
    } finally {
      setLoadingRiwayat(false)
    }
  }

  const hapusRiwayat = async (item: RiwayatKelas) => {
    const nama = item.siswa_ppdb?.nama_lengkap || "siswa ini"

    if (
      !confirm(
        `Hapus data kelas "${item.nama_kelas}" tahun ajaran ${item.tahun_ajaran} untuk ${nama}? Aksi ini tidak bisa dibatalkan.`
      )
    ) {
      return
    }

    setDeletingId(item.id_riwayat)

    try {
      const res = await apiFetch(`/riwayat-kelas/${item.id_riwayat}`, {
        method: "DELETE",
      })

      alert(res.message || "Riwayat kelas berhasil dihapus.")
      setRiwayat((prev) => prev.filter((r) => r.id_riwayat !== item.id_riwayat))
    } catch (error: any) {
      alert(error.message || "Gagal menghapus riwayat kelas")
    } finally {
      setDeletingId("")
    }
  }

  const openAssignDialog = () => {
    const errorTahunAjaran = validasiTahunAjaran(tahunAjaran)

    if (errorTahunAjaran) {
      alert(errorTahunAjaran)
      return
    }

    if (selectedIds.size === 0) {
      alert("Pilih minimal satu siswa dulu")
      return
    }

    setKelasTerpilih("")
    setDialogOpen(true)
  }

  const prosesKenaikan = async (
    data: { id_siswa: string; tingkat: string; nama_kelas: string }[]
  ) => {
    setSubmitting(true)

    try {
      const res = await apiFetch("/riwayat-kelas/naik-kelas", {
        method: "POST",
        body: JSON.stringify({
          tahun_ajaran: tahunAjaran.trim(),
          data,
        }),
      })

      alert(res.message || `Berhasil memproses ${data.length} siswa`)

      const idSet = new Set(data.map((item) => item.id_siswa))
      setSiswaList((prev) => prev.filter((siswa) => !idSet.has(siswa.id_siswa)))
      setSelectedIds(new Set())
      setDialogOpen(false)
      setKelasTerpilih("")
      loadRiwayat()
    } catch (error: any) {
      alert(error.message || "Gagal memproses kenaikan kelas")
    } finally {
      setSubmitting(false)
    }
  }

  const submitAssign = async () => {
    if (!kelasTerpilih) {
      alert("Pilih kelas tujuan dulu")
      return
    }

    const data = Array.from(selectedIds).map((idSiswa) => ({
      id_siswa: idSiswa,
      tingkat: tingkatTujuan,
      nama_kelas: kelasTerpilih,
    }))

    await prosesKenaikan(data)
  }

  const submitTanpaDiacak = async () => {
    const errorTahunAjaran = validasiTahunAjaran(tahunAjaran)

    if (errorTahunAjaran) {
      alert(errorTahunAjaran)
      return
    }

    const siswaTerpilih = siswaList.filter((siswa) =>
      selectedIds.has(siswa.id_siswa)
    )

    const tanpaKelas = siswaTerpilih.filter(
      (siswa) => !siswa.kelas_terkini?.nama_kelas
    )

    if (tanpaKelas.length > 0) {
      alert(
        `${tanpaKelas.length} siswa tidak punya data kelas saat ini, tidak bisa diproses tanpa diacak.`
      )
      return
    }

    if (
      !confirm(
        `Naikkan ${siswaTerpilih.length} siswa ke tingkat ${tingkatTujuan} dengan kelas yang sama seperti sekarang (tanpa diacak)?`
      )
    ) {
      return
    }

    const data = siswaTerpilih.map((siswa) => ({
      id_siswa: siswa.id_siswa,
      tingkat: tingkatTujuan,
      nama_kelas: siswa.kelas_terkini!.nama_kelas as string,
    }))

    await prosesKenaikan(data)
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
            Menu Kenaikan Kelas hanya untuk admin keuangan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kenaikan Kelas</h1>
        <p className="text-muted-foreground">
          Centang sekelompok siswa yang naik ke kelas yang sama, lalu assign
          sekaligus. Data lama tidak akan berubah — ini menambah riwayat baru,
          terlepas dari kelas akademik yang mungkin diacak ulang oleh sekolah.
        </p>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Pengaturan Kenaikan</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Tahun Ajaran Tujuan</Label>
              <Input
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                placeholder="Contoh: 2026/2027"
              />
            </div>

            <div>
              <Label>Tingkat Asal</Label>
              <Select value={tingkatAsal} onValueChange={setTingkatAsal}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat asal" />
                </SelectTrigger>
                <SelectContent>
                  {tingkatOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      Tingkat {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tingkat Tujuan</Label>
              <Select value={tingkatTujuan} onValueChange={setTingkatTujuan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {tingkatOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      Tingkat {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={loadSiswa} disabled={loadingSiswa}>
            {loadingSiswa ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengambil siswa...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Tampilkan Siswa Tingkat {tingkatAsal}
              </>
            )}
          </Button>

          {getTahunAjaranAsal(tahunAjaran) && (
            <p className="text-xs text-muted-foreground">
              Akan menampilkan siswa dari data tahun ajaran{" "}
              <b>{getTahunAjaranAsal(tahunAjaran)}</b>.
            </p>
          )}
        </CardContent>
      </Card>

      {siswaList.length > 0 && (
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Pilih Siswa ({filteredSiswa.length} dari {siswaList.length})
              </span>

              <div className="flex items-center gap-2">
                <Select value={kelasAsalFilter} onValueChange={setKelasAsalFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Kelas</SelectItem>
                    {kelasAsalOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari nama siswa..."
                  className="w-56"
                />
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} siswa dipilih
              </span>

              <div className="flex gap-2">
                {siswaList.length > 0 &&
                  selectedIds.size === siswaList.length && (
                    <Button
                      variant="outline"
                      onClick={submitTanpaDiacak}
                      disabled={submitting}
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-2" />
                      Naik Kelas Tanpa Diacak ({selectedIds.size})
                    </Button>
                  )}

                <Button
                  onClick={openAssignDialog}
                  disabled={selectedIds.size === 0}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Assign ke Kelas ({selectedIds.size})
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead>Kelas Saat Ini</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSiswa.map((siswa) => (
                  <TableRow key={siswa.id_siswa}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(siswa.id_siswa)}
                        onCheckedChange={() => toggleSelect(siswa.id_siswa)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {siswa.nama_lengkap}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {siswa.kelas_terkini?.tingkat}{" "}
                      {siswa.kelas_terkini?.nama_kelas || "-"}
                      {siswa.kelas_terkini?.tahun_ajaran && (
                        <span className="ml-1 text-xs">
                          ({siswa.kelas_terkini.tahun_ajaran})
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Kelas Baru</DialogTitle>
            <DialogDescription>
              {selectedIds.size} siswa akan dipindahkan ke tingkat{" "}
              {tingkatTujuan}, tahun ajaran {tahunAjaran || "-"}. Pilih kelas
              tujuannya.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label>Kelas Tujuan</Label>
            <Select value={kelasTerpilih} onValueChange={setKelasTerpilih}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kelas" />
              </SelectTrigger>
              <SelectContent>
                {kelasTujuan.map((item) => (
                  <SelectItem key={item.id_kelas} value={item.nama_kelas}>
                    {item.nama_kelas}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button onClick={submitAssign} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cek Data Tahun Ajaran</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRiwayat}
              disabled={loadingRiwayat}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {loadingRiwayat ? "Memuat..." : "Cek"}
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {riwayat.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada data untuk tahun ajaran ini, atau belum dicek.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riwayat.map((item) => (
                  <TableRow key={item.id_riwayat}>
                    <TableCell>
                      {item.siswa_ppdb?.nama_lengkap || "-"}
                    </TableCell>
                    <TableCell>{item.tingkat}</TableCell>
                    <TableCell>{item.nama_kelas}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => hapusRiwayat(item)}
                        disabled={deletingId === item.id_riwayat}
                      >
                        {deletingId === item.id_riwayat ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
