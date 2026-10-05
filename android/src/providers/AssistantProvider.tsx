import { createContext, useContext, type ReactNode } from 'react';
import { useAssistantState } from '../hooks/useAssistantState';
import { useDriveBackup } from '../hooks/useDriveBackup';
import { useNotificationAccess } from '../hooks/useNotificationAccess';
type AssistantContextValue = ReturnType<typeof useAssistantState> & { drive: ReturnType<typeof useDriveBackup>; notifications: ReturnType<typeof useNotificationAccess> };
const AssistantContext = createContext<AssistantContextValue | null>(null);
export function AssistantProvider({ children }: {
    children: ReactNode;
}) {
    const assistant = useAssistantState();
    const drive = useDriveBackup(assistant.ready);
    const notifications = useNotificationAccess(assistant.ready, assistant.tamil, assistant.importMessages);
    return <AssistantContext.Provider value={{ ...assistant, drive, notifications }}>{children}</AssistantContext.Provider>;
}
export function useAssistant() {
    const assistant = useContext(AssistantContext);
    if (!assistant)
        throw new Error('useAssistant must be used inside AssistantProvider');
    return assistant;
}
