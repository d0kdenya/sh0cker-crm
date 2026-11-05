export type TaskStatus =
    | 'new'
    | 'in_progress'
    | 'on_review'
    | 'accepted'
    | 'needs_revision';

export interface Task {
    id: string;
    title: string;
    status: TaskStatus;
    assignee_id: string;
    object_id: string;
}