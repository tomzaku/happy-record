import Typography from '@moon-ui/typography';
import cx from 'classnames';
import styles from './index.module.scss';

type Props = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  logo: React.ReactNode;
  title: string;
  description?: string;
  rightComponent?: React.ReactNode;
  noPaddingHorizontal?: boolean;
};

export default function ItemMeta({
  className,
  title,
  logo,
  description,
  rightComponent,
  noPaddingHorizontal,
  onClick,
}: Props) {
  return (
    <div
      className={cx(
        styles.container,
        noPaddingHorizontal && styles.noPaddingHorizontal,
        className,
      )}
      onClick={onClick}
    >
      <div className={styles.left}>
        {logo}
        <div className={styles.body}>
          <Typography.Paragraph bold noMargin>
            {title}
          </Typography.Paragraph>
          <Typography.Paragraph noMargin isDescription>
            {description}
          </Typography.Paragraph>
        </div>
      </div>
      <div>{rightComponent}</div>
    </div>
  );
}
