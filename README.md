# Sh0cker CRM

Мини-CRM для управления строительными объектами и задачами. Постановщик создаёт объекты, назначает работы и принимает результат; исполнитель видит свои задачи, меняет их статус и отправляет на проверку.

## Быстрый старт

Понадобятся **Node.js, npm, Docker** и доступ к Supabase CLI (`npx supabase`). Для локального Supabase Docker должен быть запущен.

```bash
npm ci
npx supabase start
```

Посмотрите вывод `npx supabase status`: он содержит локальный API URL и publishable key. Создайте файл `.env.local` в корне проекта, используя имена переменных из `.env.example`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Во вторую строку добавьте **полный publishable key**, показанный командой `npx supabase status`. Пустое значение не позволит приложению запуститься. После настройки:

```bash
npm run dev
```

Откройте URL из терминала Vite. Локальная схема создаётся миграциями Supabase. **Пользователи не создаются автоматически миграциями**: добавьте их через Supabase Studio → Authentication → Users.

При создании пользователя триггер добавляет запись в `public.profiles` с ролью `executor`.;

## Проверки

```bash
npm run lint
npm run build
npm test
```