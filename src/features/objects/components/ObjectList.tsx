import { useEffect, useState } from 'react';

import {
    archiveObject,
    getObjects,
} from '../api';

import type {
    ConstructionObject,
    ObjectListProps,
} from '../types';

import { ObjectForm } from './ObjectForm';

export function ObjectList({
    isManager,
    onObjectArchived,
}: ObjectListProps) {
    const [objects, setObjects] = useState<ConstructionObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [editingObject, setEditingObject] =
        useState<ConstructionObject | null>(null);

    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        getObjects().then(
            (data) => {
                if (!active) {
                    return;
                }

                setObjects(data);
                setLoading(false);
            },
            (err: unknown) => {
                if (!active) {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Не удалось загрузить объекты',
                );

                setLoading(false);
            },
        );

        return () => {
            active = false;
        };
    }, []);

    async function refreshObjects() {
        setLoading(true);
        setError(null);

        try {
            const data = await getObjects();
            setObjects(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось обновить объекты',
            );
            throw err;
        } finally {
            setLoading(false);
        }
    }

    async function handleSaved() {
        await refreshObjects();

        setIsCreating(false);
        setEditingObject(null);
    }

    function handleCancel() {
        setIsCreating(false);
        setEditingObject(null);
    }

    async function handleArchive(object: ConstructionObject) {
        const confirmed = window.confirm(
            `Удалить объект «${object.name}» и все его задачи?\n\n` +
            'Записи будут скрыты, но история сохранится.',
        );

        if (!confirmed) {
            return;
        }

        setDeletingId(object.id);
        setError(null);

        try {
            await archiveObject(object.id);
            onObjectArchived?.();

            setObjects((previous) =>
                previous.filter((item) => item.id !== object.id),
            );

            handleCancel();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось удалить объект',
            );
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <section>
        <h2>Строительные объекты</h2>

        {isManager && !isCreating && !editingObject && (
            <button
                type="button"
                onClick={() => setIsCreating(true)}
            >
                Создать объект
            </button>
        )}

        {isCreating && (
            <ObjectForm
                onSuccess={handleSaved}
                onCancel={handleCancel}
            />
        )}

        {editingObject && (
            <ObjectForm
                key={editingObject.id}
                object={editingObject}
                onSuccess={handleSaved}
                onCancel={handleCancel}
            />
        )}

        {error && <p role="alert">{error}</p>}

        {loading ? (
            <p>Загрузка объектов...</p>
        ) : objects.length === 0 ? (
            <p>Доступных объектов пока нет.</p>
        ) : (
            <ul>
            {objects.map((object) => (
                <li key={object.id}>
                <article>
                    <h3>{object.name}</h3>
                    <p>Адрес: {object.address}</p>

                    {isManager && (
                    <div>
                        <button
                            type="button"
                            disabled={deletingId !== null}
                            onClick={() => {
                                setIsCreating(false);
                                setEditingObject(object);
                            }}
                        >
                            Редактировать
                        </button>

                        {' '}

                        <button
                            type="button"
                            disabled={deletingId !== null}
                            onClick={() => void handleArchive(object)}
                        >
                        {deletingId === object.id
                            ? 'Удаление...'
                            : 'Удалить объект'}
                        </button>
                    </div>
                    )}
                </article>
                </li>
            ))}
            </ul>
        )}
        </section>
    );
}
