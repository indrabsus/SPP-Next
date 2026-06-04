"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  CreditCard,
  Users,
  FileText,
  Wallet,
  LogOut,
} from "lucide-react"

import { getAllowedTingkat, getUser, logout, UserLogin } from "@/lib/auth"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const menus = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Pembayaran SPP",
    href: "/dashboard/pembayaran",
    icon: CreditCard,
  },
  {
    title: "Data Siswa",
    href: "/dashboard/siswa",
    icon: Users,
  },
  {
    title: "Tunggakan",
    href: "/dashboard/tunggakan",
    icon: Wallet,
  },
  {
    title: "Laporan",
    href: "/dashboard/laporan",
    icon: FileText,
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<UserLogin | null>(null)

  useEffect(() => {
    const currentUser = getUser()

    if (!currentUser) {
      router.push("/login")
      return
    }

    setUser(currentUser)
  }, [router])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  if (!user) return null

  const allowedTingkat = getAllowedTingkat(user.role)

  return (
    <main className="min-h-screen bg-muted flex">
      <aside className="w-64 bg-background border-r hidden md:flex flex-col">
        <div className="p-5">
          <h1 className="text-xl font-bold">SPP Sekolah</h1>
          <p className="text-sm text-muted-foreground">
            Panel Keuangan
          </p>
        </div>

        <Separator />

        <nav className="flex-1 p-4 space-y-2">
          {menus.map((menu) => {
            const Icon = menu.icon
            const active = pathname === menu.href

            return (
              <button
                key={menu.href}
                onClick={() => router.push(menu.href)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {menu.title}
              </button>
            )
          })}
        </nav>

        <Separator />

        <div className="p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">{user.username}</p>
            <div className="flex gap-2 mt-1">
              <Badge>{user.role}</Badge>
              <Badge variant="outline">
                Kelas {allowedTingkat.join(", ")}
              </Badge>
            </div>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <section className="flex-1">
        <header className="h-16 bg-background border-b flex items-center justify-between px-6">
          <div>
            <h2 className="font-semibold">Aplikasi Pembayaran SPP</h2>
            <p className="text-xs text-muted-foreground">
              Login sebagai {user.username}
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="md:hidden"
          >
            Logout
          </Button>
        </header>

        <div className="p-6">{children}</div>
      </section>
    </main>
  )
}