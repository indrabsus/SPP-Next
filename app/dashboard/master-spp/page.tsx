"use client"

import { useEffect, useState } from "react"
import { Edit, Loader2, Save, Search, Trash2 } from "lucide-react"

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

const tahunSekarang = new Date().getFullYear()

const formatRupiah = (value: number | string) => {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

const initialForm = {
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
  const [modeEdit, setModeEdit] = useState(false)

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

  const resetForm = () => {
    setForm(initialForm)
    setModeEdit(false)
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
        isiForm(res.data)
        setModeEdit(false)
      } else {
        setData(null)
        resetForm()
      }
    } catch (error: any) {
      setData(null)
      resetForm()
      alert(error.message || "Data master SPP tidak ditemukan")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getMaster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (key: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const validasiForm = () => {
    if (!tahun) {
      alert("Tahun wajib diisi")
      return false
    }

    const wajib = [
      "spp10",
      "spp11",
      "spp12",
      "daftar_ulang_11",
      "daftar_ulang_12",
      "pkl",
      "ujian_akhir",
    ] as const

    for (const key of wajib) {
      if (form[key] === "" || Number(form[key]) < 0) {
        alert(`Field ${key} wajib diisi dengan nominal valid`)
        return false
      }
    }

    return true
  }

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

  const simpanMaster = async () => {
    if (!validasiForm()) return

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

      await getMaster()
      setModeEdit(false)
    } catch (error: any) {
      alert(error.message || "Gagal menyimpan master SPP")
    } finally {
      setSaving(false)
    }
  }

  const hapusMaster = async () => {
    if (!data?.id_spp) return

    const yakin = window.confirm(
      `Yakin ingin menghapus master SPP tahun ${data.tahun}?`
    )

    if (!yakin) return

    setSaving(true)

    try {
      await apiFetch(`/spp/deletemaster/${data.id_spp}`, {
        method: "DELETE",
      })

      alert("Master SPP berhasil dihapus")

      setData(null)
      resetForm()
    } catch (error: any) {
      alert(error.message || "Gagal menghapus master SPP")
    } finally {
      setSaving(false)
    }
  }

  const disabledForm = Boolean(data) && !modeEdit

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

      <Card className="dashboard-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {data
              ? `Data Master Tahun ${data.tahun}`
              : `Buat Master Tahun ${tahun || "-"}`}
          </CardTitle>

          <div className="flex gap-2">
            {data && !modeEdit && (
              <Button variant="outline" onClick={() => setModeEdit(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}

            {data && (
              <Button
                variant="destructive"
                onClick={hapusMaster}
                disabled={saving}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {data && !modeEdit && (
            <div className="rounded-xl bg-muted p-4 text-sm">
              Master SPP tahun <b>{data.tahun}</b> sudah tersedia. Klik tombol{" "}
              <b>Edit</b> untuk mengubah nominal.
            </div>
          )}

          {!data && (
            <div className="rounded-xl bg-muted p-4 text-sm">
              Master SPP untuk tahun <b>{tahun || "-"}</b> belum ada. Isi form
              di bawah untuk membuat master baru.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>SPP Kelas 10</Label>
              <Input
                type="number"
                disabled={disabledForm}
                value={form.spp10}
                onChange={(e) => handleChange("spp10", e.target.value)}
                placeholder="Contoh: 170000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatRupiah(form.spp10)}
              </p>
            </div>

            <div>
              <Label>SPP Kelas 11</Label>
              <Input
                type="number"
                disabled={disabledForm}
                value={form.spp11}
                onChange={(e) => handleChange("spp11", e.target.value)}
                placeholder="Contoh: 210000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatRupiah(form.spp11)}
              </p>
            </div>

            <div>
              <Label>SPP Kelas 12</Label>
              <Input
                type="number"
                disabled={disabledForm}
                value={form.spp12}
                onChange={(e) => handleChange("spp12", e.target.value)}
                placeholder="Contoh: 250000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatRupiah(form.spp12)}
              </p>
            </div>

            <div>
              <Label>Daftar Ulang Kelas 11</Label>
              <Input
                type="number"
                disabled={disabledForm}
                value={form.daftar_ulang_11}
                onChange={(e) =>
                  handleChange("daftar_ulang_11", e.target.value)
                }
                placeholder="Contoh: 310000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatRupiah(form.daftar_ulang_11)}
              </p>
            </div>

            <div>
              <Label>Daftar Ulang Kelas 12</Label>
              <Input
                type="number"
                disabled={disabledForm}
                value={form.daftar_ulang_12}
                onChange={(e) =>
                  handleChange("daftar_ulang_12", e.target.value)
                }
                placeholder="Contoh: 300000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatRupiah(form.daftar_ulang_12)}
              </p>
            </div>

            <div>
              <Label>PKL</Label>
              <Input
                type="number"
                disabled={disabledForm}
                value={form.pkl}
                onChange={(e) => handleChange("pkl", e.target.value)}
                placeholder="Contoh: 500000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatRupiah(form.pkl)}
              </p>
            </div>

            <div>
              <Label>Ujian Akhir</Label>
              <Input
                type="number"
                disabled={disabledForm}
                value={form.ujian_akhir}
                onChange={(e) =>
                  handleChange("ujian_akhir", e.target.value)
                }
                placeholder="Contoh: 700000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatRupiah(form.ujian_akhir)}
              </p>
            </div>
          </div>

          {(!data || modeEdit) && (
            <div className="flex gap-2">
              <Button onClick={simpanMaster} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {data ? "Update Master" : "Simpan Master"}
              </Button>

              {data && modeEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    isiForm(data)
                    setModeEdit(false)
                  }}
                >
                  Batal
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}