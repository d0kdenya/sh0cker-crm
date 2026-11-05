-- Добавляем дату удаления.
-- NULL означает, что запись активна.
ALTER TABLE public.objects
ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE public.tasks
ADD COLUMN deleted_at TIMESTAMPTZ;


-- Индексы для выборки активных записей.
CREATE INDEX idx_objects_active
ON public.objects (created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_active
ON public.tasks (created_at DESC)
WHERE deleted_at IS NULL;


-- Запрещаем физическое удаление через Data API.
REVOKE DELETE ON public.objects
FROM anon, authenticated;

REVOKE DELETE ON public.tasks
FROM anon, authenticated;


-- Запрещаем прямое изменение признака удаления.
-- Менять deleted_at будут только доверенные функции.
REVOKE UPDATE (deleted_at)
ON public.objects
FROM anon, authenticated;

REVOKE UPDATE (deleted_at)
ON public.tasks
FROM anon, authenticated;


-- Скрываем удалённые объекты.
CREATE POLICY objects_active_select_policy
ON public.objects
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Запрещаем редактирование удалённых объектов.
CREATE POLICY objects_active_update_policy
ON public.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (deleted_at IS NULL)
WITH CHECK (deleted_at IS NULL);

-- Запрещаем создание уже удалённых объектов.
CREATE POLICY objects_active_insert_policy
ON public.objects
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (deleted_at IS NULL);


-- Скрываем удалённые задачи.
CREATE POLICY tasks_active_select_policy
ON public.tasks
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Запрещаем изменение удалённых задач.
-- Нельзя также переназначить задачу на удалённый объект.
CREATE POLICY tasks_active_update_policy
ON public.tasks
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (deleted_at IS NULL)
WITH CHECK (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1
        FROM public.objects AS o
        WHERE o.id = object_id
            AND o.deleted_at IS NULL
    )
);

-- Новые задачи разрешено создавать только
-- внутри существующих активных объектов.
CREATE POLICY tasks_active_insert_policy
ON public.tasks
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1
        FROM public.objects AS o
        WHERE o.id = object_id
            AND o.deleted_at IS NULL
    )
);


-- История удалённой задачи не доступна
-- через обычный пользовательский API.
-- Физически она остаётся в PostgreSQL.
CREATE POLICY history_active_task_select_policy
ON public.task_status_history
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.tasks AS t
        WHERE t.id = task_id
            AND t.deleted_at IS NULL
    )
);


-- Дополнительная защита от изменения
-- уже удалённых записей, включая вызовы RPC.
CREATE FUNCTION private.prevent_archived_row_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot modify an archived record'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL
ON FUNCTION private.prevent_archived_row_update()
FROM PUBLIC, anon, authenticated;


CREATE TRIGGER trg_protect_archived_objects
BEFORE UPDATE ON public.objects
FOR EACH ROW
EXECUTE FUNCTION private.prevent_archived_row_update();

CREATE TRIGGER trg_protect_archived_tasks
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION private.prevent_archived_row_update();


-- Удаление одной задачи.
CREATE FUNCTION public.archive_task(p_task_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_task_id UUID;
BEGIN
    IF (SELECT auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
            AND p.role = 'manager'::public.user_role
    ) THEN
        RAISE EXCEPTION 'Only managers can delete tasks'
            USING ERRCODE = '42501';
    END IF;

    -- Блокируем задачу, чтобы исключить конфликт
    -- с одновременной сменой её статуса.
    SELECT t.id
    INTO v_task_id
    FROM public.tasks AS t
    WHERE t.id = p_task_id
        AND t.deleted_at IS NULL
    FOR UPDATE;

    IF v_task_id IS NULL THEN
        RAISE EXCEPTION 'Active task not found'
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.tasks
    SET deleted_at = now()
    WHERE id = v_task_id;
END;
$$;


-- Удаление объекта и связанных задач.
CREATE FUNCTION public.archive_object(p_object_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_object_id UUID;
BEGIN
    IF (SELECT auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
            AND p.role = 'manager'::public.user_role
    ) THEN
        RAISE EXCEPTION 'Only managers can delete objects'
            USING ERRCODE = '42501';
    END IF;

    -- Блокируем объект.
    SELECT o.id
    INTO v_object_id
    FROM public.objects AS o
    WHERE o.id = p_object_id
        AND o.deleted_at IS NULL
    FOR UPDATE;

    IF v_object_id IS NULL THEN
        RAISE EXCEPTION 'Active object not found'
            USING ERRCODE = 'P0002';
    END IF;

    -- Скрываем все активные задачи этого объекта.
    UPDATE public.tasks
    SET deleted_at = now()
    WHERE object_id = v_object_id
        AND deleted_at IS NULL;

    -- Скрываем сам объект.
    UPDATE public.objects
    SET deleted_at = now()
    WHERE id = v_object_id;
END;
$$;


-- Разрешаем RPC только авторизованным пользователям.
-- Дополнительная проверка manager выполняется внутри.
REVOKE ALL
ON FUNCTION public.archive_task(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.archive_task(UUID)
TO authenticated;

REVOKE ALL
ON FUNCTION public.archive_object(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.archive_object(UUID)
TO authenticated;


-- Описание функций для документации схемы.
COMMENT ON FUNCTION public.archive_task(UUID)
IS 'Логическое удаление задачи постановщиком с сохранением истории';

COMMENT ON FUNCTION public.archive_object(UUID)
IS 'Логическое удаление объекта и его задач с сохранением истории';
