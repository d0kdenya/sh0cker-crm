-- Права на чтение таблиц
REVOKE ALL ON TABLE
    public.profiles,
    public.objects,
    public.tasks,
    public.task_status_history
FROM anon, authenticated;

GRANT SELECT ON TABLE
    public.profiles,
    public.objects,
    public.tasks,
    public.task_status_history
TO authenticated;

-- Функция проверки роли постановщика
CREATE FUNCTION private.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
            AND role = 'manager'::public.user_role
    );
$$;

-- Доступ к функции только авторизованным пользователям
REVOKE ALL ON FUNCTION private.is_manager()
FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA private TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_manager()
TO authenticated;

-- Профили: постановщик видит всех, исполнитель - себя
CREATE POLICY profiles_select_policy
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = (SELECT auth.uid())
    OR (SELECT private.is_manager())
);

-- Объекты: постановщик видит все объекты,
-- Исполнитель: видит объекты со своими задачами
CREATE POLICY objects_select_policy
ON public.objects
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_manager())
    OR EXISTS (
        SELECT 1
        FROM public.tasks
        WHERE tasks.object_id = objects.id
            AND tasks.assignee_id = (SELECT auth.uid())
    )
);

-- Задачи: постановщик видит все задачи,
-- Исполнитель: видит только назначенные ему задачи
CREATE POLICY tasks_select_policy
ON public.tasks
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_manager())
    OR assignee_id = (SELECT auth.uid())
);

-- История: постановщик видит всю,
-- Исполнитель: видит историю только своих задач
CREATE POLICY history_select_policy
ON public.task_status_history
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_manager())
    OR EXISTS (
        SELECT 1
        FROM public.tasks
        WHERE tasks.id = task_status_history.task_id
            AND tasks.assignee_id = (SELECT auth.uid())
    )
);