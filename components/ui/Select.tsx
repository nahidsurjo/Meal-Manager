import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

type SelectContextType = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedValue: string;
  setSelectedValue: React.Dispatch<React.SetStateAction<string>>;
  // FIX: Added selectedLabel to provide its value to consumers of the context.
  selectedLabel: ReactNode;
  setSelectedLabel: React.Dispatch<React.SetStateAction<ReactNode>>;
  onValueChange?: (value: string) => void;
};

const SelectContext = createContext<SelectContextType | undefined>(undefined);

const useSelectContext = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("useSelectContext must be used within a Select provider");
  }
  return context;
};

type SelectProps = {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
};

// FIX: Moved SelectContent and SelectItem before Select to fix type inference issues.
const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className, ...props }, ref) => {
  const { isOpen, setIsOpen } = useSelectContext();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 mt-2 w-full rounded-lg border border-slate-200 bg-white text-black shadow-lg animate-in fade-in-0 zoom-in-95 ${className}`}
      {...props}
    >
        <div className="p-1">{children}</div>
    </div>
  );
});
SelectContent.displayName = "SelectContent";

type SelectItemProps = { children: ReactNode, value: string, className?: string };

const SelectItem: React.FC<SelectItemProps> = ({ children, value, className }) => {
  const { setSelectedValue, setIsOpen, onValueChange, selectedValue, setSelectedLabel } = useSelectContext();
  
  const handleSelect = () => {
    setSelectedValue(value);
    setSelectedLabel(children);
    if(onValueChange) {
      onValueChange(value);
    }
    setIsOpen(false);
  };

  const isSelected = value === selectedValue;
  
  return (
    <div
      onClick={handleSelect}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${isSelected ? 'font-semibold bg-slate-100' : ''} ${className}`}
    >
      {children}
       {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
      )}
    </div>
  );
};


const Select: React.FC<SelectProps> = ({ children, value = '', onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const [selectedLabel, setSelectedLabel] = useState<ReactNode>(null);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);
  
  // FIX: Used React.isValidElement to safely check children and their props.
  // This avoids unsafe casting and potential runtime errors if children are not React elements.
  useEffect(() => {
    if (!selectedLabel || value !== selectedValue) {
        const childrenArray = React.Children.toArray(children);
        const selectContent = childrenArray.find(
        (child) => React.isValidElement(child) && child.type === SelectContent
        );

        if (selectContent && React.isValidElement(selectContent)) {
        // FIX: Cast props to access children, as React.isValidElement narrows props to an empty object.
        const items = React.Children.toArray((selectContent.props as { children: ReactNode }).children);
        // FIX: Broke out the find logic into multiple lines to help TypeScript's type inference.
        const selectedItem = items.find(
            (item) => {
            if (React.isValidElement(item) && item.type === SelectItem) {
                // FIX: Cast props to access value, as React.isValidElement narrows props to an empty object.
                return (item.props as SelectItemProps).value === value;
            }
            return false;
            }
        );
        if (selectedItem && React.isValidElement(selectedItem)) {
            // FIX: Cast props to access children, as React.isValidElement narrows props to an empty object.
            setSelectedLabel((selectedItem.props as SelectItemProps).children);
        } else {
            setSelectedLabel(null);
        }
        }
    }
  }, [value, children, selectedLabel, selectedValue]);

  return (
    <SelectContext.Provider value={{ isOpen, setIsOpen, selectedValue, setSelectedValue, selectedLabel, setSelectedLabel, onValueChange }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ children, className, ...props }, ref) => {
  const { setIsOpen } = useSelectContext();
  return (
    <button
      ref={ref}
      onClick={() => setIsOpen(prev => !prev)}
      className={`flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
    const { selectedLabel, selectedValue } = useSelectContext();
    return <>{selectedValue ? selectedLabel : <span className="text-slate-400">{placeholder}</span>}</>;
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };