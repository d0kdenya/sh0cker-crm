
-- Разрешаем авторизованным пользователям создавать объекты,
-- но только с указанными полями.
-- RLS дополнительно проверит роль пользователя.
GRANT INSERT (name, address, created_by)
ON public.objects
TO authenticated;

-- Разрешаем изменять только название и адрес объекта.
-- Автор, ID и системные даты недоступны для прямого UPDATE.
GRANT UPDATE (name, address)
ON public.objects
TO authenticated;


-- Создание объекта:
-- только постановщик и только от собственного имени.
CREATE POLICY objects_insert_policy
ON public.objects
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_manager())
    AND created_by = (SELECT auth.uid())
);


-- Редактирование объекта:
-- только постановщик.
CREATE POLICY objects_update_policy
ON public.objects
FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_manager())
)
WITH CHECK (
    (SELECT private.is_manager())
);


-- Автоматически обновляем updated_at при изменении объекта.
CREATE FUNCTION private.set_object_updated_at()
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
ON FUNCTION private.set_object_updated_at()
FROM PUBLIC, anon, authenticated;


-- Привязываем функцию к обновлению объекта.
CREATE TRIGGER trg_objects_updated_at
BEFORE UPDATE ON public.objects
FOR EACH ROW
EXECUTE FUNCTION private.set_object_updated_at();
