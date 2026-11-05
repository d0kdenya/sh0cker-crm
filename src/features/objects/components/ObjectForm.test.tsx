import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ObjectForm } from './ObjectForm';
import { createObject, updateObject } from '../api';

import type { ConstructionObject } from '../types';

vi.mock('../api', () => ({
    createObject: vi.fn(),
    updateObject: vi.fn(),
}));

const existingObject: ConstructionObject = {
    id: 'd9aab0a1-34c0-4eb0-9dbb-8a46ec8a11af',
    name: 'ЖК Северный',
    address: 'Нижний Новгород, ул. Ленина, 10',
    created_by: '07c0f812-375f-4d48-bdf5-ae8b03d93d20',
    created_at: '2026-11-05T12:00:00+00:00',
    updated_at: '2026-11-05T12:00:00+00:00',
    deleted_at: null,
};

describe('ObjectForm', () => {
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('отображает форму создания с пустыми полями', () => {
        render(
            <ObjectForm
                onSuccess={onSuccess}
                onCancel={onCancel}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Новый объект' }),
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText('Название объекта'),
        ).toHaveValue('');

        expect(
            screen.getByLabelText('Адрес объекта'),
        ).toHaveValue('');
    });

    it('не позволяет создавать объект из пробелов', async () => {
        render(
            <ObjectForm
                onSuccess={onSuccess}
                onCancel={onCancel}
            />,
        );

        fireEvent.change(screen.getByLabelText('Название объекта'), {
            target: { value: '   ' },
        });

        fireEvent.change(screen.getByLabelText('Адрес объекта'), {
            target: { value: '   ' },
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Создать объект' }),
        );

        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent('Название и адрес обязательны');

        expect(createObject).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it('создаёт объект с очищенными значениями', async () => {
        vi.mocked(createObject).mockResolvedValue(existingObject);

        render(
            <ObjectForm
                onSuccess={onSuccess}
                onCancel={onCancel}
            />,
        );

        fireEvent.change(screen.getByLabelText('Название объекта'), {
            target: { value: '  ЖК Северный  ' },
        });

        fireEvent.change(screen.getByLabelText('Адрес объекта'), {
            target: {
                value: '  Нижний Новгород, ул. Ленина, 10  ',
            },
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Создать объект' }),
        );

        await waitFor(() => {
            expect(createObject).toHaveBeenCalledExactlyOnceWith({
                name: 'ЖК Северный',
                address: 'Нижний Новгород, ул. Ленина, 10',
            });
        });

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledOnce();
        });

        expect(updateObject).not.toHaveBeenCalled();
    });

    it('редактирует существующий объект', async () => {
        const updatedObject = {
            ...existingObject,
            name: 'ЖК Северный — корпус 2',
        };

        vi.mocked(updateObject).mockResolvedValue(updatedObject);

        render(
            <ObjectForm
                object={existingObject}
                onSuccess={onSuccess}
                onCancel={onCancel}
            />,
        );

        expect(
            screen.getByRole('heading', {
                name: 'Редактирование объекта',
            }),
        ).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Название объекта'), {
            target: { value: 'ЖК Северный — корпус 2' },
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Сохранить изменения',
            }),
        );

        await waitFor(() => {
            expect(updateObject).toHaveBeenCalledExactlyOnceWith(
                existingObject.id,
                {
                name: 'ЖК Северный — корпус 2',
                address: existingObject.address,
                },
            );
        });

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledOnce();
        });

        expect(createObject).not.toHaveBeenCalled();
    });

    it('показывает ошибку при неудачном создании', async () => {
        vi.mocked(createObject).mockRejectedValue(
            new Error('Доступ запрещён'),
        );

        render(
            <ObjectForm
                onSuccess={onSuccess}
                onCancel={onCancel}
            />,
        );

        fireEvent.change(screen.getByLabelText('Название объекта'), {
            target: { value: 'Тестовый объект' },
        });

        fireEvent.change(screen.getByLabelText('Адрес объекта'), {
            target: { value: 'Тестовый адрес' },
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Создать объект' }),
        );

        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent('Доступ запрещён');

        expect(onSuccess).not.toHaveBeenCalled();

        expect(
            screen.getByRole('button', { name: 'Создать объект' }),
        ).toBeEnabled();
    });

    it('блокирует повторную отправку во время сохранения', async () => {
        let resolveRequest!: (value: ConstructionObject) => void;

        vi.mocked(createObject).mockImplementation(
            () =>
                new Promise<ConstructionObject>((resolve) => {
                    resolveRequest = resolve;
                }),
        );

        render(
            <ObjectForm
                onSuccess={onSuccess}
                onCancel={onCancel}
            />,
        );

        fireEvent.change(screen.getByLabelText('Название объекта'), {
            target: { value: 'Тестовый объект' },
        });

        fireEvent.change(screen.getByLabelText('Адрес объекта'), {
            target: { value: 'Тестовый адрес' },
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Создать объект' }),
        );

        const saveButton = screen.getByRole('button', {
            name: 'Сохранение...',
        });

        expect(saveButton).toBeDisabled();

        fireEvent.click(saveButton);

        expect(createObject).toHaveBeenCalledTimes(1);

        resolveRequest(existingObject);

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledOnce();
        });
    });

    it('вызывает отмену без сохранения', () => {
        render(
            <ObjectForm
                onSuccess={onSuccess}
                onCancel={onCancel}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Отмена' }),
        );

        expect(onCancel).toHaveBeenCalledOnce();
        expect(createObject).not.toHaveBeenCalled();
        expect(updateObject).not.toHaveBeenCalled();
    });
});