import { supabase } from '../../lib/supabase';

export async function testObjectPermissions() {
    const { data: userData, error: userError } = 
    await supabase.auth.getUser();

    if (userError || !userData.user) {
        console.error('Пользователь не авторизован', userError);
        return;
    }

    const userId = userData.user.id;

    console.log('Проверка пользователя:', userData.user.email);

  // Проверка INSERT
    const { data: created, error: insertError } = await supabase
        .from('objects')
        .insert({
            name: 'Тестовый объект RLS',
            address: 'Тестовый адрес RLS',
            created_by: userId,
        })
        .select('id, name, address, created_by')
        .single();

    console.log('INSERT:', { created, insertError });

    if (!created) {
        return;
    }

  // Проверка UPDATE
    const { data: updated, error: updateError } = await supabase
        .from('objects')
        .update({ name: 'Объект после UPDATE' })
        .eq('id', created.id)
        .select('id, name, updated_at')
        .single();

    console.log('UPDATE:', { updated, updateError });

  // Проверка изменения защищённого поля
    const { error: authorError } = await supabase
        .from('objects')
        .update({ created_by: userId })
        .eq('id', created.id);

    console.log('Изменение created_by:', authorError);

  // Попытка удаления
    const { error: deleteError } = await supabase
        .from('objects')
        .delete()
        .eq('id', created.id);

    console.log('DELETE:', deleteError);
}
