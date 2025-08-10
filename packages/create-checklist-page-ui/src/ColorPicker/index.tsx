import cn from 'classnames';
import styles from './index.module.scss';
import cx from 'classnames';
type Props = {
  value: string;
  setValue: (value: string) => void;
};

export const ColorView = ({
  value,
  onClick,
  className,
}: {
  value: string;
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(styles.color, styles.selected, className)}
      style={{ backgroundColor: value }}
    />
  );
};

const ColorPicker = ({ value, setValue, className, colorClassName }: Props) => {
  const colors = [
    '#f44336',
    '#e91e63',
    '#9c27b0',
    '#673ab7',
    '#3f51b5',
    '#2196f3',
    '#03a9f4',
    '#00bcd4',
    '#009688',
    '#4caf50',
    '#8bc34a',
    '#cddc39',
    '#ffeb3b',
    '#ffc107',
    '#ff9800',
    '#ff5722',
    '#795548',
    '#607d8b',
  ];

  return (
    <div className={cx(styles.container, className)}>
      {colors.map((color, index) => (
        <div
          key={index}
          className={cn(
            styles.color,
            value === color && styles.selected,
            colorClassName,
          )}
          style={{ backgroundColor: color }}
          onClick={() => setValue(color)}
        />
      ))}
    </div>
  );
};

export default ColorPicker;
