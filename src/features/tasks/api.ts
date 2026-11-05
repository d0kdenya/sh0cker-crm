
import { supabase } from '../../lib/supabase';

import type {
    TaskStatus,
} from './types';

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
