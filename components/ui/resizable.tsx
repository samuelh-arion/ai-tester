import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface ResizablePanelProps {
  children: React.ReactNode
  defaultSize: number
  minSize?: number
  className?: string
}

export function ResizablePanel({
  children,
  defaultSize,
  minSize = 10,
  className
}: ResizablePanelProps) {
  return (
    <div
      className={cn("h-full", className)}
      style={{ width: `${defaultSize}%` }}
    >
      {children}
    </div>
  )
}

export function ResizableHandle() {
  return (
    <div className="w-2 bg-border cursor-col-resize hover:bg-muted-foreground/10">
      <div className="h-full w-px bg-border" />
    </div>
  )
}

export function ResizablePanelGroup({
  children,
  direction = "horizontal"
}: {
  children: React.ReactNode
  direction?: "horizontal" | "vertical"
}) {
  return (
    <div className={cn("flex h-full", direction === "horizontal" ? "flex-row" : "flex-col")}>
      {children}
    </div>
  )
} 