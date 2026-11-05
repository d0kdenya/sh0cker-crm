import {
    Building2,
    ClipboardList,
    Layers3,
    ShieldCheck,
} from 'lucide-react';

import type { AppSection, SidebarProps } from './types';

export function Sidebar({
    activeSection,
    onSectionChange,
    role,
}: SidebarProps) {
    const items = [
        {
            id: 'objects' as AppSection,
            label: 'Объекты',
            icon: Building2,
        },
        {
            id: 'tasks' as AppSection,
            label: role === 'manager' ? 'Все задачи' : 'Мои задачи',
            icon: ClipboardList,
        },
    ];

    return (
        <aside className="crm-sidebar">
        <div className="crm-brand">
            <div className="crm-brand-icon">
            <Layers3 size={23} strokeWidth={2.2} />
            </div>

            <div>
            <strong>Sh0cker CRM</strong>
            <span>Construction workspace</span>
            </div>
        </div>

        <div className="crm-navigation-label">
            РАБОЧЕЕ ПРОСТРАНСТВО
        </div>

        <nav className="crm-navigation" aria-label="Основная навигация">
            {items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;

                return (
                    <button
                        key={item.id}
                        type="button"
                        className={`crm-nav-item ${active ? 'is-active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => onSectionChange(item.id)}
                    >
                    <Icon size={19} />
                    <span>{item.label}</span>
                    </button>
                );
            })}
        </nav>

        <div className="crm-sidebar-footer">
            <ShieldCheck size={17} />
            <span>Protected by Supabase RLS</span>
        </div>
        </aside>
    );
}