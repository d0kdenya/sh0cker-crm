import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import type { Profile } from '../features/auth/types';

import { ObjectList } from '../features/objects/components/ObjectList';
import { TaskBoard } from '../features/tasks/components/TaskBoard';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [taskBoardVersion, setTaskBoardVersion] = useState(0);

  const userId = user?.id;

  // Восстановление и отслеживание сессии
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

  // Получение роли текущего пользователя
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

    if (loading) return;

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
          : 'Ошибка авторизации',
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
  }

  if (authLoading) {
    return (
      <main>
        <p>Проверка авторизации...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main>
        <h1>Sh0cker CRM</h1>
        <h2>Вход в систему</h2>

        <form onSubmit={(event) => void handleLogin(event)}>
          <div>
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password">Пароль</label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        {error && <p role="alert">{error}</p>}
      </main>
    );
  }

  // Защита от отображения профиля предыдущей сессии
  const currentProfile =
    profile?.id === user.id ? profile : null;

  return (
    <main>
      <h1>Sh0cker CRM</h1>

      <p>Пользователь: {user.email}</p>
      <p>
        Роль: {currentProfile?.role ?? 'Загрузка...'}
      </p>

      <button type="button" onClick={() => void handleLogout()}>
        Выйти
      </button>

      {error && <p role="alert">{error}</p>}

      {currentProfile && (
        <>
          <ObjectList
            key={`objects-${user.id}`}
            isManager={currentProfile.role === 'manager'}
            onObjectArchived={() => {
              setTaskBoardVersion((previous) => previous + 1);
            }}
          />

          <TaskBoard
            key={`tasks-${user.id}-${taskBoardVersion}`}
            role={currentProfile.role}
            currentUserId={user.id}
          />
        </>
      )}
    </main>
  );
}

export default App;
