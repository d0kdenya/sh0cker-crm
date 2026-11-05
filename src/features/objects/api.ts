import { supabase } from '../../lib/supabase';
import type { CreateObjectInput, UpdateObjectInput } from './types';

export async function getObjects() {
    const { data, error } = await supabase
        .from('objects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return data;
}

export async function createObject(input: CreateObjectInput) {
    const { data: userData, error: userError } =
        await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    const user = userData.user;

    if (!user) {
        throw new Error('Пользователь не авторизован');
    }

    const { data, error } = await supabase
        .from('objects')
        .insert({
            ...input,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function updateObject(
    id: string,
    input: UpdateObjectInput,
) {
    const { data, error } = await supabase
        .from('objects')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}