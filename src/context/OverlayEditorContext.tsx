"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type ElementOverride = {
  x?: number;
  y?: number;
  width?: number | string;
  height?: number | string;
  fontSize?: string;
  color?: string;
  scale?: number;
  [key: string]: any;
};

interface OverlayEditorState {
  isEditMode: boolean;
  selectedElementId: string | null;
  overrides: Record<string, ElementOverride>;
  setIsEditMode: (mode: boolean) => void;
  setSelectedElementId: (id: string | null) => void;
  setOverride: (id: string, override: Partial<ElementOverride>) => void;
  getOverride: (id: string) => ElementOverride | undefined;
}

const OverlayEditorContext = createContext<OverlayEditorState | undefined>(undefined);

export function OverlayEditorProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, ElementOverride>>({});

  const setOverride = (id: string, override: Partial<ElementOverride>) => {
    setOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...override,
      },
    }));
  };

  const getOverride = (id: string) => overrides[id];

  return (
    <OverlayEditorContext.Provider
      value={{
        isEditMode,
        selectedElementId,
        overrides,
        setIsEditMode,
        setSelectedElementId,
        setOverride,
        getOverride,
      }}
    >
      {children}
    </OverlayEditorContext.Provider>
  );
}

export function useOverlayEditor() {
  const context = useContext(OverlayEditorContext);
  if (!context) {
    // If used outside provider (like direct OBS source), act as read-only mode
    return {
      isEditMode: false,
      selectedElementId: null,
      overrides: {},
      setIsEditMode: () => {},
      setSelectedElementId: () => {},
      setOverride: () => {},
      getOverride: () => undefined,
    };
  }
  return context;
}
