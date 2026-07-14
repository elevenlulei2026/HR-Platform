import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 transition-[opacity,backdrop-filter] duration-300 ease-out",
        "data-ending-style:opacity-0 data-starting-style:opacity-0",
        "supports-backdrop-filter:backdrop-blur-sm",
        "dark:bg-black/55 dark:supports-backdrop-filter:backdrop-blur-md",
        "motion-reduce:transition-none motion-reduce:backdrop-blur-none",
        className
      )}
      {...props}
    />
  )
}

const sheetSideClassName = {
  right: [
    "inset-y-0 right-0 h-full w-full max-w-[min(560px,100vw)] border-l",
    "shadow-[-16px_0_48px_-8px_rgba(15,23,42,0.14)]",
    "dark:shadow-[-16px_0_48px_-8px_rgba(0,0,0,0.5)]",
    "data-starting-style:translate-x-full data-ending-style:translate-x-full",
    "motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-ending-style:translate-x-0",
  ].join(" "),
  left: [
    "inset-y-0 left-0 h-full w-full max-w-[min(560px,100vw)] border-r",
    "shadow-[16px_0_48px_-8px_rgba(15,23,42,0.14)]",
    "dark:shadow-[16px_0_48px_-8px_rgba(0,0,0,0.5)]",
    "data-starting-style:-translate-x-full data-ending-style:-translate-x-full",
    "motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-ending-style:translate-x-0",
  ].join(" "),
  top: [
    "inset-x-0 top-0 h-auto border-b",
    "shadow-[0_16px_48px_-8px_rgba(15,23,42,0.14)]",
    "dark:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.5)]",
    "data-starting-style:-translate-y-full data-ending-style:-translate-y-full",
    "motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-ending-style:translate-y-0",
  ].join(" "),
  bottom: [
    "inset-x-0 bottom-0 h-auto border-t",
    "shadow-[0_-16px_48px_-8px_rgba(15,23,42,0.14)]",
    "dark:shadow-[0_-16px_48px_-8px_rgba(0,0,0,0.5)]",
    "data-starting-style:translate-y-full data-ending-style:translate-y-full",
    "motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-ending-style:translate-y-0",
  ].join(" "),
} as const

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground outline-none",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "data-ending-style:duration-200 data-ending-style:ease-in",
          "motion-reduce:transition-none",
          sheetSideClassName[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3 transition-colors hover:bg-muted"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">关闭</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex flex-col gap-1 border-b bg-muted/40 px-6 py-4 pr-14",
        "supports-backdrop-filter:bg-muted/30 supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col gap-2 border-t bg-muted/40 p-4",
        "supports-backdrop-filter:bg-muted/30 supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-lg font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
