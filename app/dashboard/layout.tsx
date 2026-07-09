"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarDays,
  CreditCard,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  Wallet,
  X,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import {
  getAllowedTingkat,
  getUser,
  isAdminKeuangan,
  logout,
  UserLogin,
} from "@/lib/auth"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const allMenus = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Pembayaran", href: "/dashboard/pembayaran", icon: CreditCard },
  { title: "Log SPP", href: "/dashboard/log-spp", icon: ScrollText },
  { title: "Log PPDB", href: "/dashboard/log-ppdb", icon: ScrollText },
  {
  title: "Pembayaran Lainnya",
  href: "/dashboard/log-lainnya",
  icon: Wallet,
  adminOnly: true,
},

  {
    title: "Laporan Siswa",
    href: "/dashboard/laporan",
    icon: FileText,
    adminOnly: true,
  },
  {
    title: "Laporan Keuangan",
    href: "/dashboard/keuangan",
    icon: FileText,
    adminOnly: true,
  },
  {
    title: "Master SPP",
    href: "/dashboard/master-spp",
    icon: Settings,
    adminOnly: true,
  },

  {
    title: "Ubah Password",
    href: "/dashboard/ubah-password",
    icon: KeyRound,
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [tahunAjaranAktif, setTahunAjaranAktif] = useState<string | null>(null)

  useEffect(() => {
    const currentUser = getUser()

    if (!currentUser) {
      router.push("/")
      return
    }

    setUser(currentUser)
  }, [router])

  useEffect(() => {
    if (!user) return

    apiFetch("/riwayat-kelas/tahun-aktif")
      .then((res) => setTahunAjaranAktif(res.data?.tahun_ajaran || null))
      .catch(() => setTahunAjaranAktif(null))
  }, [user])

  if (!user) return null

  const allowedTingkat = getAllowedTingkat(user)

  const menus = allMenus.filter((menu) => {
    if (menu.adminOnly) {
      return isAdminKeuangan(user)
    }

    return true
  })

  const sidebarWidth = collapsed ? "md:w-20" : "md:w-72"
  const contentPadding = collapsed ? "md:pl-20" : "md:pl-72"

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <main className="min-h-screen text-foreground">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 border-r transition-all duration-300
          bg-white/95 backdrop-blur-xl dark:bg-slate-950/90 dark:border-slate-800
          w-72 ${sidebarWidth}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="h-16 px-4 flex items-center justify-between">
          <div
            className={`overflow-hidden transition-all ${
              collapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"
            }`}
          >
            <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">
              SPP Sekolah
            </h1>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              Panel Keuangan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <Separator />

        <div className="p-4">
          <div
            className={`
              rounded-xl bg-slate-100 dark:bg-slate-900 dark:border dark:border-slate-800
              transition-all duration-300
              ${collapsed ? "md:p-2" : "p-4"}
            `}
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {user.username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div
                className={`overflow-hidden transition-all ${
                  collapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"
                }`}
              >
                <p className="text-sm font-semibold whitespace-nowrap">
                  {user.username}
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge>
                    {isAdminKeuangan(user) ? "Admin Keuangan" : "Staf Keuangan"}
                  </Badge>
                  <Badge variant="outline">
                    Kelas{" "}
                    {allowedTingkat.length > 0
                      ? allowedTingkat.join(", ")
                      : "-"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="px-3 space-y-1 pb-24">
          {menus.map((menu) => {
            const Icon = menu.icon
            const active =
              pathname === menu.href ||
              (menu.href !== "/dashboard" && pathname.startsWith(menu.href))

            return (
              <button
                key={menu.href}
                onClick={() => {
                  router.push(menu.href)
                  setMobileOpen(false)
                }}
                title={collapsed ? menu.title : undefined}
                className={`
                  group relative w-full flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm transition
                  ${collapsed ? "md:justify-center" : "justify-start gap-3"}
                  ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-slate-100 dark:hover:bg-slate-900 text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />

                <span
                  className={`whitespace-nowrap overflow-hidden transition-all ${
                    collapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"
                  }`}
                >
                  {menu.title}
                </span>

                {collapsed && (
                  <span
                    className="
                      pointer-events-none absolute left-full ml-3 hidden rounded-lg
                      bg-slate-900 px-3 py-2 text-xs text-white shadow-lg
                      group-hover:md:block
                    "
                  >
                    {menu.title}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <Button
            variant="destructive"
            className={`w-full ${collapsed ? "md:px-0" : ""}`}
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="w-4 h-4" />
            <span
              className={`ml-2 transition-all ${
                collapsed ? "md:hidden" : "inline"
              }`}
            >
              Logout
            </span>
          </Button>
        </div>
      </aside>

      <section className={`transition-all duration-300 ${contentPadding}`}>
        <header className="sticky top-0 z-30 h-16 border-b flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-xl dark:bg-slate-950/60 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div>
              <h2 className="font-semibold">Aplikasi Keuangan SPP</h2>
              <p className="text-xs text-muted-foreground">
                SMK Sangkuriang 1 Cimahi
              </p>
            </div>

            {tahunAjaranAktif && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                <CalendarDays className="w-3 h-3 mr-1" />
                Tahun Ajaran {tahunAjaranAktif}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-2 rounded-full hover:bg-muted p-1">
                  <Avatar>
                    <AvatarFallback>
                      {user.username?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p>{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAdminKeuangan(user)
                        ? "Admin Keuangan"
                        : "Staf Keuangan"}
                    </p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/ubah-password")}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Ubah Password
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-4 md:p-6">{children}</div>
      </section>
    </main>
  )
}