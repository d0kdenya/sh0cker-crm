import type { ReactNode } from 'react';
import type { UserRole } from '../../features/auth/types';

export type AppSection = 'objects' | 'tasks';

export interface AppLayoutProps {
    children: ReactNode;
    activeSection: AppSection;
    onSectionChange: (section: AppSection) => void;
    onLogout: () => void | Promise<void>;
    role: UserRole;
    email: string;
}

export interface SidebarProps {
    activeSection: AppSection;
    onSectionChange: (section: AppSection) => void;
    role: UserRole;
}

export interface HeaderProps {
    activeSection: AppSection;
    onLogout: () => void | Promise<void>;
    role: UserRole;
    email: string;
}