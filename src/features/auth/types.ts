export type UserRole = 'manager' | 'executor';

export interface Profile {
    id: string;
    role: UserRole;
}