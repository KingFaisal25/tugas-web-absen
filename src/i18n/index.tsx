import React, { createContext, useContext, useMemo, useState } from 'react'

type LangKey =
  | 'app.title'
  | 'app.subtitle'
  | 'home.welcome'
  | 'home.platform'
  | 'home.role.choose'
  | 'home.role.student'
  | 'home.role.lecturer'
  | 'home.student.login'
  | 'home.lecturer.login'
  | 'features.title'
  | 'features.subtitle'
  | 'feature.qr.title'
  | 'feature.qr.desc'
  | 'feature.task.title'
  | 'feature.task.desc'
  | 'feature.stats.title'
  | 'feature.stats.desc'

type Dict = Record<LangKey, string>

const id: Dict = {
  'app.title': 'Platform Akademik',
  'app.subtitle': 'Sistem Manajemen Perkuliahan Modern',
  'home.welcome': 'Selamat Datang di',
  'home.platform': 'Platform Akademik',
  'home.role.choose': 'Pilih role untuk login:',
  'home.role.student': 'Mahasiswa',
  'home.role.lecturer': 'Dosen',
  'home.student.login': 'Login sebagai Mahasiswa',
  'home.lecturer.login': 'Login sebagai Dosen',
  'features.title': 'Fitur Unggulan',
  'features.subtitle': 'Teknologi modern untuk pengalaman akademik yang lebih baik',
  'feature.qr.title': 'QR Code Absensi',
  'feature.qr.desc': 'Absensi otomatis dengan QR Code yang aman dan efisien',
  'feature.task.title': 'Manajemen Tugas',
  'feature.task.desc': 'Pengumpulan dan penilaian tugas secara digital dan terorganisir',
  'feature.stats.title': 'Statistik Real-time',
  'feature.stats.desc': 'Analitik dan pelaporan performa akademik secara real-time'
}

const en: Dict = {
  'app.title': 'Academic Platform',
  'app.subtitle': 'Modern Course Management System',
  'home.welcome': 'Welcome to',
  'home.platform': 'Academic Platform',
  'home.role.choose': 'Choose a role to log in:',
  'home.role.student': 'Student',
  'home.role.lecturer': 'Lecturer',
  'home.student.login': 'Login as Student',
  'home.lecturer.login': 'Login as Lecturer',
  'features.title': 'Key Features',
  'features.subtitle': 'Modern technology for a better academic experience',
  'feature.qr.title': 'QR Code Attendance',
  'feature.qr.desc': 'Automated attendance with secure and efficient QR Codes',
  'feature.task.title': 'Task Management',
  'feature.task.desc': 'Digital and organized assignment submission and grading',
  'feature.stats.title': 'Real-time Statistics',
  'feature.stats.desc': 'Analytics and performance reporting in real time'
}

const zh: Dict = {
  'app.title': '学术平台',
  'app.subtitle': '现代课程管理系统',
  'home.welcome': '欢迎来到',
  'home.platform': '学术平台',
  'home.role.choose': '选择登录角色：',
  'home.role.student': '学生',
  'home.role.lecturer': '讲师',
  'home.student.login': '以学生身份登录',
  'home.lecturer.login': '以讲师身份登录',
  'features.title': '主要功能',
  'features.subtitle': '现代技术提升学习体验',
  'feature.qr.title': '二维码考勤',
  'feature.qr.desc': '使用安全高效的二维码实现自动考勤',
  'feature.task.title': '任务管理',
  'feature.task.desc': '数字化且有序的作业提交与评分',
  'feature.stats.title': '实时统计',
  'feature.stats.desc': '实时分析与绩效报告'
}

