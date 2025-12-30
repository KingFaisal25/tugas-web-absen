import React, { useState } from 'react';
import StudentLogin from '../components/auth/StudentLogin';
import LecturerLogin from '../components/auth/LecturerLogin';
import StudentRegister from '../components/auth/StudentRegister';
import LecturerRegister from '../components/auth/LecturerRegister';

type AuthMode = 'student-login' | 'lecturer-login' | 'student-register' | 'lecturer-register';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('student-login');

  const switchToStudentLogin = () => setMode('student-login');
  const switchToLecturerLogin = () => setMode('lecturer-login');
  const switchToStudentRegister = () => setMode('student-register');
  const switchToLecturerRegister = () => setMode('lecturer-register');

  return (
    <div className="min-h-screen">
      {mode === 'student-login' && (
        <StudentLogin
          onSwitchToLecturer={switchToLecturerLogin}
          onSwitchToRegister={switchToStudentRegister}
        />
      )}
      {mode === 'lecturer-login' && (
        <LecturerLogin
          onSwitchToStudent={switchToStudentLogin}
          onSwitchToRegister={switchToLecturerRegister}
        />
      )}
      {mode === 'student-register' && (
        <StudentRegister
          onSwitchToLogin={switchToStudentLogin}
          onSwitchToLecturer={switchToLecturerRegister}
        />
      )}
      {mode === 'lecturer-register' && (
        <LecturerRegister
          onSwitchToLogin={switchToLecturerLogin}
          onSwitchToStudent={switchToStudentRegister}
        />
      )}
    </div>
  );
};

export default Auth;