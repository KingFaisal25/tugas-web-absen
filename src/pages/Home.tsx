import React from 'react'
import { Link } from 'react-router-dom'
import { AcademicCapIcon, UserGroupIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import { useLang } from '../i18n'
import { useAccessibility } from '../contexts/AccessibilityContext'

const Home: React.FC = () => {
  const { t, lang, setLang } = useLang()
  const { highContrast, toggleHighContrast } = useAccessibility()
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('app.title')}</h1>
                <p className="text-sm text-gray-600">{t('app.subtitle')}</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-gray-500">{t('home.role.choose')}</span>
              <select aria-label="Language" value={lang} onChange={e => setLang(e.target.value as any)} className="px-2 py-1 border rounded text-sm">
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ru">Русский</option>
                <option value="ar">العربية</option>
                <option value="hi">हिंदी</option>
                <option value="pt">Português</option>
              </select>
              <button aria-pressed={highContrast} onClick={toggleHighContrast} className="px-2 py-1 border rounded text-sm">
                Aksesibilitas
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('home.welcome')}{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('home.platform')}
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Solusi terintegrasi untuk manajemen perkuliahan, absensi, dan penilaian.
            Dirancang khusus untuk meningkatkan efisiensi dan pengalaman akademik.
          </p>
        </div>
      </section>

      {/* Role Selection */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Pilih Role Anda
            </h3>
            <p className="text-lg text-gray-600">
              Masuk sebagai mahasiswa atau dosen untuk mengakses fitur yang sesuai
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Student Card */}
            <Link
              to="/login/mahasiswa"
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200"
            >
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-center">
                <div className="bg-white bg-opacity-20 rounded-full p-4 inline-block mb-4">
                  <AcademicCapIcon className="h-12 w-12 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">{t('home.role.student')}</h4>
                <p className="text-blue-100">Akses materi, tugas, dan absensi</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Lihat jadwal dan materi perkuliahan
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Mengumpulkan tugas secara online
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Absensi dengan QR Code
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Melihat nilai dan progress
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <span className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium group-hover:bg-blue-700 transition-colors" aria-label={t('home.student.login')}>
                    {t('home.student.login')}
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>

            {/* Lecturer Card */}
            <Link
              to="/login/dosen"
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-purple-200"
            >
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-8 text-center">
                <div className="bg-white bg-opacity-20 rounded-full p-4 inline-block mb-4">
                  <UserGroupIcon className="h-12 w-12 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">{t('home.role.lecturer')}</h4>
                <p className="text-purple-100">Kelola perkuliahan dan penilaian</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    Mengelola mata kuliah dan jadwal
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    Membuat dan menilai tugas
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    Monitoring absensi mahasiswa
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    Generate QR Code absensi
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <span className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-medium group-hover:bg-purple-700 transition-colors" aria-label={t('home.lecturer.login')}>
                    {t('home.lecturer.login')}
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              {t('features.title')}
            </h3>
            <p className="text-lg text-gray-600">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-blue-100 rounded-full p-3 inline-block mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t('feature.qr.title')}</h4>
              <p className="text-gray-600">{t('feature.qr.desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-green-100 rounded-full p-3 inline-block mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t('feature.task.title')}</h4>
              <p className="text-gray-600">{t('feature.task.desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-purple-100 rounded-full p-3 inline-block mb-4">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{t('feature.stats.title')}</h4>
              <p className="text-gray-600">{t('feature.stats.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <BookOpenIcon className="h-8 w-8 text-blue-400 mr-2" />
            <span className="text-2xl font-bold">Platform Akademik</span>
          </div>
          <p className="text-gray-400 mb-4">
            Meningkatkan kualitas pendidikan melalui teknologi modern
          </p>
          <p className="text-sm text-gray-500">
            © 2024 Platform Akademik. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Home
