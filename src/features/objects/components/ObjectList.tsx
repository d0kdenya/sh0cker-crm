import { useEffect, useMemo, useState } from 'react';
import {
    Building2,
    CheckCircle2,
    ClipboardList,
    FolderKanban,
    MapPin,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';

import { archiveObject, getObjects } from '../api';
import { getTasks } from '../../tasks/api';

import { ObjectForm } from './ObjectForm';

import type {
    ConstructionObject,
    ObjectListProps,
} from '../types';

import type { Task } from '../../tasks/types';

import './ObjectList.css';

interface ObjectStats {
    total: number;
    completed: number;
    inProgress: number;
}

function getObjectStats(
    tasks: Task[],
    objectId: string,
): ObjectStats {
    const relatedTasks = tasks.filter(
        (task) => task.object_id === objectId,
    );

    return {
        total: relatedTasks.length,
        completed: relatedTasks.filter(
            (task) => task.status === 'accepted',
        ).length,
        inProgress: relatedTasks.filter(
        (task) =>
            task.status === 'in_progress' ||
            task.status === 'on_review' ||
            task.status === 'needs_revision',
        ).length,
    };
}

export function ObjectList({
    isManager,
    onObjectArchived,
}: ObjectListProps) {
    const [objects, setObjects] = useState<ConstructionObject[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [editingObject, setEditingObject] =
        useState<ConstructionObject | null>(null);

    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                const [objectsData, tasksData] = await Promise.all([
                getObjects(),
                getTasks(),
                ]);

                if (!active) {
                    return;
                }

                setObjects(objectsData);
                setTasks(tasksData);
                setError(null);
            } catch (err) {
                if (!active)  {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Не удалось загрузить объекты',
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadData();

        return () => {
            active = false;
        };
    }, []);

    const summary = useMemo(() => {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
            (task) => task.status === 'accepted',
        ).length;

        return {
            objects: objects.length,
            tasks: totalTasks,
            completed: completedTasks,
            completionRate:
                totalTasks > 0
                ? Math.round(
                    (completedTasks / totalTasks) * 100,
                    )
                : 0,
        };
    }, [objects, tasks]);

    async function refreshData() {
        setError(null);

        try {
            const [objectsData, tasksData] = await Promise.all([
                getObjects(),
                getTasks(),
            ]);

            setObjects(objectsData);
            setTasks(tasksData);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось обновить данные',
            );

        throw err;
        }
    }

    async function handleSaved() {
        await refreshData();

        setIsCreating(false);
        setEditingObject(null);
    }

    function handleCancel() {
        setIsCreating(false);
        setEditingObject(null);
    }

    async function handleArchive(object: ConstructionObject) {
        if (deletingId)  {
            return;
        }

        const confirmed = window.confirm(
            `Архивировать объект «${object.name}» и все его задачи?\n\n` +
            'Объект исчезнет из активного списка, но история задач сохранится.',
        );

        if (!confirmed) {
            return;
        }

        setDeletingId(object.id);
        setError(null);

        try {
            await archiveObject(object.id);

            setObjects((previous) =>
                previous.filter((item) => item.id !== object.id),
            );

            setTasks((previous) =>
                previous.filter(
                (task) => task.object_id !== object.id,
                ),
            );

            if (editingObject?.id === object.id) {
                setEditingObject(null);
            }

            onObjectArchived?.();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось архивировать объект',
            );
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <section className="object-board">
        <div className="object-board-toolbar">
            <div className="object-board-intro">
            <h2>
                {isManager
                ? 'Строительные объекты'
                : 'Доступные объекты'}
            </h2>

            <p>
                {isManager
                ? 'Контролируйте строительные проекты и выполнение задач'
                : 'Объекты, к которым относятся ваши задачи'}
            </p>
            </div>

            {isManager && !isCreating && !editingObject && (
            <button
                className="object-board-create"
                type="button"
                onClick={() => setIsCreating(true)}
            >
                <Plus size={17} />
                Создать объект
            </button>
            )}
        </div>

        {!loading && !error && (
            <div className="object-board-stats">
            <div className="object-stat">
                <span className="object-stat-icon object-stat-purple">
                <Building2 size={21} />
                </span>

                <div>
                <strong>{summary.objects}</strong>
                <span>Объектов</span>
                </div>
            </div>

            <div className="object-stat">
                <span className="object-stat-icon object-stat-blue">
                <ClipboardList size={21} />
                </span>

                <div>
                <strong>{summary.tasks}</strong>
                <span>
                    {isManager ? 'Всего задач' : 'Моих задач'}
                </span>
                </div>
            </div>

            <div className="object-stat">
                <span className="object-stat-icon object-stat-green">
                <CheckCircle2 size={21} />
                </span>

                <div>
                <strong>{summary.completed}</strong>
                <span>Принято задач</span>
                </div>
            </div>

            <div className="object-stat">
                <span className="object-stat-icon object-stat-orange">
                <FolderKanban size={21} />
                </span>

                <div>
                <strong>{summary.completionRate}%</strong>
                <span>Выполнение задач</span>
                </div>
            </div>
            </div>
        )}

        {isManager && (isCreating || editingObject) && (
            <div className="object-board-editor">
            <div className="object-board-editor-heading">
                <h3>
                {editingObject
                    ? 'Редактирование объекта'
                    : 'Новый строительный объект'}
                </h3>

                <p>
                {editingObject
                    ? 'Измените название или адрес строительного объекта'
                    : 'Укажите основные данные объекта'}
                </p>
            </div>

            <ObjectForm
                key={editingObject?.id ?? 'new'}
                object={editingObject}
                onSuccess={handleSaved}
                onCancel={handleCancel}
            />
            </div>
        )}

        {error && (
            <p role="alert">{error}</p>
        )}

        {loading ? (
            <div className="object-board-empty">
            <Building2 size={30} />
            <p>Загрузка объектов...</p>
            </div>
        ) : objects.length === 0 ? (
            <div className="object-board-empty">
            <Building2 size={30} />
            <h3>Объектов пока нет</h3>

            <p>
                {isManager
                ? 'Создайте первый строительный объект'
                : 'Здесь появятся объекты с назначенными вам задачами'}
            </p>
            </div>
        ) : (
            <ul className="object-board-grid">
            {objects.map((object) => {
                const stats = getObjectStats(
                tasks,
                object.id,
                );

                const completionRate =
                stats.total > 0
                    ? Math.round(
                        (stats.completed / stats.total) * 100,
                    )
                    : 0;

                return (
                <li key={object.id}>
                    <article className="object-card">
                    <div className="object-card-header">
                        <div className="object-card-icon">
                        <Building2 size={25} />
                        </div>

                        <span className="object-card-status">
                        <span className="object-card-status-dot" />
                        Активный
                        </span>
                    </div>

                    <div className="object-card-content">
                        <h3>{object.name}</h3>

                        <div className="object-card-address">
                        <MapPin size={17} />

                        <span>
                            {object.address || 'Адрес не указан'}
                        </span>
                        </div>
                    </div>

                    <div className="object-card-metrics">
                        <div className="object-card-metric">
                        <span>Задачи</span>
                        <strong>{stats.total}</strong>
                        </div>

                        <div className="object-card-metric">
                        <span>В работе</span>
                        <strong>{stats.inProgress}</strong>
                        </div>

                        <div className="object-card-metric">
                        <span>Принято</span>
                        <strong className="object-card-completed">
                            {stats.completed}
                        </strong>
                        </div>
                    </div>

                    <div className="object-card-progress">
                        <div className="object-card-progress-heading">
                        <span>Выполнение задач</span>
                        <strong>{completionRate}%</strong>
                        </div>

                        <div
                        className="object-card-progress-track"
                        role="progressbar"
                        aria-label={`Выполнение задач объекта ${object.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={completionRate}
                        >
                        <div
                            className="object-card-progress-fill"
                            style={{
                            width: `${completionRate}%`,
                            }}
                        />
                        </div>
                    </div>

                    {isManager && (
                        <div className="object-card-actions">
                        <button
                            className="object-card-edit"
                            type="button"
                            disabled={deletingId !== null}
                            onClick={() => {
                            setIsCreating(false);
                            setEditingObject(object);
                            }}
                        >
                            <Pencil size={15} />
                            Редактировать
                        </button>

                        <button
                            className="object-card-delete"
                            type="button"
                            disabled={deletingId !== null}
                            onClick={() => void handleArchive(object)}
                        >
                            <Trash2 size={15} />

                            {deletingId === object.id
                            ? 'Архивирование...'
                            : 'Архивировать'}
                        </button>
                        </div>
                    )}
                    </article>
                </li>
                );
            })}
            </ul>
        )}
        </section>
    );
}