import React, { useState } from 'react'
import { UserGroupIcon, Bars3Icon, XMarkIcon, BellIcon, ChartBarIcon, QrCodeIcon, ClipboardDocumentListIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'

type Props = {
  title?: string
  children: React.ReactNode
}

const LecturerLayout: React.FC<Props> = ({ title = 'Portal Dosen', children }) => {
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button aria-label="Menu" onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition">
              <Bars3Icon className="h-6 w-6 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-600 text-white">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Kampus</p>
                <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/analytics/dosen" className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-white hover:opacity-90 transition">
              <ChartBarIcon className="h-5 w-5" />
              <span>Analytics</span>
            </a>
            <a href="#qr" className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition">
              <QrCodeIcon className="h-5 w-5" />
              <span>QR</span>
            </a>
            <button aria-label="Notifications" onClick={() => setNotifOpen(v => !v)} className="p-2 rounded-lg hover:bg-gray-100 transition relative">
              <BellIcon className="h-6 w-6 text-gray-700" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">3</span>
            </button>
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm hidden md:inline">Dosen</span>
          </div>
        </div>
      </header>
      <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <aside className={`absolute left-0 top-0 h-full w-80 bg-white shadow-xl border-r transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center justify-between px-4 border-b">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
              <span className="font-semibold">Navigasi</span>
            </div>
            <button aria-label="Close" onClick={() => setOpen(false)} className="p-2 rounded hover:bg-gray-100">
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            <a href="/dashboard/dosen" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <ChartBarIcon className="h-5 w-5 text-gray-700" />
              <span>Dashboard</span>
            </a>
            <a href="#tugas" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <ClipboardDocumentListIcon className="h-5 w-5 text-gray-700" />
              <span>Tugas</span>
            </a>
            <a href="#kalender" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <CalendarDaysIcon className="h-5 w-5 text-gray-700" />
              <span>Kalender</span>
            </a>
          </nav>
        </aside>
      </div>
      {notifOpen && (
        <div className="fixed top-20 right-6 z-40 w-80 bg-white rounded-xl shadow-xl border p-4">
          <p className="font-semibold text-gray-900 mb-2">Notifikasi</p>
          <div className="space-y-2 text-sm">
            <div className="p-2 border rounded">3 tugas mendekati tenggat</div>
            <div className="p-2 border rounded">Sesi absensi minggu ini: 5</div>
            <div className="p-2 border rounded">Materi baru diunggah</div>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

export default LecturerLayout
