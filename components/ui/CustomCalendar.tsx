import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from '../icons';

interface CustomCalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ value, onChange }) => {
  // Ensure value is valid, otherwise default to today. The 'T00:00:00' is crucial to avoid timezone issues.
  const initialDate = value && !isNaN(new Date(value).getTime()) ? new Date(`${value}T00:00:00`) : new Date();
  const [displayDate, setDisplayDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const changeMonth = (offset: number) => {
    setDisplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const handleDateClick = (day: number) => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth() + 1; // getMonth() is 0-indexed
    // Format date string manually to avoid timezone issues with new Date().toISOString()
    const newDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(newDateString);
  };

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days = Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`pad-${i}`} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected = initialDate.getFullYear() === year && initialDate.getMonth() === month && initialDate.getDate() === day;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    
    let classes = 'flex items-center justify-center h-9 w-9 rounded-full cursor-pointer hover:bg-slate-100 transition-colors';
    if (isSelected) {
        classes += ' bg-violet-600 text-white font-semibold hover:bg-violet-700';
    } else if (isToday) {
        classes += ' bg-slate-100 text-slate-800 font-semibold';
    } else {
        classes += ' text-slate-700';
    }
    
    days.push(
      <div key={day} className={classes} onClick={() => handleDateClick(day)}>
        {day}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 w-full max-w-xs animate-in fade-in-0 zoom-in-95">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-slate-100 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"><ChevronLeft className="w-5 h-5" /></button>
        <div className="font-semibold text-slate-800">
          {displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-slate-100 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-slate-500 mb-2 font-medium">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {days}
      </div>
    </div>
  );
};

export { CustomCalendar };