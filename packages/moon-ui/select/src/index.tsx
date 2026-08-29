import { useState, useRef, useEffect } from 'react';
import styles from './index.module.scss';
import cx from 'classnames';
import Icon from '@moon-ui/icon/Icon';

type SelectOption = {
  label: string;
  value: string;
};

type SelectPosition = 'top' | 'bottom' | 'auto';

type SelectProps<T extends SelectOption> = {
  options: T[];
  // Optional — a caller that doesn't track "which option is this" separately (most don't; they
  // just want a picker) gets nothing extra; passing it is what turns on the current-option
  // checkmark below and the default renderInput's own "show the selected label" fallback.
  value?: T['value'];
  onChange: (value: T, params: { close: () => void }) => void;
  disabled?: boolean;
  label?: string;
  position?: SelectPosition;
  // `selected` is additive (existing callers destructuring only `(option, { close })` are
  // unaffected) — lets a custom row still get the "is this the current one" state without
  // separately re-deriving it against `value` itself.
  renderOption?: (option: T, params: { close: () => void; selected: boolean }) => React.ReactNode;
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
  value,
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
  const selectedOption = options.find(option => option.value === value);

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

    setIsOpen(prev => {
      const next = !prev;
      // Only recompute positioning on the way open — closing needs none of this.
      if (next && position === 'auto') {
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
      } else if (next) {
        setShowAbove(position === 'top');
      }
      return next;
    });
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
          disabled && styles.disabled,
        )}
        role="button"
        tabIndex={0}
        ref={wrapperRef}
        onClick={handleOpen}
      >
        <div className={cx(styles.selectedValue, classes.input)}>
          {renderInput ? renderInput() : (selectedOption?.label ?? 'Select...')}
        </div>
        {/* A plain trigger with no visible affordance reads as a text label, not something
            clickable — this is the one thing every native <select> gives for free that the
            custom markup here didn't. */}
        <Icon
          icon="solar:alt-arrow-down-outline"
          width={16}
          className={cx(styles.chevron, isOpen && styles.chevronOpen)}
        />
        {isOpen && (
          <div
            className={cx(
              styles.optionsList,
              showAbove && styles.optionsListAbove,
            )}
            // Clicking an option shouldn't also re-trigger handleOpen on the wrapper's own
            // onClick (the list is a child of .selectElement, so the click bubbles) — that
            // would immediately reopen what onChange's own close() just closed.
            onClick={e => e.stopPropagation()}
          >
            {options.map(option => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  className={cx(styles.option, isSelected && styles.optionSelected)}
                  onClick={() => onChange(option, { close })}
                >
                  {renderOption ? (
                    renderOption(option, { close, selected: isSelected })
                  ) : (
                    <>
                      <span className={styles.optionLabel}>{option.label}</span>
                      {isSelected && (
                        <Icon icon="material-symbols:check" width={16} className={styles.optionCheck} />
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {renderOptionFooter && renderOptionFooter({ close })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Select;
