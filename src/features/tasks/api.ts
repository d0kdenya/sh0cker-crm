import { supabase } from '../../lib/supabase';

import type {
    CreateTaskInput,
    TaskStatus,
    UpdateTaskInput,
} from './types';

// Получение доступных задач
export async function getTasks() {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return data;
}

// Получение списка исполнителей
export async function getExecutors() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'executor')
        .order('created_at');

    if (error) {
        throw error;
    }

    return data;
}

// Создание задачи постановщиком
export async function createTask(
    input: CreateTaskInput,
    authorId: string,
) {
    const { data, error } = await supabase
        .from('tasks')
        .insert({
            title: input.title,
            description: input.description,
            object_id: input.object_id,
            assignee_id: input.assignee_id,
            author_id: authorId,
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

// Редактирование бизнес-полей задачи
export async function updateTask(
    taskId: string,
    input: UpdateTaskInput,
) {
    const { data, error } = await supabase
        .from('tasks')
        .update({
            title: input.title,
            description: input.description,
            object_id: input.object_id,
            assignee_id: input.assignee_id,
        })
        .eq('id', taskId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

// Безопасная смена статуса
export async function changeTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    comment?: string,
) {
    const { data, error } = await supabase.rpc(
        'change_task_status',
        {
            p_task_id: taskId,
            p_new_status: newStatus,
            ...(comment !== undefined ? { p_comment: comment } : {}),
        },
    );

    if (error) {
        throw error;
    }

    return data;
}

// Получение истории изменений задачи
export async function getTaskHistory(taskId: string) {
    const { data, error } = await supabase
        .from('task_status_history')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        throw error;
    }

    return data;
}
