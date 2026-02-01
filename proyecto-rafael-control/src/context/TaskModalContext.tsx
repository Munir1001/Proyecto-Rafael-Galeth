import { createContext, useContext, useState, type ReactNode } from 'react';

interface TaskModalContextType {
  isModalOpen: boolean;
  pendingTaskId: string | null;
  openTaskModal: (tareaId: string) => void;
  closeTaskModal: () => void;
  setTaskData: (task: any) => void;
  currentTask: any;
}

const TaskModalContext = createContext<TaskModalContextType | undefined>(undefined);

export function TaskModalProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState<any>(null);

  const openTaskModal = (tareaId: string) => {
    setPendingTaskId(tareaId);
    setIsModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setPendingTaskId(null);
    setCurrentTask(null);
  };

  const setTaskData = (task: any) => {
    setCurrentTask(task);
  };

  return (
    <TaskModalContext.Provider
      value={{
        isModalOpen,
        pendingTaskId,
        openTaskModal,
        closeTaskModal,
        setTaskData,
        currentTask
      }}
    >
      {children}
    </TaskModalContext.Provider>
  );
}

export function useTaskModal() {
  const context = useContext(TaskModalContext);
  if (context === undefined) {
    throw new Error('useTaskModal must be used within a TaskModalProvider');
  }
  return context;
}