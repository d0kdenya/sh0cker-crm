
import { useState } from 'react';

import { changeTaskStatus } from '../api';

import type {
    StatusAction,
    TaskStatusActionsProps,
} from '../types';

export function TaskStatusActions({
    task,
    role,
    currentUserId,
    onStatusChanged,
}: TaskStatusActionsProps) {
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isAssignee = task.assignee_id === currentUserId;

    const actions: StatusAction[] = [];

    if (role === 'executor' && isAssignee) {
        if (task.status === 'new') {
            actions.push({
                label: 'Взять в работу',
                status: 'in_progress',
            });
        }

        if (task.status === 'in_progress') {
            actions.push({
                label: 'Отправить на проверку',
                status: 'on_review',
            });
        }

        if (task.status === 'needs_revision') {
            actions.push({
                label: 'Возобновить работу',
                status: 'in_progress',
            });
        }
    }

    if (role === 'manager' && task.status === 'on_review') {
        actions.push(
            {
                label: 'Принять задачу',
                status: 'accepted',
            },
            {
                label: 'Вернуть на доработку',
                status: 'needs_revision',
                requiresComment: true,
            },
        );
    }

    async function handleAction(action: StatusAction) {
        const trimmedComment = comment.trim();

        if (action.requiresComment && !trimmedComment) {
            setError('Для возврата на доработку нужен комментарий');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await changeTaskStatus(
                task.id,
                action.status,
                action.requiresComment ? trimmedComment : undefined,
            );

            setComment('');
            await onStatusChanged();
        } catch (err) {
            setError(
                err instanceof Error
                ? err.message
                : 'Не удалось изменить статус задачи',
            );
        } finally {
            setLoading(false);
        }
    }

    if (actions.length === 0) {
        return null;
    }

    return (
        <div>
        {actions.some((action) => action.requiresComment) && (
            <div>
            <label htmlFor={`comment-${task.id}`}>
                Комментарий для доработки
            </label>

            <textarea
                id={`comment-${task.id}`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                disabled={loading}
            />
            </div>
        )}

        {actions.map((action) => (
            <button
                key={action.status}
                type="button"
                disabled={loading}
                onClick={() => void handleAction(action)}
            >
                {loading ? 'Сохранение...' : action.label}
            </button>
        ))}

        {error && <p role="alert">{error}</p>}
        </div>
    );
}
