import React from 'react';
import styles from './index.module.scss';
import cx from 'classnames';

type Props = {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
};

// Need improvement
const dateToInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Mobile
const DatePicker = ({ value, onChange, className }: Props) => {
  return (
    <input
      className={cx(styles.input, className)}
      type="date"
      value={value ? dateToInputValue(new Date(value)) : ''}
      onChange={onChange}
    />
  );
};

export default DatePicker;
