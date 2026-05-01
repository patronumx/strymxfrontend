"use client";

import React from "react";
import { Rnd } from "react-rnd";
import { useOverlayEditor } from "@/context/OverlayEditorContext";

interface EditableElementProps {
  id: string;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number | string; height: number | string };
  disabled?: boolean;
}

export default function EditableElement({
  id,
  children,
  defaultPosition = { x: 0, y: 0 },
  defaultSize = { width: "auto", height: "auto" },
  disabled = false,
}: EditableElementProps) {
  const { isEditMode, selectedElementId, setSelectedElementId, overrides, setOverride } = useOverlayEditor();

  const override = overrides[id] || {};
  const currentX = override.x ?? defaultPosition.x;
  const currentY = override.y ?? defaultPosition.y;
  const currentWidth = override.width ?? defaultSize.width;
  const currentHeight = override.height ?? defaultSize.height;

  const isSelected = selectedElementId === id;

  if (!isEditMode || disabled) {
    // Live mode: Render as an absolutely positioned div
    // We use transform translate for better performance and to match how react-rnd manages dragged coordinates
    return (
      <div
        id={id}
        style={{
          position: "absolute",
          transform: `translate(${currentX}px, ${currentY}px)${override.scale ? ` scale(${override.scale})` : ''}`,
          width: currentWidth,
          height: currentHeight,
          ...(override.color ? { color: override.color } : {}),
          ...(override.fontSize ? { fontSize: override.fontSize } : {}),
          // ensure the transform origin is top left for consistent scaling
          transformOrigin: 'top left'
        }}
      >
        {children}
      </div>
    );
  }

  // Edit Mode: Render interactable Rnd (Resizing and Dragging)
  return (
    <Rnd
      size={{ width: currentWidth, height: currentHeight }}
      position={{ x: currentX, y: currentY }}
      onDragStop={(e, d) => {
        setOverride(id, { x: d.x, y: d.y });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        setOverride(id, {
          width: ref.style.width,
          height: ref.style.height,
          ...position,
        });
      }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedElementId(id);
      }}
      onDragStart={() => {
        if (!isSelected) setSelectedElementId(id);
      }}
      bounds="parent"
      className={`group ${isSelected ? "ring-2 ring-blue-500 z-50 rounded-sm" : "hover:ring-1 hover:ring-amber-500/50 hover:bg-amber-500/10 z-10"} transition-colors`}
      style={{
        position: 'absolute',
        ...(override.color ? { color: override.color } : {}),
        ...(override.fontSize ? { fontSize: override.fontSize } : {}),
      }}
    >
      <div className="w-full h-full relative pointer-events-none" style={{ transform: override.scale ? `scale(${override.scale})` : 'none', transformOrigin: 'top left' }}>
        {isSelected && (
          <div className="absolute -top-7 left-0 bg-blue-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-t font-mono shadow-xl pointer-events-none whitespace-nowrap">
            {id}
          </div>
        )}
        {children}
      </div>
    </Rnd>
  );
}
