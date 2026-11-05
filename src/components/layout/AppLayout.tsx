
import { Sidebar } from './Sidebar';
import { Header } from './Header';

import type { AppLayoutProps } from './types';

export function AppLayout({
    children,
    activeSection,
    onSectionChange,
    onLogout,
    role,
    email,
}: AppLayoutProps) {
    return (
        <div className="crm-shell">
        <Sidebar
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            role={role}
        />

        <div className="crm-main">
            <Header
                activeSection={activeSection}
                onLogout={onLogout}
                role={role}
                email={email}
            />

            <main className="crm-content">
                {children}
            </main>
        </div>
        </div>
    );
}
