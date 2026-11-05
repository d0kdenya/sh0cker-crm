-- Проверяет, есть ли у текущего пользователя
-- активные задачи на конкретном объекте.
CREATE FUNCTION private.has_active_task_on_object(
    p_object_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.tasks AS t
        JOIN public.objects AS o
            ON o.id = t.object_id
        WHERE t.object_id = p_object_id
            AND t.assignee_id = (SELECT auth.uid())
            AND t.deleted_at IS NULL
            AND o.deleted_at IS NULL
    );
$$;


-- Ограничиваем возможность вызова функции.
REVOKE ALL
ON FUNCTION private.has_active_task_on_object(UUID)
FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA private
TO authenticated;

GRANT EXECUTE
ON FUNCTION private.has_active_task_on_object(UUID)
TO authenticated;


-- Пересоздаём политику чтения объектов.
-- Постановщик видит все активные объекты.
-- Исполнитель видит объекты со своими активными задачами.
DROP POLICY IF EXISTS objects_select_policy
ON public.objects;

CREATE POLICY objects_select_policy
ON public.objects
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_manager())
    OR
    private.has_active_task_on_object(id)
);


-- Уточняем политику чтения задач.
-- Постановщик видит все активные задачи.
-- Исполнитель видит только назначенные ему.
DROP POLICY IF EXISTS tasks_select_policy
ON public.tasks;

CREATE POLICY tasks_select_policy
ON public.tasks
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_manager())
    OR
    assignee_id = (SELECT auth.uid())
);
