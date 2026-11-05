
import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import type { Task } from '../features/tasks/types';
import type { Profile } from '../features/auth/types';

import { testObjectPermissions } from '../features/objects/testPermissions';

import { ObjectList } from '../features/objects/components/ObjectList';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');

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

    async function loadData() {
      setDataLoading(true);
      setError('');

      const [profileResult, tasksResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, role')
          .eq('id', userId!)
          .single(),

        supabase
          .from('tasks')
          .select('id, title, status, assignee_id, object_id')
          .order('created_at'),
      ]);

      if (!active) return;

      if (profileResult.error || tasksResult.error) {
        setError(
          profileResult.error?.message ??
          tasksResult.error?.message ??
          'Failed to load data',
        );
      }

      setProfile(profileResult.data ?? null);
      setTasks(tasksResult.data ?? []);
      setDataLoading(false);
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [userId]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
    }

    setLoading(false);
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
    setTasks([]);
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

        <form onSubmit={handleLogin}>
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

  return (
    <main>
      <h1>Sh0cker CRM</h1>

      <p>Пользователь: {user.email}</p>
      <p>Роль: {profile?.role ?? 'Загрузка...'}</p>

      <button type="button" onClick={handleLogout}>
        Выйти
      </button>

      {profile && (
        <ObjectList
          key={user.id}
          isManager={profile.role === 'manager'}
        />
      )}

      <button
        type="button"
        onClick={() => void testObjectPermissions()}
      >
        Проверить права на объекты
      </button>

      <h2>Доступные задачи</h2>

      {dataLoading ? (
        <p>Загрузка задач...</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <strong>{task.title}</strong>
              {' - '}
              {task.status}
              <small> (ID: {task.id})</small>
            </li>
          ))}
        </ul>
      )}

      {!dataLoading && tasks.length === 0 && !error && (
        <p>Нет доступных задач.</p>
      )}

      {error && <p role="alert">{error}</p>}
    </main>
  );
}

export default App;