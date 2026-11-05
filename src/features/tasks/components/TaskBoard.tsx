import { useEffect, useState } from 'react';
import {
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock3,
    FileClock,
    FolderKanban,
    Pencil,
    Plus,
    Trash2,
    UserRound,
} from 'lucide-react';

import { supabase } from '../../../lib/supabase';
import { getObjects } from '../../objects/api';
import {
    archiveTask,
    getExecutors,
    getTaskHistory,
    getTasks,
} from '../api';

import { TaskForm } from './TaskForm';
import { TaskStatusActions } from './TaskStatusActions';

import type { ConstructionObject } from '../../objects/types';
import type {
    Executor,
    Task,
    TaskBoardProps,
    TaskHistory,
    TaskStatus,
} from '../types';

import './TaskBoard.css';

const statusLabels: Record<TaskStatus, string> = {
    new: 'Новая',
    in_progress: 'В работе',
    on_review: 'На проверке',
    accepted: 'Принята',
    needs_revision: 'На доработке',
};

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function TaskBoard({
    role,
    currentUserId,
}: TaskBoardProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [executors, setExecutors] = useState<Executor[]>([]);
    const [objects, setObjects] = useState<ConstructionObject[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [historyTaskId, setHistoryTaskId] = useState<string | null>(
        null,
    );
    const [history, setHistory] = useState<TaskHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(
        null,
    );

    const isManager = role === 'manager';

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const [tasksData, objectsData, executorsData] =
                await Promise.all([
                    getTasks(),
                    getObjects(),
                    isManager
                        ? getExecutors()
                        : supabase
                            .from('profiles')
                            .select('id, full_name')
                            .eq('id', currentUserId)
                            .then(({ data, error: profileError }) => {
                                if (profileError) {
                                    throw profileError;
                                }
                                return data;
                            }),
                ]);

                if (!active) {
                    return
                }

                setTasks(tasksData);
                setObjects(objectsData);
                setExecutors(executorsData);
            } catch (err) {
                if (!active) {
                    return
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Не удалось загрузить задачи',
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            active = false;
        };
    }, [currentUserId, isManager]);

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

    async function handleArchive(task: Task) {
        const confirmed = window.confirm(
            `Удалить задачу «${task.title}»?\n\n` +
            'Задача исчезнет из CRM, но история сохранится.',
        );

        if (!confirmed) {
            return
        }

        setDeletingId(task.id);
        setError(null);

        try {
            await archiveTask(task.id);

            setTasks((previous) =>
                previous.filter((item) => item.id !== task.id),
            );

            if (historyTaskId === task.id) {
                setHistoryTaskId(null);
                setHistory([]);
            }

            if (editingTask?.id === task.id) {
                setEditingTask(null);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось удалить задачу',
            );
        } finally {
            setDeletingId(null);
        }
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

    const executorNames = new Map(
        executors.map((executor) => [
            executor.id,
            executor.full_name?.trim() || 'Исполнитель',
        ]),
    );

    const objectNames = new Map(
        objects.map((object) => [object.id, object.name]),
    );

    const totalTasks = tasks.length;
    const inProgressTasks = tasks.filter(
        (task) => task.status === 'in_progress',
    ).length;
    const reviewTasks = tasks.filter(
        (task) => task.status === 'on_review',
    ).length;
    const acceptedTasks = tasks.filter(
        (task) => task.status === 'accepted',
    ).length;

    return (
        <section className="task-board">
        <div className="task-board-toolbar">
            <div className="task-board-intro">
            <h2>
                {isManager ? 'Все задачи' : 'Мои задачи'}
            </h2>
            <p>
                {isManager
                ? 'Контролируйте выполнение работ на объектах'
                : 'Отслеживайте назначенные вам задачи'}
            </p>
            </div>

            {isManager && !isCreating && !editingTask && (
            <button
                className="task-board-create"
                type="button"
                onClick={() => setIsCreating(true)}
            >
                <Plus size={17} />
                Создать задачу
            </button>
            )}
        </div>

        <div className="task-board-stats">
            <div className="task-stat">
            <span className="task-stat-icon task-stat-all">
                <ClipboardList size={21} />
            </span>
            <div>
                <strong>{totalTasks}</strong>
                <span>Всего задач</span>
            </div>
            </div>

            <div className="task-stat">
            <span className="task-stat-icon task-stat-progress">
                <Clock3 size={21} />
            </span>
            <div>
                <strong>{inProgressTasks}</strong>
                <span>В работе</span>
            </div>
            </div>

            <div className="task-stat">
            <span className="task-stat-icon task-stat-review">
                <FileClock size={21} />
            </span>
            <div>
                <strong>{reviewTasks}</strong>
                <span>На проверке</span>
            </div>
            </div>

            <div className="task-stat">
            <span className="task-stat-icon task-stat-done">
                <CheckCircle2 size={21} />
            </span>
            <div>
                <strong>{acceptedTasks}</strong>
                <span>Принято</span>
            </div>
            </div>
        </div>

        {isManager && isCreating && (
            <div className="task-board-editor">
            <TaskForm
                currentUserId={currentUserId}
                onSuccess={handleSaved}
                onCancel={closeForm}
            />
            </div>
        )}

        {isManager && editingTask && (
            <div className="task-board-editor">
            <TaskForm
                key={editingTask.id}
                task={editingTask}
                currentUserId={currentUserId}
                onSuccess={handleSaved}
                onCancel={closeForm}
            />
            </div>
        )}

        {error && <p role="alert">{error}</p>}

        {loading ? (
            <div className="task-board-empty">
            <ClipboardList size={26} />
            <p>Загрузка задач...</p>
            </div>
        ) : tasks.length === 0 ? (
            <div className="task-board-empty">
            <ClipboardList size={26} />
            <h3>Задач пока нет</h3>
            <p>
                {isManager
                ? 'Создайте первую задачу для строительного объекта'
                : 'Новые задачи появятся здесь после назначения'}
            </p>
            </div>
        ) : (
            <ul className="task-board-grid">
            {tasks.map((task) => (
                <li key={task.id}>
                <article className="task-card">
                    <div className="task-card-top">
                    <span
                        className="task-status-badge"
                        data-status={task.status}
                    >
                        <span className="task-status-dot" />
                        {statusLabels[task.status]}
                    </span>

                    <span className="task-card-date">
                        <CalendarDays size={14} />
                        {formatDate(task.created_at)}
                    </span>
                    </div>

                    <div className="task-card-body">
                    <h3>{task.title}</h3>

                    <p className="task-card-description">
                        {task.description || 'Описание не указано'}
                    </p>
                    </div>

                    <div className="task-card-meta">
                    <div className="task-card-meta-row">
                        <span className="task-card-meta-icon">
                        <FolderKanban size={17} />
                        </span>

                        <div>
                        <small>Объект</small>
                        <strong>
                            {objectNames.get(task.object_id) ||
                            'Строительный объект'}
                        </strong>
                        </div>
                    </div>

                    <div className="task-card-meta-row">
                        <span className="task-card-meta-icon">
                        <UserRound size={17} />
                        </span>

                        <div>
                        <small>Исполнитель</small>
                        <strong>
                            {executorNames.get(task.assignee_id) ||
                            (task.assignee_id === currentUserId
                                ? 'Вы'
                                : 'Исполнитель')}
                        </strong>
                        </div>
                    </div>
                    </div>

                    <div className="task-card-footer">
                    <TaskStatusActions
                        task={task}
                        role={role}
                        currentUserId={currentUserId}
                        onStatusChanged={refreshTasks}
                    />

                    <div className="task-card-actions">
                        <button
                        className="task-action-history"
                        type="button"
                        onClick={() => void toggleHistory(task.id)}
                        >
                        <FileClock size={16} />
                        {historyTaskId === task.id
                            ? 'Скрыть историю'
                            : 'История'}
                        </button>

                        {isManager && (
                        <>
                            <button
                            className="task-action-edit"
                            type="button"
                            disabled={deletingId !== null}
                            onClick={() => {
                                setIsCreating(false);
                                setEditingTask(task);
                            }}
                            >
                            <Pencil size={15} />
                            Редактировать
                            </button>

                            <button
                            className="task-action-delete"
                            type="button"
                            disabled={deletingId !== null}
                            onClick={() => void handleArchive(task)}
                            >
                            <Trash2 size={15} />
                            {deletingId === task.id
                                ? 'Удаление...'
                                : 'Удалить'}
                            </button>
                        </>
                        )}
                    </div>
                    </div>

                    {historyTaskId === task.id && (
                    <section className="task-history">
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
                        <ol className="task-history-list">
                            {history.map((entry) => (
                            <li key={entry.id}>
                                <span className="task-history-marker" />

                                <div className="task-history-content">
                                <strong>
                                    {entry.from_status
                                    ? statusLabels[
                                        entry.from_status
                                        ]
                                    : 'Создана'}
                                    {' → '}
                                    {statusLabels[entry.to_status]}
                                </strong>

                                <small>
                                    {formatDateTime(entry.created_at)}
                                </small>

                                {entry.comment && (
                                    <p>{entry.comment}</p>
                                )}
                                </div>
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
