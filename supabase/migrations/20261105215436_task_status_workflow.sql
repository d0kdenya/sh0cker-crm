
-- Запрещаем прямое изменение статуса через клиентский API.
REVOKE UPDATE (status)
ON public.tasks
FROM authenticated;


-- Функция изменения статуса задачи.
CREATE FUNCTION public.change_task_status(
    p_task_id UUID,
    p_new_status public.task_status,
    p_comment TEXT DEFAULT NULL
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_role public.user_role;
    v_task public.tasks%ROWTYPE;
    v_old_status public.task_status;
    v_comment TEXT;
    v_allowed BOOLEAN := FALSE;
BEGIN
    -- Получаем UUID авторизованного пользователя.
    v_user_id := (SELECT auth.uid());

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    -- Проверяем роль пользователя.
    SELECT role
    INTO v_role
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_role IS NULL THEN
        RAISE EXCEPTION 'User profile not found'
            USING ERRCODE = '42501';
    END IF;

    -- Получаем задачу и блокируем строку.
    SELECT *
    INTO v_task
    FROM public.tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found'
            USING ERRCODE = 'P0002';
    END IF;

    -- Исполнитель может изменять только свою задачу.
    IF v_role = 'executor'
        AND v_task.assignee_id <> v_user_id THEN
            RAISE EXCEPTION 'Access denied'
                USING ERRCODE = '42501';
    END IF;

    -- Сохраняем текущий статус до изменения.
    v_old_status := v_task.status;

    -- Убираем пробелы по краям комментария.
    v_comment := NULLIF(btrim(p_comment), '');

    -- Переходы исполнителя.
    IF v_role = 'executor' THEN
        v_allowed := (
            (v_old_status = 'new'
                AND p_new_status = 'in_progress')

            OR (v_old_status = 'in_progress'
                AND p_new_status = 'on_review')

            OR (v_old_status = 'needs_revision'
                AND p_new_status = 'in_progress')
        );
    END IF;

    -- Переходы постановщика.
    IF v_role = 'manager' THEN
        v_allowed := (
            v_old_status = 'on_review'
            AND p_new_status IN (
                'accepted',
                'needs_revision'
            )
        );
    END IF;

    -- Запрещаем любые остальные переходы.
    IF v_allowed IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Invalid task status transition'
            USING ERRCODE = '22023';
    END IF;

    -- Возврат на доработку требует комментария.
    IF p_new_status = 'needs_revision'
        AND v_comment IS NULL THEN
            RAISE EXCEPTION 'Revision comment is required'
                USING ERRCODE = '23514';
    END IF;

    -- Меняем статус.
    -- Существующий триггер обновит updated_at.
    UPDATE public.tasks
    SET status = p_new_status
    WHERE id = p_task_id
    RETURNING * INTO v_task;

    -- Записываем историю в рамках той же транзакции.
    INSERT INTO public.task_status_history (
        task_id,
        changed_by,
        from_status,
        to_status,
        comment
    )
    VALUES (
        p_task_id,
        v_user_id,
        v_old_status,
        p_new_status,
        v_comment
    );

    RETURN v_task;
END;
$$;


-- Ограничиваем доступ к RPC-функции.
-- Выполнять её смогут только авторизованные пользователи.
REVOKE ALL
ON FUNCTION public.change_task_status(
    UUID,
    public.task_status,
    TEXT
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.change_task_status(
    UUID,
    public.task_status,
    TEXT
)
TO authenticated;


-- Запрещаем клиентам напрямую изменять историю.
REVOKE INSERT, UPDATE, DELETE
ON public.task_status_history
FROM anon, authenticated;


-- Дополнительная защита истории.
-- Даже при ошибочно выданных правах UPDATE/DELETE
-- триггер не позволит изменить существующую историю.
CREATE FUNCTION private.protect_task_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'Task history is immutable'
        USING ERRCODE = '42501';
END;
$$;

REVOKE ALL
ON FUNCTION private.protect_task_history()
FROM PUBLIC, anon, authenticated;


CREATE TRIGGER trg_protect_task_history
BEFORE UPDATE OR DELETE
ON public.task_status_history
FOR EACH ROW
EXECUTE FUNCTION private.protect_task_history();
