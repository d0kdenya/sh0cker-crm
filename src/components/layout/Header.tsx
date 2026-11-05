import {
    Building2,
    ClipboardList,
    LogOut,
    UserRound,
} from 'lucide-react';

import type { HeaderProps } from './types';

export function Header({
    activeSection,
    onLogout,
    role,
    email,
}: HeaderProps) {
    const isObjects = activeSection === 'objects';

    const title = isObjects
        ? 'Строительные объекты'
        : role === 'manager'
        ? 'Управление задачами'
        : 'Мои задачи';

    const description = isObjects
        ? 'Управление строительными проектами'
        : role === 'manager'
        ? 'Контроль выполнения и назначение задач'
        : 'Ваши текущие задачи и рабочие процессы';

    const Icon = isObjects ? Building2 : ClipboardList;

    return (
        <header className="crm-header">
        <div className="crm-header-heading">
            <div className="crm-header-page-icon">
            <Icon size={21} />
            </div>

            <div>
            <h1>{title}</h1>
            <p>{description}</p>
            </div>
        </div>

        <div className="crm-header-actions">
            <div className="crm-user">
            <span className="crm-user-avatar">
                <UserRound size={20} />
            </span>

            <div className="crm-user-details">
                <strong>{email}</strong>
                <span>
                    {role === 'manager' ? 'Постановщик' : 'Исполнитель'}
                </span>
            </div>
            </div>

            <button
                className="crm-logout"
                type="button"
                title="Выйти"
                aria-label="Выйти из аккаунта"
                onClick={() => void onLogout()}
            >
            <LogOut size={19} />
            </button>
        </div>
        </header>
    );
}
