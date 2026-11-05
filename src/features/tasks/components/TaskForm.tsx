import { useEffect, useState, type FormEvent } from 'react';

import { getObjects } from '../../objects/api';
import { createTask, getExecutors, updateTask } from '../api';

import type { ConstructionObject } from '../../objects/types';
import type { Executor, TaskFormProps } from '../types';

export function TaskForm({
    task,
    currentUserId,
    onSuccess,
    onCancel,
}: TaskFormProps) {
    const [title, setTitle] = useState(task?.title ?? '');
    const [description, setDescription] = useState(
        task?.description ?? '',
    );
    const [objectId, setObjectId] = useState(task?.object_id ?? '');
    const [assigneeId, setAssigneeId] = useState(
        task?.assignee_id ?? '',
    );

    const [objects, setObjects] = useState<ConstructionObject[]>([]);
    const [executors, setExecutors] = useState<Executor[]>([]);

    const [loadingOptions, setLoadingOptions] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = Boolean(task);

    // Получаем доступные объекты и исполнителей.
    useEffect(() => {
        let active = true;

        Promise.all([getObjects(), getExecutors()]).then(
        ([objectsData, executorsData]) => {
            if (!active) {
                return;
            }

            setObjects(objectsData);
            setExecutors(executorsData);
            setLoadingOptions(false);
        },
        (err: unknown) => {
            if (!active) {
                return;
            }

            setError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось загрузить данные формы',
            );

            setLoadingOptions(false);
        },
        );

        return () => {
            active = false;
        };
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (saving) {
            return;
        }

        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();

        if (!trimmedTitle || !objectId || !assigneeId) {
            setError('Заполните обязательные поля');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const input = {
                title: trimmedTitle,
                description: trimmedDescription || null,
                object_id: objectId,
                assignee_id: assigneeId,
            };

            if (task) {
                await updateTask(task.id, input);
            } else {
                await createTask(input, currentUserId);
            }

            await onSuccess();
        } catch (err) {
            setError(
                err instanceof Error
                ? err.message
                : 'Не удалось сохранить задачу',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <section>
        <h3>
            {isEditing ? 'Редактирование задачи' : 'Новая задача'}
        </h3>

        {loadingOptions ? (
            <p>Загрузка данных формы...</p>
        ) : (
            <form onSubmit={(event) => void handleSubmit(event)}>
            <div>
                <label htmlFor="task-title">Название задачи</label>

                <input
                    id="task-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={saving}
                    required
                />
            </div>

            <div>
                <label htmlFor="task-description">Описание</label>

                <textarea
                    id="task-description"
                    value={description}
                    onChange={(event) =>
                        setDescription(event.target.value)
                    }
                    disabled={saving}
                />
            </div>

            <div>
                <label htmlFor="task-object">Строительный объект</label>

                <select
                    id="task-object"
                    value={objectId}
                    onChange={(event) => setObjectId(event.target.value)}
                    disabled={saving}
                    required
                >
                <option value="">Выберите объект</option>

                {objects.map((object) => (
                    <option key={object.id} value={object.id}>
                        {object.name}
                    </option>
                ))}
                </select>
            </div>

            <div>
                <label htmlFor="task-assignee">Исполнитель</label>

                <select
                    id="task-assignee"
                    value={assigneeId}
                    onChange={(event) => setAssigneeId(event.target.value)}
                    disabled={saving}
                    required
                >
                <option value="">Выберите исполнителя</option>

                {executors.map((executor) => (
                    <option key={executor.id} value={executor.id}>
                        {executor.full_name || executor.id}
                    </option>
                ))}
                </select>
            </div>

            {error && <p role="alert">{error}</p>}

            <div>
                <button type="submit" disabled={saving}>
                    {saving
                        ? 'Сохранение...'
                        : isEditing
                        ? 'Сохранить изменения'
                        : 'Создать задачу'}
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                >
                    Отмена
                </button>
            </div>
            </form>
        )}

        {loadingOptions && (
            <button type="button" onClick={onCancel}>
                Отмена
            </button>
        )}

        {!loadingOptions && error && objects.length === 0 && (
            <button type="button" onClick={onCancel}>
                Закрыть
            </button>
        )}
        </section>
    );
}