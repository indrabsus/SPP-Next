"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Edit,
  Plus,
  Search,
  Trash2,
  Wallet,
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

type LogLainnya = {
  id_logluar: string
  keterangan: string
  status: "m" | "k"
  via: "trf" | "cash"
  nominal: number
  created_at: string
  updated_at?: string
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

const statusLabel = {
  m: "Uang Masuk",
  k: "Uang Keluar",
}

const viaLabel = {
  cash: "Cash",
  trf: "Transfer",
}

export default function LogLainnyaPage() {
  const [user, setUser] = useState<UserLogin | null>(null)

  const [data, setData] = useState<LogLainnya[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [keyword, setKeyword] = useState("")
  const [filterStatus, setFilterStatus] = useState("semua")
  const [filterVia, setFilterVia] = useState("semua")

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [keterangan, setKeterangan] = useState("")
  const [status, setStatus] = useState<"m" | "k">("m")
  const [via, setVia] = useState<"cash" | "trf">("cash")
  const [nominal, setNominal] = useState("")

  useEffect(() => {
    setUser(getUser())
  }, [])

  const getData = async () => {
    setLoading(true)

    try {
      const res = await apiFetch("/spp/loglainnya")
      setData(res?.data || [])
    } catch (error: any) {
      alert(error.message || "Gagal mengambil data log lainnya")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getData()
  }, [])

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchKeyword = item.keterangan
        .toLowerCase()
        .includes(keyword.toLowerCase())

      const matchStatus =
        filterStatus === "semua" || item.status === filterStatus

      const matchVia = filterVia === "semua" || item.via === filterVia

      return matchKeyword && matchStatus && matchVia
    })
  }, [data, keyword, filterStatus, filterVia])

  const summary = useMemo(() => {
    const masuk = filteredData
      .filter((item) => item.status === "m")
      .reduce((sum, item) => sum + Number(item.nominal || 0), 0)

    const keluar = filteredData
      .filter((item) => item.status === "k")
      .reduce((sum, item) => sum + Number(item.nominal || 0), 0)

    return {
      masuk,
      keluar,
      saldo: masuk - keluar,
    }
  }, [filteredData])

  const resetForm = () => {
    setEditId(null)
    setKeterangan("")
    setStatus("m")
    setVia("cash")
    setNominal("")
  }

  const bukaTambah = () => {
    resetForm()
    setOpen(true)
  }

  const bukaEdit = (item: LogLainnya) => {
    setEditId(item.id_logluar)
    setKeterangan(item.keterangan)
    setStatus(item.status)
    setVia(item.via)
    setNominal(String(item.nominal))
    setOpen(true)
  }

  const simpanData = async () => {
    if (!isAdminKeuangan(user)) {
      alert("Akses ditolak. Hanya admin keuangan.")
      return
    }

    if (!keterangan.trim()) {
      alert("Keterangan wajib diisi")
      return
    }

    if (!nominal || Number(nominal) <= 0) {
      alert("Nominal tidak valid")
      return
    }

    setSaving(true)

    try {
      const payload = {
        keterangan: keterangan.trim(),
        status,
        via,
        nominal: Number(nominal),
      }

      if (editId) {
        await apiFetch(`/spp/updateloglainnya/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch("/spp/createloglainnya", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      alert(editId ? "Data berhasil diupdate" : "Data berhasil ditambahkan")
      setOpen(false)
      resetForm()
      getData()
    } catch (error: any) {
      alert(error.message || "Gagal menyimpan data")
    } finally {
      setSaving(false)
    }
  }

  const hapusData = async (id_logluar: string) => {
    if (!isAdminKeuangan(user)) {
      alert("Akses ditolak. Hanya admin keuangan.")
      return
    }

    if (!confirm("Yakin hapus log ini?")) return

    try {
      await apiFetch(`/spp/deleteloglainnya/${id_logluar}`, {
        method: "DELETE",
      })

      alert("Data berhasil dihapus")
      getData()
    } catch (error: any) {
      alert(error.message || "Gagal menghapus data")
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Log Luar SPP</h1>
          <p className="text-muted-foreground">
            Catat uang masuk dan uang keluar di luar pembayaran SPP siswa.
          </p>
        </div>

        {isAdminKeuangan(user) && (
          <Button onClick={bukaTambah}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Log
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Uang Masuk
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
              <ArrowUpCircle className="w-7 h-7" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatRupiah(summary.masuk)}
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Uang Keluar
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-3 text-red-600">
              <ArrowDownCircle className="w-7 h-7" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatRupiah(summary.keluar)}
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Saldo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-600">
              <Wallet className="w-7 h-7" />
            </div>
            <p
              className={`text-2xl font-bold ${
                summary.saldo >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {formatRupiah(summary.saldo)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Filter Log</CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Pencarian</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari keterangan..."
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="m">Uang Masuk</SelectItem>
                <SelectItem value="k">Uang Keluar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Via</Label>
            <Select value={filterVia} onValueChange={setFilterVia}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih via" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Via</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="trf">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="dashboard-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Data Log Luar SPP</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {filteredData.length} data
          </p>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Via</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Waktu</TableHead>
                {isAdminKeuangan(user) && (
                  <TableHead className="text-right">Aksi</TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdminKeuangan(user) ? 7 : 6}
                    className="text-center py-6"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdminKeuangan(user) ? 7 : 6}
                    className="text-center py-6 text-muted-foreground"
                  >
                    Data belum ada
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item, index) => (
                  <TableRow key={item.id_logluar}>
                    <TableCell>{index + 1}</TableCell>

                    <TableCell className="font-medium">
                      {item.keterangan}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === "m"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {statusLabel[item.status]}
                      </span>
                    </TableCell>

                    <TableCell>{viaLabel[item.via]}</TableCell>

                    <TableCell
                      className={`font-semibold ${
                        item.status === "m" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatRupiah(item.nominal)}
                    </TableCell>

                    <TableCell>{formatTanggal(item.created_at)}</TableCell>

                    {isAdminKeuangan(user) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => bukaEdit(item)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => hapusData(item.id_logluar)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Log" : "Tambah Log"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Keterangan</Label>
              <Input
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Donasi alumni, beli ATK, dll"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value: "m" | "k") => setStatus(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m">Uang Masuk</SelectItem>
                  <SelectItem value="k">Uang Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Via</Label>
              <Select
                value={via}
                onValueChange={(value: "cash" | "trf") => setVia(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih via" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="trf">Transfer</SelectItem>
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
            >
              Batal
            </Button>

            <Button onClick={simpanData} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}