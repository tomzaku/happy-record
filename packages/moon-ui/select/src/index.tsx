import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getMoonPortalRoot } from '@moon-ui/provider';
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
  // The trigger's own measured position — null until the first open, since there's nothing to
  // portal/position before that. Recomputed on every open, not tracked continuously (see the
  // scroll-closes effect below for why this doesn't need to stay live while open).
  const [triggerRect, setTriggerRect] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const close = () => setIsOpen(false);
  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // The dropdown itself lives outside `wrapperRef` now (portaled — see getMoonPortalRoot),
      // so a click inside it would otherwise register as "outside" and close the select before
      // the option's own onClick ever runs.
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        !(optionsRef.current && optionsRef.current.contains(target))
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Portaled out of the normal document flow, so the dropdown no longer tracks the trigger's own
  // position for free the way an in-flow `position: absolute` child used to (scrolling the
  // trigger's own scrollable ancestor — a Dialog's `.body`, say — previously moved both together).
  // Closing on scroll/resize is the simplest correct fix for staying in sync, the same trade-off
  // most floating-UI popovers make rather than repositioning on every scroll tick.
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => close();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const handleOpen = () => {
    if (disabled) return;

    setIsOpen(prev => {
      const next = !prev;
      // Only recompute positioning on the way open — closing needs none of this.
      if (next) {
        // Deferred a tick so the trigger's own layout has settled before measuring it.
        setTimeout(() => {
          if (!wrapperRef.current) return;
          const rect = wrapperRef.current.getBoundingClientRect();
          setTriggerRect({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });

          if (position === 'auto') {
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
          } else {
            setShowAbove(position === 'top');
          }
        }, 0);
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
      </div>
      {/* Portaled via the shared getMoonPortalRoot (@moon-ui/provider) rather than left as an
          in-flow child — an `overflow: hidden` ancestor (Dialog's own `.modalShell`, deliberately
          clipped for its rounded corners — see Dialog.module.scss) would otherwise clip this,
          since it isn't a real modal that already escapes that on its own. */}
      {isOpen && triggerRect && createPortal(
        <div
          ref={optionsRef}
          className={cx(
            styles.optionsList,
            showAbove && styles.optionsListAbove,
          )}
          style={{
            left: triggerRect.left,
            minWidth: triggerRect.width,
            ...(showAbove
              ? { bottom: window.innerHeight - triggerRect.top }
              : { top: triggerRect.bottom }),
          }}
          // Clicking an option shouldn't also re-trigger handleOpen on the trigger's own onClick
          // — it's a sibling now (portaled), not a DOM child, so this no longer relies on bubbling
          // to matter, but stays as a harmless guard against a renderOptionFooter/renderOption
          // that itself contains something clickable.
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
        </div>,
        getMoonPortalRoot(),
      )}
    </div>
  );
};

export default Select;
