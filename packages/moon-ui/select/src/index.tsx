import { useState, useRef, useEffect } from 'react';
import styles from './index.module.scss';
import cx from 'classnames';

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps<T extends SelectOption> = {
  options: T[];
  onChange: (value: T, params: { close: () => void }) => void;
  disabled?: boolean;
  label?: string;
  renderOption?: (option: T, params: { close: () => void }) => React.ReactNode;
  renderLabel?: () => React.ReactNode;
  renderInput?: () => React.ReactNode;
  renderOptionFooter?: (params: { close: () => void }) => React.ReactNode;
  classes?: {
    container?: string;
  };
};

const Select = <T extends SelectOption>({
  options,
  onChange,
  disabled = false,
  label,
  renderOption,
  renderLabel,
  renderInput,
  renderOptionFooter,
  classes = {},
}: SelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={cx(styles.selectWrapper, classes.container)}
      ref={wrapperRef}
    >
      {renderLabel
        ? renderLabel()
        : label && <label className={styles.selectLabel}>{label}</label>}
      <div
        className={`${styles.selectElement} ${isOpen ? styles.open : ''}`}
        role="button"
        tabIndex={0}
      >
        <div
          className={styles.selectedValue}
          onClick={() => !disabled && setIsOpen(true)}
        >
          {renderInput ? renderInput() : 'Select...'}
        </div>
        {isOpen && (
          <div className={styles.optionsList}>
            {options.map(option => (
              <div
                key={option.value}
                className={styles.option}
                onClick={() => {
                  onChange(option, { close });
                }}
              >
                {renderOption ? renderOption(option, { close }) : option.label}
              </div>
            ))}
            {renderOptionFooter && renderOptionFooter({ close })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Select;
