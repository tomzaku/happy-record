import { useState, useRef, useEffect } from 'react';
import styles from './index.module.scss';
import cx from 'classnames';

type SelectOption = {
  label: string;
  value: string;
};

type SelectPosition = 'top' | 'bottom' | 'auto';

type SelectProps<T extends SelectOption> = {
  options: T[];
  onChange: (value: T, params: { close: () => void }) => void;
  disabled?: boolean;
  label?: string;
  position?: SelectPosition;
  renderOption?: (option: T, params: { close: () => void }) => React.ReactNode;
  renderLabel?: () => React.ReactNode;
  renderInput?: () => React.ReactNode;
  renderOptionFooter?: (params: { close: () => void }) => React.ReactNode;
  classes?: {
    container?: string;
    input?: string;
    selectElement?: string;
  };
};

const Select = <T extends SelectOption>({
  options,
  onChange,
  disabled = false,
  label,
  position = 'auto',
  renderOption,
  renderLabel,
  renderInput,
  renderOptionFooter,
  classes = {},
}: SelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAbove, setShowAbove] = useState(false);
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

  const handleOpen = () => {
    if (disabled) return;

    setIsOpen(true);

    // Handle positioning based on the position prop
    if (position === 'top') {
      setShowAbove(true);
    } else if (position === 'bottom') {
      setShowAbove(false);
    } else if (position === 'auto') {
      // Calculate available space after the component is rendered
      setTimeout(() => {
        if (wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;
          const estimatedOptionsHeight = Math.min(
            options.length * 40 + 100,
            300,
          ); // Estimate options height

          setShowAbove(
            spaceBelow < estimatedOptionsHeight && spaceAbove > spaceBelow,
          );
        }
      }, 0);
    }
  };

  return (
    <div className={cx(styles.selectWrapper, classes.container)}>
      {renderLabel
        ? renderLabel()
        : label && <label className={styles.selectLabel}>{label}</label>}
      <div
        className={cx(
          styles.selectElement,
          classes.selectElement,
          isOpen && styles.open,
        )}
        role="button"
        tabIndex={0}
        ref={wrapperRef}
      >
        <div
          className={cx(styles.selectedValue, classes.input)}
          onClick={handleOpen}
        >
          {renderInput ? renderInput() : 'Select...'}
        </div>
        {isOpen && (
          <div
            className={cx(
              styles.optionsList,
              showAbove && styles.optionsListAbove,
            )}
          >
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
