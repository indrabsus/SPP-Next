"use client"

import { useEffect, useState } from "react"
import {
  Briefcase,
  Edit,
  FileCheck2,
  GraduationCap,
  Inbox,
  Loader2,
  Repeat2,
  Save,
  Search,
  Trash2,
} from "lucide-react"

import { apiFetch } from "@/lib/api"

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  created_at?: string
  updated_at?: string
}

type FormKey =
  | "spp10"
  | "spp11"
  | "spp12"
  | "daftar_ulang_11"
  | "daftar_ulang_12"
  | "pkl"
  | "ujian_akhir"

const fieldConfig: { key: FormKey; label: string; icon: typeof GraduationCap }[] = [
  { key: "spp10", label: "SPP Kelas 10", icon: GraduationCap },
  { key: "spp11", label: "SPP Kelas 11", icon: GraduationCap },
  { key: "spp12", label: "SPP Kelas 12", icon: GraduationCap },
  { key: "daftar_ulang_11", label: "Daftar Ulang Kelas 11", icon: Repeat2 },
  { key: "daftar_ulang_12", label: "Daftar Ulang Kelas 12", icon: Repeat2 },
  { key: "pkl", label: "PKL", icon: Briefcase },
  { key: "ujian_akhir", label: "Ujian Akhir", icon: FileCheck2 },
]

const tahunSekarang = new Date().getFullYear()

const formatRupiah = (value: number | string) => {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

const initialForm: Record<FormKey, string> = {
  spp10: "",
  spp11: "",
  spp12: "",
  daftar_ulang_11: "",
  daftar_ulang_12: "",
  pkl: "",
  ujian_akhir: "",
}

export default function MasterSppPage() {
  const [tahun, setTahun] = useState(String(tahunSekarang))
  const [data, setData] = useState<MasterSpp | null>(null)
  const [form, setForm] = useState(initialForm)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sudahCari, setSudahCari] = useState(false)

  const [openForm, setOpenForm] = useState(false)
  const [openHapus, setOpenHapus] = useState(false)

  const isiForm = (item: MasterSpp) => {
    setForm({
      spp10: String(item.spp10 || ""),
      spp11: String(item.spp11 || ""),
      spp12: String(item.spp12 || ""),
      daftar_ulang_11: String(item.daftar_ulang_11 || ""),
      daftar_ulang_12: String(item.daftar_ulang_12 || ""),
      pkl: String(item.pkl || ""),
      ujian_akhir: String(item.ujian_akhir || ""),
    })
  }

  const getMaster = async () => {
    if (!tahun) {
      alert("Tahun wajib diisi")
      return
    }

    setLoading(true)

    try {
      const res = await apiFetch(`/spp/master/${tahun}`)

      if (res.data) {
        setData(res.data)
      } else {
        setData(null)
      }
    } catch (error: any) {
      setData(null)
    } finally {
      setSudahCari(true)
      setLoading(false)
    }
  }

  useEffect(() => {
    getMaster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (key: FormKey, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const validasiForm = () => {
    for (const { key, label } of fieldConfig) {
      if (form[key] === "" || Number(form[key]) < 0) {
        alert(`${label} wajib diisi dengan nominal valid`)
        return false
      }
    }

    return true
  }

  const bukaTambah = () => {
    setForm(initialForm)
    setOpenForm(true)
  }

  const bukaEdit = () => {
    if (data) isiForm(data)
    setOpenForm(true)
  }

  const simpanMaster = async () => {
    if (!validasiForm()) return

    const payload = {
      tahun: Number(tahun),
      spp10: Number(form.spp10 || 0),
      spp11: Number(form.spp11 || 0),
      spp12: Number(form.spp12 || 0),
      daftar_ulang_11: Number(form.daftar_ulang_11 || 0),
      daftar_ulang_12: Number(form.daftar_ulang_12 || 0),
      pkl: Number(form.pkl || 0),
      ujian_akhir: Number(form.ujian_akhir || 0),
    }

    setSaving(true)

    try {
      if (data?.id_spp) {
        await apiFetch(`/spp/updatemaster/${data.id_spp}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })

        alert("Master SPP berhasil diperbarui")
      } else {
        await apiFetch("/spp/createmaster", {
          method: "POST",
          body: JSON.stringify(payload),
        })

        alert("Master SPP berhasil dibuat")
      }

      setOpenForm(false)
      await getMaster()
    } catch (error: any) {
      alert(error.message || "Gagal menyimpan master SPP")
    } finally {
      setSaving(false)
    }
  }

  const hapusMaster = async () => {
    if (!data?.id_spp) return

    setSaving(true)

    try {
      await apiFetch(`/spp/deletemaster/${data.id_spp}`, {
        method: "DELETE",
      })

      alert("Master SPP berhasil dihapus")
      setOpenHapus(false)
      setData(null)
    } catch (error: any) {
      alert(error.message || "Gagal menghapus master SPP")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Master SPP</h1>
        <p className="text-muted-foreground">
          Kelola nominal SPP, daftar ulang, PKL, dan ujian akhir berdasarkan tahun.
        </p>
      </div>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Pilih Tahun</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="w-full md:w-64">
              <Label>Tahun</Label>
              <Input
                type="number"
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                placeholder="Contoh: 2026"
                onKeyDown={(e) => {
                  if (e.key === "Enter") getMaster()
                }}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={getMaster} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Cari Master
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="dashboard-card">
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Memuat data...
          </CardContent>
        </Card>
      ) : data ? (
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Master SPP Tahun {data.tahun}</CardTitle>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={bukaEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setOpenHapus(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fieldConfig.map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3"
                >
                  <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {label}
                    </p>
                    <p className="font-semibold truncate">
                      {formatRupiah(data[key])}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        sudahCari && (
          <Card className="dashboard-card">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="rounded-full bg-muted p-3 text-muted-foreground">
                <Inbox className="w-6 h-6" />
              </div>

              <div>
                <p className="font-medium">
                  Master SPP tahun {tahun || "-"} belum ada
                </p>
                <p className="text-sm text-muted-foreground">
                  Buat master baru untuk mengatur nominal tahun ini.
                </p>
              </div>

              <Button onClick={bukaTambah}>Tambah Master Tahun {tahun}</Button>
            </CardContent>
          </Card>
        )
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {data ? `Edit Master SPP Tahun ${data.tahun}` : `Tambah Master SPP Tahun ${tahun}`}
            </DialogTitle>
            <DialogDescription>
              Isi nominal untuk setiap kategori pembayaran di bawah ini.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fieldConfig.map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  type="number"
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatRupiah(form[key])}
                </p>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>
              Batal
            </Button>

            <Button onClick={simpanMaster} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {data ? "Update Master" : "Simpan Master"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openHapus} onOpenChange={setOpenHapus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Master SPP</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus master SPP tahun {data?.tahun}? Tindakan
              ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenHapus(false)}>
              Batal
            </Button>

            <Button
              variant="destructive"
              onClick={hapusMaster}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
