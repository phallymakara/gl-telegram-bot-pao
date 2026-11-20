/**
 * @file Select.tsx
 * @description Accessible, customizable headless select dropdown component powered by @headlessui/react.
 * Strictly adheres to project UI guidelines: zero drop shadows, clean borders, consistent typography, and responsive scaling.
 */

import React, { useMemo } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: (SelectOption<T> | string)[];
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  buttonClassName?: string;
  optionsClassName?: string;
  disabled?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  name?: string;
  id?: string;
  "aria-label"?: string;
}

export default function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  size = "sm",
  className = "",
  buttonClassName = "",
  optionsClassName = "",
  disabled = false,
  error = false,
  fullWidth = false,
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  // Normalize options into { value, label, disabled } structure
  const normalizedOptions = useMemo<SelectOption<T>[]>(() => {
    return options.map((opt) => {
      if (typeof opt === "string" || typeof opt === "number") {
        return { value: opt as unknown as T, label: String(opt) };
      }
      return opt;
    });
  }, [options]);

  // Find currently selected option object
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  const sizeClasses =
    size === "sm"
      ? "text-xs py-1.5 px-3 rounded-lg h-[34px]"
      : "text-xs py-2 px-3.5 rounded-xl h-[38px]";

  return (
    <div className={`relative ${fullWidth ? "w-full" : "inline-block"} ${className}`}>
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <ListboxButton
          aria-label={ariaLabel}
          className={`group w-full flex items-center justify-between gap-2 bg-white border text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none ${
            error
              ? "border-rose-400 focus:border-rose-500 text-rose-700"
              : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 text-slate-700"
          } ${sizeClasses} ${buttonClassName}`}
        >
          <span className={`block truncate ${!selectedOption && placeholder ? "text-slate-400 font-normal" : "font-normal"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={size === "sm" ? 13 : 15}
            className="text-slate-400 shrink-0 transition-transform duration-150 group-data-[open]:rotate-180"
          />
        </ListboxButton>

        <ListboxOptions
          transition
          anchor={{ to: "bottom start", gap: 4 }}
          className={`z-50 min-w-[var(--button-width)] max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl py-1 shadow-none focus:outline-none transition-opacity duration-100 ease-out data-[closed]:opacity-0 ${optionsClassName}`}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center select-none">
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <ListboxOption
                  key={String(opt.value)}
                  value={opt.value}
                  disabled={opt.disabled}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs cursor-pointer select-none transition-colors data-[focus]:bg-slate-50 data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed ${
                    isSelected ? "font-normal text-indigo-600 bg-indigo-50/40" : "font-normal text-slate-700"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={13} className="text-indigo-600 shrink-0" />}
                </ListboxOption>
              );
            })
          )}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
