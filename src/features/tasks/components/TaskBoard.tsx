import { useEffect, useState } from 'react';

import { getTaskHistory, getTasks } from '../api';
import { TaskForm } from './TaskForm';
import { TaskStatusActions } from './TaskStatusActions';

import type {
    Task,
    TaskBoardProps,
    TaskHistory,
} from '../types';

const statusLabels: Record<Task['status'], string> = {
    new: 'Новая',
    in_progress: 'В работе',
    on_review: 'На проверке',
    accepted: 'Принята',
    needs_revision: 'На доработке',
};

export function TaskBoard({
    role,
    currentUserId,
}: TaskBoardProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const [historyTaskId, setHistoryTaskId] = useState<string | null>(
        null,
    );
    const [history, setHistory] = useState<TaskHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(
        null,
    );

    const isManager = role === 'manager';

    // Первоначальная загрузка задач
    useEffect(() => {
        let active = true;

        getTasks().then(
            (data) => {
                if (!active) return;

                setTasks(data);
                setLoading(false);
            },
            (err: unknown) => {
                if (!active) return;

                setError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось загрузить задачи',
                );

                setLoading(false);
            },
        );

        return () => {
            active = false;
        };
    }, []);

  // Обновление списка после изменений
    async function refreshTasks() {
        setError(null);

        try {
            const data = await getTasks();
            setTasks(data);

            if (historyTaskId) {
                const updatedHistory = await getTaskHistory(historyTaskId);
                setHistory(updatedHistory);
            }
        } catch (err) {
            setError(
                err instanceof Error
                ? err.message
                : 'Не удалось обновить задачи',
        );

        throw err;
        }
    }

    async function handleSaved() {
        await refreshTasks();

        setIsCreating(false);
        setEditingTask(null);
    }

    function closeForm() {
        setIsCreating(false);
        setEditingTask(null);
    }

    async function toggleHistory(taskId: string) {
        if (historyTaskId === taskId) {
            setHistoryTaskId(null);
            setHistory([]);
            setHistoryError(null);
            return;
        }

        setHistoryTaskId(taskId);
        setHistory([]);
        setHistoryError(null);
        setHistoryLoading(true);

        try {
            const data = await getTaskHistory(taskId);

            setHistory(data);
        } catch (err) {
            setHistoryError(
                err instanceof Error
                ? err.message
                : 'Не удалось загрузить историю',
            );
        } finally {
            setHistoryLoading(false);
        }
    }

    return (
        <section>
        <h2>{isManager ? 'Все задачи' : 'Мои задачи'}</h2>

        {isManager && !isCreating && !editingTask && (
            <button
                type="button"
                onClick={() => setIsCreating(true)}
            >
                Создать задачу
            </button>
        )}

        {isManager && isCreating && (
            <TaskForm
                currentUserId={currentUserId}
                onSuccess={handleSaved}
                onCancel={closeForm}
            />
        )}

        {isManager && editingTask && (
            <TaskForm
                key={editingTask.id}
                task={editingTask}
                currentUserId={currentUserId}
                onSuccess={handleSaved}
                onCancel={closeForm}
            />
        )}

        {error && <p role="alert">{error}</p>}

        {loading ? (
            <p>Загрузка задач...</p>
        ) : tasks.length === 0 ? (
            <p>Доступных задач пока нет.</p>
        ) : (
            <ul>
            {tasks.map((task) => (
                <li key={task.id}>
                <article>
                    <h3>{task.title}</h3>

                    {task.description && (
                        <p>{task.description}</p>
                    )}

                    <p>
                        Статус: {statusLabels[task.status]}
                    </p>

                    <p>
                        Исполнитель: {task.assignee_id}
                    </p>

                    <p>
                        Создана:{' '}
                        {new Date(task.created_at).toLocaleString('ru-RU')}
                    </p>

                    {isManager && (
                        <button
                            type="button"
                            onClick={() => {
                            setIsCreating(false);
                            setEditingTask(task);
                            }}
                        >
                            Редактировать задачу
                        </button>
                    )}

                    <TaskStatusActions
                        task={task}
                        role={role}
                        currentUserId={currentUserId}
                        onStatusChanged={refreshTasks}
                    />

                    <button
                        type="button"
                        onClick={() => void toggleHistory(task.id)}
                    >
                        {historyTaskId === task.id
                            ? 'Скрыть историю'
                            : 'Показать историю'}
                    </button>

                    {historyTaskId === task.id && (
                        <section>
                            <h4>История изменений</h4>

                            {historyLoading && (
                                <p>Загрузка истории...</p>
                            )}

                            {historyError && (
                                <p role="alert">{historyError}</p>
                            )}

                            {!historyLoading &&
                                !historyError &&
                                history.length === 0 && (
                                    <p>История пока пуста.</p>
                            )}

                            {!historyLoading && !historyError && (
                                <ol>
                                    {history.map((entry) => (
                                    <li key={entry.id}>
                                        <p>
                                            {entry.from_status
                                                ? statusLabels[entry.from_status]
                                                : 'Создана'}
                                            {' → '}
                                            {statusLabels[entry.to_status]}
                                        </p>

                                        <p>
                                            Кто: {entry.changed_by}
                                        </p>

                                        <p>
                                            Когда:{' '}
                                            {new Date(
                                                entry.created_at,
                                            ).toLocaleString('ru-RU')}
                                        </p>

                                        {entry.comment && (
                                            <p>
                                                Комментарий: {entry.comment}
                                            </p>
                                        )}
                                    </li>
                                    ))}
                                </ol>
                            )}
                        </section>
                    )}
                </article>
                </li>
            ))}
            </ul>
        )}
        </section>
    );
}