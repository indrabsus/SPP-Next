"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import * as XLSX from "xlsx"
import {
  ArrowUpDown,
  Eye,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCcw,
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
    jenkel: "l" | "p"
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkRemoving, setBulkRemoving] = useState(false)

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

  const sortedSiswaSelected = useMemo(() => {
    if (!selectedKelas) return []

    return [...selectedKelas.siswa].sort((a, b) =>
      (a.siswa_ppdb?.nama_lengkap || "").localeCompare(
        b.siswa_ppdb?.nama_lengkap || ""
      )
    )
  }, [selectedKelas])

  const jumlahLaki = sortedSiswaSelected.filter(
    (item) => item.siswa_ppdb?.jenkel === "l"
  ).length

  const jumlahPerempuan = sortedSiswaSelected.filter(
    (item) => item.siswa_ppdb?.jenkel === "p"
  ).length

  const bukaDetailKelas = (group: KelasGroup) => {
    setSelectedKelas(group)
    setSelectedIds(new Set())
    setDialogOpen(true)
  }

  const semuaTerpilih =
    sortedSiswaSelected.length > 0 &&
    selectedIds.size === sortedSiswaSelected.length

  const toggleSelectSatu = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectSemua = () => {
    if (semuaTerpilih) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedSiswaSelected.map((item) => item.id_riwayat)))
    }
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
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id_riwayat)
        return next
      })
    } catch (error: any) {
      alert(error.message || "Gagal mengeluarkan siswa dari kelas")
    } finally {
      setRemovingId("")
    }
  }

  const hapusTerpilih = async () => {
    const idList = Array.from(selectedIds)
    if (idList.length === 0) return

    if (
      !confirm(
        `Keluarkan ${idList.length} siswa terpilih dari kelas ini? Aksi ini tidak bisa dibatalkan.`
      )
    ) {
      return
    }

    setBulkRemoving(true)

    let berhasil = 0
    let gagal = 0

    for (const id of idList) {
      try {
        await apiFetch(`/riwayat-kelas/${id}`, { method: "DELETE" })
        berhasil += 1
      } catch {
        gagal += 1
      }
    }

    setRiwayat((prev) => prev.filter((r) => !idList.includes(r.id_riwayat)))
    setSelectedKelas((prev) =>
      prev
        ? {
            ...prev,
            siswa: prev.siswa.filter((s) => !idList.includes(s.id_riwayat)),
          }
        : prev
    )
    setSelectedIds(new Set())
    setBulkRemoving(false)

    alert(
      gagal > 0
        ? `${berhasil} siswa berhasil dikeluarkan, ${gagal} gagal.`
        : `${berhasil} siswa berhasil dikeluarkan dari kelas.`
    )
  }

  const printPdfKelas = () => {
    window.print()
  }

  const exportExcelKelas = () => {
    if (!selectedKelas || sortedSiswaSelected.length === 0) {
      alert("Tidak ada siswa untuk diexport")
      return
    }

    const rows = sortedSiswaSelected.map((item, index) => ({
      No: index + 1,
      "Nama Siswa": item.siswa_ppdb?.nama_lengkap || "-",
      "Jenis Kelamin": item.siswa_ppdb?.jenkel === "l" ? "L" : "P",
      NISN: item.siswa_ppdb?.nisn || "-",
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 14 }]

    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        [],
        ["Laki-laki", jumlahLaki],
        ["Perempuan", jumlahPerempuan],
        ["Total", sortedSiswaSelected.length],
      ],
      { origin: -1 }
    )

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Siswa")

    XLSX.writeFile(
      workbook,
      `siswa-${selectedKelas.tingkat}-${selectedKelas.nama_kelas}-${tahunAjaran.replace(/\//g, "-")}.xlsx`
    )
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
      <style jsx global>{`
        @media print {
          /* #print-area-kelas di-portal langsung jadi anak document.body.
             Semua anak body LAINNYA di-display:none (bukan visibility:hidden)
             supaya benar-benar hilang dari layout - kalau cuma disembunyikan
             lewat visibility, tinggi kosongnya tetap dihitung dan bikin
             browser nambah halaman ke-2 yang kosong. Dengan display:none,
             #print-area-kelas jadi satu-satunya konten di halaman cetak. */
          body > *:not(#print-area-kelas) {
            display: none !important;
          }

          #print-area-kelas {
            width: 100%;
            background: white !important;
            padding: 8px;
            color: #000 !important;
          }

          /* Paksa teks hitam biar tetap kebaca walau lagi dark mode. */
          #print-area-kelas * {
            color: #000 !important;
            background-color: transparent !important;
          }

          table {
            font-size: 10px;
            width: 100%;
          }

          th,
          td {
            padding: 2px 4px !important;
            line-height: 1.2 !important;
          }

          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

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

          <div className="flex gap-2 mt-3 mb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={printPdfKelas}
              disabled={sortedSiswaSelected.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportExcelKelas}
              disabled={sortedSiswaSelected.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>

          {sortedSiswaSelected.length > 0 && (
            <div className="flex items-center justify-between gap-2 mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <Checkbox
                  checked={semuaTerpilih}
                  onCheckedChange={toggleSelectSemua}
                />
                Pilih Semua ({selectedIds.size}/{sortedSiswaSelected.length})
              </label>

              <Button
                variant="destructive"
                size="sm"
                onClick={hapusTerpilih}
                disabled={selectedIds.size === 0 || bulkRemoving}
              >
                {bulkRemoving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Hapus Terpilih ({selectedIds.size})
              </Button>
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto space-y-2 mt-3">
            {sortedSiswaSelected.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada siswa di kelas ini.
              </p>
            ) : (
              sortedSiswaSelected.map((item, index) => (
                <div
                  key={item.id_riwayat}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(item.id_riwayat)}
                      onCheckedChange={() => toggleSelectSatu(item.id_riwayat)}
                      className="shrink-0"
                    />
                    <span className="text-xs text-muted-foreground w-5 shrink-0">
                      {index + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {item.siswa_ppdb?.nama_lengkap || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        NISN: {item.siswa_ppdb?.nisn || "-"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => removeSiswaDariKelas(item)}
                    disabled={removingId === item.id_riwayat || bulkRemoving}
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

      {/* Versi cetak: di-portal ke document.body (bukan anak Dialog) supaya
          position:fixed-nya tidak kena imbas animasi buka/tutup Radix
          Dialog. Cuma dirender pas dialog lagi kebuka. */}
      {dialogOpen &&
        selectedKelas &&
        typeof document !== "undefined" &&
        createPortal(
          <div id="print-area-kelas">
            <div className="flex items-center gap-3 border-b-2 border-black pb-1 mb-2">
              <img
                src="/logo.png"
                alt="Logo Sekolah"
                className="h-12 w-12 object-contain"
              />
              <div className="flex-1 text-center">
                <p className="font-bold text-base">SMK SANGKURIANG 1 CIMAHI</p>
                <p className="text-xs">
                  Data Siswa Kelas {selectedKelas.tingkat}{" "}
                  {selectedKelas.nama_kelas}
                </p>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">
                    No
                  </th>
                  <th className="border border-black px-2 py-1 text-left">
                    Nama Siswa
                  </th>
                  <th className="border border-black px-2 py-1 text-left">
                    Jenis Kelamin
                  </th>
                  <th className="border border-black px-2 py-1 text-left">
                    NISN
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSiswaSelected.map((item, index) => (
                  <tr key={item.id_riwayat}>
                    <td className="border border-black px-2 py-1">
                      {index + 1}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {item.siswa_ppdb?.nama_lengkap || "-"}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {item.siswa_ppdb?.jenkel === "l"
                        ? "Laki-laki"
                        : "Perempuan"}
                    </td>
                    <td className="border border-black px-2 py-1">
                      {item.siswa_ppdb?.nisn || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-1 text-xs space-y-0">
              <p>Laki-laki: {jumlahLaki} siswa</p>
              <p>Perempuan: {jumlahPerempuan} siswa</p>
              <p className="font-semibold">
                Total: {sortedSiswaSelected.length} siswa
              </p>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
