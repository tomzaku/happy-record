import React from 'react';
import styles from './index.module.scss';
import cx from 'classnames';

type Props = {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
};

const dateToInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// A native `<input type="datetime-local">` — date and time in one control, for a field whose
// value is a real moment (not just a calendar day) — `DatePicker`'s own sibling in this same
// package, same styling, same bare-string-in/ISO-out shape (see `@dreamer/global`'s
// `localDateTimeStringToISO`, `DatePicker`'s own `localDateStringToISO` counterpart).
const DateTimePicker = ({ value, onChange, className }: Props) => {
  return (
    <input
      className={cx(styles.input, className)}
      type="datetime-local"
      value={value ? dateToInputValue(new Date(value)) : ''}
      onChange={onChange}
    />
  );
};

export default DateTimePicker;
