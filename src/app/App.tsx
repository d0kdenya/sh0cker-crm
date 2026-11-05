
import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Layers3, LockKeyhole } from 'lucide-react';

import { supabase } from '../lib/supabase';
import type { Profile } from '../features/auth/types';
import type { AppSection } from '../components/layout/types';

import { AppLayout } from '../components/layout/AppLayout';
import { ObjectList } from '../features/objects/components/ObjectList';
import { TaskBoard } from '../features/tasks/components/TaskBoard';

import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [activeSection, setActiveSection] =
    useState<AppSection>('tasks');

  const [taskBoardVersion, setTaskBoardVersion] = useState(0);

  const userId = user?.id;

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }

      if (error) {
        setError(error.message);
      } else {
        setUser(data.session?.user ?? null);
      }

      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
        return;
      }

    let active = true;

    supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (!active) {
        return;
      }

        if (error) {
          setError(error.message);
          return;
        }

        setProfile(data);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
        return;
      }

    setLoading(true);
    setError('');

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        throw loginError;
      }

      setPassword('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось войти в систему',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setError('');

    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    setUser(null);
    setProfile(null);
    setPassword('');
    setActiveSection('tasks');
    setTaskBoardVersion(0);
  }

  if (authLoading) {
    return (
      <div className="crm-auth-page">
        <div className="crm-auth-loading">
          Проверка авторизации...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="crm-auth-page">
        <div className="crm-auth-card">
          <div className="crm-auth-brand">
            <span className="crm-auth-logo">
              <Layers3 size={29} />
            </span>

            <h1>Sh0cker CRM</h1>
            <p>Управление объектами и задачами</p>
          </div>

          <div className="crm-auth-heading">
            <h2>Добро пожаловать</h2>
            <p>Войдите в своё рабочее пространство</p>
          </div>

          <form onSubmit={(event) => void handleLogin(event)}>
            <div className="crm-form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Введите email"
                required
              />
            </div>

            <div className="crm-form-field">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
                required
              />
            </div>

            {error && <p role="alert">{error}</p>}

            <button
              className="crm-auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Выполняется вход...' : 'Войти в CRM'}
            </button>
          </form>

          <div className="crm-auth-footer">
            <LockKeyhole size={15} />
            <span>Защищённое рабочее пространство</span>
          </div>
        </div>
      </div>
    );
  }

  const currentProfile =
    profile?.id === user.id ? profile : null;

  if (!currentProfile) {
    return (
      <div className="crm-auth-page">
        <div className="crm-auth-card">
          <p>Загрузка профиля...</p>

          {error && <p role="alert">{error}</p>}

          <button
            type="button"
            onClick={() => void handleLogout()}
          >
            Выйти
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={handleLogout}
      role={currentProfile.role}
      email={user.email ?? 'Пользователь'}
    >
      {error && <p role="alert">{error}</p>}

      {activeSection === 'objects' ? (
        <ObjectList
          key={`objects-${user.id}`}
          isManager={currentProfile.role === 'manager'}
          onObjectArchived={() => {
            setTaskBoardVersion((previous) => previous + 1);
          }}
        />
      ) : (
        <TaskBoard
          key={`tasks-${user.id}-${taskBoardVersion}`}
          role={currentProfile.role}
          currentUserId={user.id}
        />
      )}
    </AppLayout>
  );
}

export default App;