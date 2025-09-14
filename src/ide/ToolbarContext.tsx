import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ToolbarState {
  fontSize: string;
}

interface ToolbarContextType {
  toolbarState: ToolbarState;
  setToolbarState: React.Dispatch<React.SetStateAction<ToolbarState>>;
}

const ToolbarContext = createContext<ToolbarContextType | undefined>(undefined);

export function ToolbarProvider({ children }: { children: ReactNode }) {
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    fontSize: '16px',
  });

  return (
    <ToolbarContext.Provider value={{ toolbarState, setToolbarState }}>
      {children}
    </ToolbarContext.Provider>
  );
}

export function useToolbarState() {
  const context = useContext(ToolbarContext);
  if (context === undefined) {
    // Return a default value when context is not available
    return {
      toolbarState: { fontSize: '16px' },
      setToolbarState: () => {},
    };
  }
  return context;
}