"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Debounce delay in ms before onChange (and thus any API call) fires. Default 300ms. */
  debounceMs?: number;
}

// Debounces internally so callers can wire `onChange` straight into an API
// call (list-page filters, search params, etc.) without firing a request on
// every keystroke. The input itself stays instantly responsive — only the
// propagation to `onChange` is delayed.
export function SearchInput({ value, onChange, placeholder = "Search...", className, debounceMs = 300 }: SearchInputProps) {
  const [text, setText] = useState(value);

  // Keep in sync when the parent resets/changes `value` externally (e.g. clearing filters).
  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => onChange(text), debounceMs);
    return () => clearTimeout(timer);
    // `value`/`onChange` intentionally excluded: this should only re-run when
    // the user's local `text` (or the configured delay) changes, not when the
    // parent re-renders with a new inline `onChange` — that would keep
    // resetting the debounce timer and never actually fire it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, debounceMs]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