const es: Dict = {
  'app.title': 'Plataforma Académica',
  'app.subtitle': 'Sistema moderno de gestión de cursos',
  'home.welcome': 'Bienvenido a',
  'home.platform': 'Plataforma Académica',
  'home.role.choose': 'Elige un rol para iniciar sesión:',
  'home.role.student': 'Estudiante',
  'home.role.lecturer': 'Profesor',
  'home.student.login': 'Iniciar como Estudiante',
  'home.lecturer.login': 'Iniciar como Profesor',
  'features.title': 'Funciones Clave',
  'features.subtitle': 'Tecnología moderna para una mejor experiencia académica',
  'feature.qr.title': 'Asistencia con QR',
  'feature.qr.desc': 'Asistencia automática con códigos QR seguros y eficientes',
  'feature.task.title': 'Gestión de Tareas',
  'feature.task.desc': 'Entrega y calificación digital organizada',
  'feature.stats.title': 'Estadísticas en tiempo real',
  'feature.stats.desc': 'Analítica e informes de rendimiento en tiempo real'
}

const fr: Dict = {
  'app.title': 'Plateforme Académique',
  'app.subtitle': 'Système moderne de gestion des cours',
  'home.welcome': 'Bienvenue sur',
  'home.platform': 'Plateforme Académique',
  'home.role.choose': 'Choisissez un rôle pour vous connecter :',
  'home.role.student': 'Étudiant',
  'home.role.lecturer': 'Enseignant',
  'home.student.login': 'Se connecter comme Étudiant',
  'home.lecturer.login': 'Se connecter comme Enseignant',
  'features.title': 'Fonctionnalités clés',
  'features.subtitle': 'Technologies modernes pour une meilleure expérience académique',
  'feature.qr.title': 'Présence via QR',
  'feature.qr.desc': 'Présence automatisée avec des QR sécurisés et efficaces',
  'feature.task.title': 'Gestion des Tâches',
  'feature.task.desc': 'Remise et notation numériques organisées',
  'feature.stats.title': 'Statistiques en temps réel',
  'feature.stats.desc': 'Analytique et rapports de performance en temps réel'
}

const de: Dict = {
  'app.title': 'Akademische Plattform',
  'app.subtitle': 'Modernes Kursverwaltungssystem',
  'home.welcome': 'Willkommen bei',
  'home.platform': 'Akademische Plattform',
  'home.role.choose': 'Wählen Sie eine Rolle zum Anmelden:',
  'home.role.student': 'Student',
  'home.role.lecturer': 'Dozent',
  'home.student.login': 'Als Student anmelden',
  'home.lecturer.login': 'Als Dozent anmelden',
  'features.title': 'Wichtige Funktionen',
  'features.subtitle': 'Moderne Technologie für ein besseres Lernerlebnis',
  'feature.qr.title': 'QR-Anwesenheit',
  'feature.qr.desc': 'Automatische Anwesenheit mit sicheren und effizienten QR-Codes',
  'feature.task.title': 'Aufgabenverwaltung',
  'feature.task.desc': 'Digitale, organisierte Abgabe und Bewertung',
  'feature.stats.title': 'Echtzeitstatistiken',
  'feature.stats.desc': 'Analytik und Leistungsberichte in Echtzeit'
}

const ru: Dict = {
  'app.title': 'Академическая платформа',
  'app.subtitle': 'Современная система управления курсами',
  'home.welcome': 'Добро пожаловать на',
  'home.platform': 'Академическую платформу',
  'home.role.choose': 'Выберите роль для входа:',
  'home.role.student': 'Студент',
  'home.role.lecturer': 'Преподаватель',
  'home.student.login': 'Войти как студент',
  'home.lecturer.login': 'Войти как преподаватель',
  'features.title': 'Ключевые функции',
  'features.subtitle': 'Современные технологии для лучшего обучения',
  'feature.qr.title': 'Посещаемость по QR',
  'feature.qr.desc': 'Автоматическая отметка посещаемости с безопасными QR-кодами',
  'feature.task.title': 'Управление заданиями',
  'feature.task.desc': 'Цифровая и организованная сдача и оценка',
  'feature.stats.title': 'Статистика в реальном времени',
  'feature.stats.desc': 'Аналитика и отчеты о производительности в реальном времени'
}

