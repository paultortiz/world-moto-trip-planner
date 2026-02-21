"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ComboboxProps {
  /** Current value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** List of options to display */
  options: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether options are loading */
  loading?: boolean;
  /** Loading text to display */
  loadingText?: string;
  /** Text to show when no options match */
  noOptionsText?: string;
  /** Additional CSS classes for the input */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Label for accessibility */
  "aria-label"?: string;
}

/**
 * Combobox component that combines a dropdown with typeahead search.
 * Allows users to either select from predefined options or type a custom value.
 */
export default function Combobox({
  value,
  onChange,
  options,
  placeholder = "",
  loading = false,
  loadingText = "Loading...",
  noOptionsText = "No options",
  className = "",
  disabled = false,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isFiltering, setIsFiltering] = useState(false); // Track if user is actively typing
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter options based on input only when user is actively typing
  // When dropdown is opened via click/focus, show all options
  const filteredOptions = isFiltering && inputValue
    ? options.filter((opt) =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
      )
    : options;

  // Sync internal input value with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Commit the current input value when closing
        if (inputValue !== value) {
          onChange(inputValue);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, value, onChange]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsFiltering(true); // User is typing, enable filtering
    setIsOpen(true);
    setHighlightedIndex(-1);
  }, []);

  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
    // Don't enable filtering on focus - show all options
    setIsFiltering(false);
  }, []);

  const handleInputBlur = useCallback(() => {
    // Delay to allow click on option to register
    setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, 150);
  }, [inputValue, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            const selected = filteredOptions[highlightedIndex];
            setInputValue(selected);
            onChange(selected);
            setIsOpen(false);
          } else {
            // Commit current custom value
            onChange(inputValue);
            setIsOpen(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
        case "Tab":
          // Commit value on tab
          if (inputValue !== value) {
            onChange(inputValue);
          }
          setIsOpen(false);
          break;
      }
    },
    [isOpen, highlightedIndex, filteredOptions, inputValue, value, onChange]
  );

  const handleOptionClick = useCallback(
    (option: string) => {
      setInputValue(option);
      onChange(option);
      setIsOpen(false);
      setIsFiltering(false); // Reset filtering state after selection
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleOptionPointerDown = useCallback(
    (e: React.PointerEvent, option: string) => {
      // Use pointerDown for immediate response on mobile
      e.preventDefault();
      handleOptionClick(option);
    },
    [handleOptionClick]
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
          className={`w-full rounded border border-slate-600 bg-slate-950 p-1 pr-7 text-[11px] ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsFiltering(false); // Show all options when clicking dropdown button
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
          disabled={disabled}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-200"
          aria-label="Toggle dropdown"
        >
          <svg
            className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded border border-slate-600 bg-slate-900 py-1 shadow-lg"
        >
          {loading ? (
            <li className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-400">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {loadingText}
            </li>
          ) : filteredOptions.length === 0 ? (
            <li className="px-2 py-1.5 text-[11px] text-slate-500">
              {inputValue ? noOptionsText : "Type to search or enter custom value"}
            </li>
          ) : (
            filteredOptions.map((option, index) => (
              <li
                key={option}
                role="option"
                aria-selected={highlightedIndex === index}
                onPointerDown={(e) => handleOptionPointerDown(e, option)}
                className={`cursor-pointer px-2 py-1.5 text-[11px] touch-manipulation select-none ${
                  highlightedIndex === index
                    ? "bg-adv-accent/20 text-adv-accent"
                    : option.toLowerCase() === inputValue.toLowerCase()
                    ? "bg-slate-800 text-slate-200"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {option}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
