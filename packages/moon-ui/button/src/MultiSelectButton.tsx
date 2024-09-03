import IconDone from '@moon-ui/icon/IconDone';
import Button from './DefaultButton';

import cx from 'classnames';

import styles from './MultiSelectButton.module.scss';

type Option<T> = {
  label: string;
  value: T;
};

type Props<T> = {
  options: Option<T>[];
  values?: T[];
  setValues?: (values: T[]) => void;
};
function MultiSelectButton<T>({
  options,
  values = [],
  setValues = () => {},
}: Props<T>) {
  return (
    <div className={styles.container}>
      {options.map(option => {
        const isSelected = values.includes(option.value);
        return (
          <Button
            key={`${option.label}-${option.value}`}
            type="ghost"
            className={cx(styles.button, isSelected && styles.activeButton)}
            onClick={() => {
              isSelected
                ? setValues(values.filter(value => value !== option.value))
                : setValues([...values, option.value]);
            }}
          >
            <IconDone
              className={cx(styles.icon, isSelected && styles.activeIcon)}
            />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export default MultiSelectButton;
