
-- Проверка, что назначаемый пользователь является исполнителем.
CREATE FUNCTION private.is_executor(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = target_user_id
            AND role = 'executor'::public.user_role
    );
$$;

REVOKE ALL
ON FUNCTION private.is_executor(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION private.is_executor(UUID)
TO authenticated;


-- Постановщик может создавать задачи.
-- Из системных полей доступен только author_id.
GRANT INSERT (
    title,
    description,
    object_id,
    assignee_id,
    author_id
)
ON public.tasks
TO authenticated;


-- Постановщик может редактировать бизнес-поля.
-- ID, автор, статус и системные даты защищены.
GRANT UPDATE (
    title,
    description,
    object_id,
    assignee_id
)
ON public.tasks
TO authenticated;


-- Создать задачу может только постановщик.
-- Автор должен совпадать с текущим пользователем.
-- Назначенный пользователь должен быть исполнителем.
-- Статус при создании берётся из DEFAULT ('new').
CREATE POLICY tasks_insert_policy
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_manager())
    AND author_id = (SELECT auth.uid())
    AND private.is_executor(assignee_id)
);


-- Редактировать бизнес-поля задач может постановщик.
-- Исполнитель не получает прямых прав на UPDATE.
CREATE POLICY tasks_update_policy
ON public.tasks
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_manager())
)
WITH CHECK (
    (SELECT private.is_manager())
    AND private.is_executor(assignee_id)
);


-- Автоматическое обновление даты изменения задачи.
CREATE FUNCTION private.set_task_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();

    RETURN NEW;
END;
$$;

REVOKE ALL
ON FUNCTION private.set_task_updated_at()
FROM PUBLIC, anon, authenticated;


CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION private.set_task_updated_at();
