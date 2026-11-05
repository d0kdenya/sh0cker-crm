
import type { Database } from '../../types/database';

export type ConstructionObject =
    Database['public']['Tables']['objects']['Row'];

export type CreateObjectInput = Pick<
    Database['public']['Tables']['objects']['Insert'],
    'name' | 'address'
>;

export type UpdateObjectInput = Pick<
    Database['public']['Tables']['objects']['Update'],
    'name' | 'address'
>;

export interface ObjectFormProps {
    object?: ConstructionObject | null;
    onSuccess: () => void | Promise<void>;
    onCancel: () => void;
}

export interface ObjectListProps {
    isManager: boolean;
}