const ar: Dict = {
  'app.title': 'منصة أكاديمية',
  'app.subtitle': 'نظام حديث لإدارة المقررات',
  'home.welcome': 'مرحبًا بك في',
  'home.platform': 'المنصة الأكاديمية',
  'home.role.choose': 'اختر دورًا لتسجيل الدخول:',
  'home.role.student': 'طالب',
  'home.role.lecturer': 'محاضر',
  'home.student.login': 'تسجيل دخول كطالب',
  'home.lecturer.login': 'تسجيل دخول كمحاضر',
  'features.title': 'الميزات الرئيسية',
  'features.subtitle': 'تقنيات حديثة لتجربة تعليمية أفضل',
  'feature.qr.title': 'الحضور عبر QR',
  'feature.qr.desc': 'حضور تلقائي باستخدام رموز QR آمنة وفعّالة',
  'feature.task.title': 'إدارة المهام',
  'feature.task.desc': 'تسليم وتقييم رقمي ومنظم',
  'feature.stats.title': 'إحصاءات فورية',
  'feature.stats.desc': 'تحليلات وتقارير أداء في الوقت الفعلي'
}

const hi: Dict = {
  'app.title': 'शैक्षणिक प्लेटफ़ॉर्म',
  'app.subtitle': 'आधुनिक पाठ्यक्रम प्रबंधन प्रणाली',
  'home.welcome': 'में आपका स्वागत है',
  'home.platform': 'शैक्षणिक प्लेटफ़ॉर्म',
  'home.role.choose': 'लॉगिन के लिए भूमिका चुनें:',
  'home.role.student': 'विद्यार्थी',
  'home.role.lecturer': 'अध्यापक',
  'home.student.login': 'विद्यार्थी के रूप में लॉगिन',
  'home.lecturer.login': 'अध्यापक के रूप में लॉगिन',
  'features.title': 'मुख्य विशेषताएँ',
  'features.subtitle': 'बेहतर शैक्षणिक अनुभव के लिए आधुनिक तकनीक',
  'feature.qr.title': 'QR उपस्थिति',
  'feature.qr.desc': 'सुरक्षित और प्रभावी QR कोड से स्वचालित उपस्थिति',
  'feature.task.title': 'कार्य प्रबंधन',
  'feature.task.desc': 'डिजिटल और सुव्यवस्थित कार्य जमा और मूल्यांकन',
  'feature.stats.title': 'रीयल-टाइम आँकड़े',
  'feature.stats.desc': 'रीयल-टाइम में विश्लेषण और प्रदर्शन रिपोर्ट'
}

const pt: Dict = {
  'app.title': 'Plataforma Acadêmica',
  'app.subtitle': 'Sistema moderno de gestão de cursos',
  'home.welcome': 'Bem-vindo à',
  'home.platform': 'Plataforma Acadêmica',
  'home.role.choose': 'Escolha um papel para fazer login:',
  'home.role.student': 'Estudante',
  'home.role.lecturer': 'Professor',
  'home.student.login': 'Entrar como Estudante',
  'home.lecturer.login': 'Entrar como Professor',
  'features.title': 'Recursos Principais',
  'features.subtitle': 'Tecnologia moderna para uma melhor experiência acadêmica',
  'feature.qr.title': 'Presença com QR',
  'feature.qr.desc': 'Presença automática com códigos QR seguros e eficientes',
  'feature.task.title': 'Gestão de Tarefas',
  'feature.task.desc': 'Entrega e avaliação digital organizada',
  'feature.stats.title': 'Estatísticas em tempo real',
  'feature.stats.desc': 'Analítica e relatórios de desempenho em tempo real'
}

const langs = { id, en, zh, es, fr, de, ru, ar, hi, pt }
type LangCode = keyof typeof langs

type LangContextType = {
  lang: LangCode
  setLang: (l: LangCode) => void
  t: (k: LangKey) => string
}

const LangContext = createContext<LangContextType | null>(null)

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<LangCode>('id')
  const dict = useMemo(() => langs[lang], [lang])
  const t = (k: LangKey) => dict[k] || k
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export const useLang = () => {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('LangContext')
  return ctx
}
