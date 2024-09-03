import React from 'react';

type Props = {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
};

// Mobile
const DatePicker = ({ value, onChange, className }: Props) => {
  return (
    <input
      className={className}
      type="date"
      value={value}
      onChange={onChange}
    />
  );
};

export default DatePicker;
