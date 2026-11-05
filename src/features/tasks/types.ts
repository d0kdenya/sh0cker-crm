import type { Database } from '../../types/database';
import type { UserRole } from '../auth/types';

export type TaskStatus =
    Database['public']['Enums']['task_status'];

export type Task =
    Database['public']['Tables']['tasks']['Row'];

export type TaskListItem = Pick<
    Task,
    'id' | 'title' | 'status' | 'assignee_id' | 'object_id'
>;

export type TaskHistory =
    Database['public']['Tables']['task_status_history']['Row'];

export type CreateTaskInput = Pick<
    Database['public']['Tables']['tasks']['Insert'],
    'title' | 'description' | 'object_id' | 'assignee_id'
>;

export type UpdateTaskInput = Pick<
    Database['public']['Tables']['tasks']['Update'],
    'title' | 'description' | 'object_id' | 'assignee_id'
>;

export interface ChangeTaskStatusInput {
    taskId: string;
    newStatus: TaskStatus;
    comment?: string;
}

export interface TaskStatusActionsProps {
    task: TaskListItem;
    role: UserRole;
    currentUserId: string;
    onStatusChanged: () => void | Promise<void>;
}
export interface StatusAction {
    label: string;
    status: TaskStatus;
    requiresComment?: boolean;
}