"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpDown,
  Eye,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import { getUser, isAdminKeuangan, UserLogin } from "@/lib/auth"

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
  Dialog,
  DialogContent,
  DialogDescription,
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

type RiwayatKelas = {
  id_riwayat: string
  id_siswa: string
  tahun_ajaran: string
  tingkat: string
  nama_kelas: string
  siswa_ppdb?: {
    nama_lengkap: string
    nisn: string
    status: string
  }
}

type KelasGroup = {
  tingkat: string
  nama_kelas: string
  siswa: RiwayatKelas[]
}

type SortKey = "tingkat" | "nama_kelas" | "jumlah"

export default function KelasPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [tahunAjaran, setTahunAjaran] = useState("")
  const [daftarTahunAjaran, setDaftarTahunAjaran] = useState<string[]>([])
  const [keyword, setKeyword] = useState("")

  const [riwayat, setRiwayat] = useState<RiwayatKelas[]>([])
  const [loading, setLoading] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedKelas, setSelectedKelas] = useState<KelasGroup | null>(null)
  const [removingId, setRemovingId] = useState("")

  const [sortKey, setSortKey] = useState<SortKey>("tingkat")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  useEffect(() => {
    setUser(getUser())
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

  const loadRiwayat = async () => {
    if (!tahunAjaran) return

    setLoading(true)

    try {
      const res = await apiFetch(
        `/riwayat-kelas/tahun?tahun_ajaran=${encodeURIComponent(tahunAjaran)}`
      )
      setRiwayat(res.data || [])
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data kelas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tahunAjaran) loadRiwayat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaran])

  const kelasGroups = useMemo(() => {
    const map = new Map<string, KelasGroup>()

    riwayat.forEach((item) => {
      const key = `${item.tingkat}-${item.nama_kelas}`
      const existing = map.get(key)

      if (existing) {
        existing.siswa.push(item)
      } else {
        map.set(key, {
          tingkat: item.tingkat,
          nama_kelas: item.nama_kelas,
          siswa: [item],
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      if (a.tingkat !== b.tingkat) return a.tingkat.localeCompare(b.tingkat)
      return a.nama_kelas.localeCompare(b.nama_kelas)
    })
  }, [riwayat])

  const filteredGroups = useMemo(() => {
    if (!keyword.trim()) return kelasGroups

    const q = keyword.trim().toLowerCase()
    return kelasGroups.filter((group) =>
      group.nama_kelas.toLowerCase().includes(q)
    )
  }, [kelasGroups, keyword])

  const sortedGroups = useMemo(() => {
    const result = [...filteredGroups]

    result.sort((a, b) => {
      if (sortKey === "jumlah") {
        const diff = a.siswa.length - b.siswa.length
        return sortDirection === "asc" ? diff : -diff
      }

      const valueA = sortKey === "tingkat" ? a.tingkat : a.nama_kelas
      const valueB = sortKey === "tingkat" ? b.tingkat : b.nama_kelas

      const compare = valueA.localeCompare(valueB, undefined, {
        numeric: true,
      })

      return sortDirection === "asc" ? compare : -compare
    })

    return result
  }, [filteredGroups, sortKey, sortDirection])

  const bukaDetailKelas = (group: KelasGroup) => {
    setSelectedKelas(group)
    setDialogOpen(true)
  }

  const removeSiswaDariKelas = async (item: RiwayatKelas) => {
    const nama = item.siswa_ppdb?.nama_lengkap || "siswa ini"

    if (
      !confirm(
        `Keluarkan ${nama} dari kelas "${item.nama_kelas}" tahun ajaran ${item.tahun_ajaran}? Aksi ini tidak bisa dibatalkan.`
      )
    ) {
      return
    }

    setRemovingId(item.id_riwayat)

    try {
      const res = await apiFetch(`/riwayat-kelas/${item.id_riwayat}`, {
        method: "DELETE",
      })

      alert(res.message || "Siswa berhasil dikeluarkan dari kelas.")

      setRiwayat((prev) => prev.filter((r) => r.id_riwayat !== item.id_riwayat))
      setSelectedKelas((prev) =>
        prev
          ? {
              ...prev,
              siswa: prev.siswa.filter((s) => s.id_riwayat !== item.id_riwayat),
            }
          : prev
      )
    } catch (error: any) {
      alert(error.message || "Gagal mengeluarkan siswa dari kelas")
    } finally {
      setRemovingId("")
    }
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
            Menu Kelas hanya untuk admin keuangan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kelas</h1>
        <p className="text-muted-foreground">
          Daftar kelas berdasarkan riwayat_kelas per tahun ajaran. Lihat isi
          kelas dan keluarkan siswa yang salah masuk kelas.
        </p>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="md:col-span-2">
              <Label>Cari Nama Kelas</Label>
              <div className="flex gap-2">
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Contoh: PPLG 1"
                />
                <Button variant="outline" onClick={loadRiwayat}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Daftar Kelas ({filteredGroups.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Mengambil data kelas...
            </div>
          ) : filteredGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada data kelas untuk tahun ajaran ini.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                      onClick={() => handleSort("nama_kelas")}
                      className="flex items-center gap-2"
                    >
                      Nama Kelas
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("jumlah")}
                      className="flex items-center gap-2"
                    >
                      Jumlah Siswa
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGroups.map((group) => (
                  <TableRow key={`${group.tingkat}-${group.nama_kelas}`}>
                    <TableCell>{group.tingkat}</TableCell>
                    <TableCell className="font-medium">
                      {group.nama_kelas}
                    </TableCell>
                    <TableCell>{group.siswa.length} siswa</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => bukaDetailKelas(group)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedKelas?.tingkat} {selectedKelas?.nama_kelas}
            </DialogTitle>
            <DialogDescription>
              Tahun ajaran {tahunAjaran} - {selectedKelas?.siswa.length || 0}{" "}
              siswa
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {selectedKelas?.siswa.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada siswa di kelas ini.
              </p>
            ) : (
              selectedKelas?.siswa.map((item) => (
                <div
                  key={item.id_riwayat}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {item.siswa_ppdb?.nama_lengkap || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      NISN: {item.siswa_ppdb?.nisn || "-"}
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => removeSiswaDariKelas(item)}
                    disabled={removingId === item.id_riwayat}
                  >
                    {removingId === item.id_riwayat ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
