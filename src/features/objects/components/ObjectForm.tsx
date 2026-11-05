import { useState, type FormEvent } from 'react';

import {
    createObject,
    updateObject,
} from '../api';
import type { ObjectFormProps } from '../types';

export function ObjectForm({
    object,
    onSuccess,
    onCancel,
}: ObjectFormProps) {
    const [name, setName] = useState(object?.name ?? '');
    const [address, setAddress] = useState(object?.address ?? '');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = Boolean(object);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmedName = name.trim();
        const trimmedAddress = address.trim();

        if (!trimmedName || !trimmedAddress) {
            setError('Название и адрес обязательны');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (object) {
                await updateObject(object.id, {
                    name: trimmedName,
                    address: trimmedAddress,
                });
            } else {
                await createObject({
                    name: trimmedName,
                    address: trimmedAddress,
                });
            }

            await onSuccess();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не удалось сохранить объект',
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section>
        <h2>
            {isEditing ? 'Редактирование объекта' : 'Новый объект'}
        </h2>

        <form onSubmit={(event) => void handleSubmit(event)}>
            <div>
            <label htmlFor="object-name">
                Название объекта
            </label>

            <input
                id="object-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={loading}
                required
            />
            </div>

            <div>
            <label htmlFor="object-address">
                Адрес объекта
            </label>

            <input
                id="object-address"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                disabled={loading}
                required
            />
            </div>

            {error && <p role="alert">{error}</p>}

            <div>
            <button type="submit" disabled={loading}>
                {loading
                    ? 'Сохранение...'
                    : isEditing
                        ? 'Сохранить изменения'
                        : 'Создать объект'}
            </button>

            <button
                type="button"
                onClick={onCancel}
                disabled={loading}
            >
                Отмена
            </button>
            </div>
        </form>
        </section>
    );
}