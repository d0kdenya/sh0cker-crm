-- Список ролей
CREATE TYPE public.user_role AS ENUM (
    'manager',
    'executor'
);

-- Статусы задач
CREATE TYPE public.task_status AS ENUM (
    'new',
    'in_progress',
    'on_review',
    'accepted',
    'needs_revision'
);

-- Профили пользователей
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    full_name TEXT,

    role public.user_role NOT NULL DEFAULT 'executor',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT profiles_full_name_not_blank
        CHECK (
            full_name IS NULL
            OR length(btrim(full_name)) > 0
        )
);

-- Объекты строительства
CREATE TABLE public.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    address TEXT NOT NULL,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT objects_name_not_blank
        CHECK (length(btrim(name)) > 0),

    CONSTRAINT objects_address_not_blank
        CHECK (length(btrim(address)) > 0)
);

-- Задачи
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,
    description TEXT,

    object_id UUID NOT NULL
        REFERENCES public.objects(id) ON DELETE RESTRICT,

    assignee_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    author_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    status public.task_status NOT NULL DEFAULT 'new',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT tasks_title_not_blank
        CHECK (length(btrim(title)) > 0)
);

-- История изменения задач
CREATE TABLE public.task_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id UUID NOT NULL
        REFERENCES public.tasks(id) ON DELETE RESTRICT,

    changed_by UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    from_status public.task_status,
    to_status public.task_status NOT NULL,

    comment TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT history_status_changed
        CHECK (
            from_status IS NULL
            OR from_status <> to_status
        ),

    CONSTRAINT history_comment_not_blank
        CHECK (
            comment IS NULL
            OR length(btrim(comment)) > 0
        )
);

-- Индексы
CREATE INDEX idx_objects_created_by
    ON public.objects(created_by);

CREATE INDEX idx_tasks_object_id
    ON public.tasks(object_id);

CREATE INDEX idx_tasks_assignee_id
    ON public.tasks(assignee_id);

CREATE INDEX idx_tasks_author_id
    ON public.tasks(author_id);

CREATE INDEX idx_tasks_status
    ON public.tasks(status);

CREATE INDEX idx_history_task_created
    ON public.task_status_history(task_id, created_at, id);

-- Включение безопасности на уровне строк
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;

-- Закрытая схема для доверенных функций
CREATE SCHEMA private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- Автоматическое создание профиля
CREATE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        NULL,
        'executor'::public.user_role
    );

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user()
    FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_new_user();