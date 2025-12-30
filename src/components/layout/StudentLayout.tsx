import React, { useState } from 'react'
import { AcademicCapIcon, Bars3Icon, XMarkIcon, PlusIcon, HomeIcon, BookOpenIcon, ClipboardDocumentListIcon, QrCodeIcon } from '@heroicons/react/24/outline'

type Props = {
  title?: string
  children: React.ReactNode
  onFabClick?: () => void
}

const StudentLayout: React.FC<Props> = ({ title = 'Portal Mahasiswa', children, onFabClick }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button aria-label="Menu" onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition">
              <Bars3Icon className="h-6 w-6 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-600 text-white">
                <AcademicCapIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Kampus</p>
                <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">Mahasiswa</span>
          </div>
        </div>
      </header>
      <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <aside className={`absolute left-0 top-0 h-full w-72 bg-white shadow-xl border-r transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center justify-between px-4 border-b">
            <div className="flex items-center gap-2">
              <AcademicCapIcon className="h-6 w-6 text-blue-600" />
              <span className="font-semibold">Navigasi</span>
            </div>
            <button aria-label="Close" onClick={() => setOpen(false)} className="p-2 rounded hover:bg-gray-100">
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            <a href="/dashboard/mahasiswa" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <HomeIcon className="h-5 w-5 text-gray-700" />
              <span>Beranda</span>
            </a>
            <a href="#materi" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <BookOpenIcon className="h-5 w-5 text-gray-700" />
              <span>Materi</span>
            </a>
            <a href="#tugas" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <ClipboardDocumentListIcon className="h-5 w-5 text-gray-700" />
              <span>Tugas</span>
            </a>
            <a href="#presensi" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <QrCodeIcon className="h-5 w-5 text-gray-700" />
              <span>Presensi</span>
            </a>
          </nav>
        </aside>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <button
        aria-label="Action"
        onClick={onFabClick}
        className="fixed bottom-6 right-6 inline-flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl active:scale-95 transition"
      >
        <PlusIcon className="h-6 w-6" />
      </button>
    </div>
  )
}

export default StudentLayout
