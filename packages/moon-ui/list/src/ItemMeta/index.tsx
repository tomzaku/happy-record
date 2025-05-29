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
};

export default function ItemMeta({
  className,
  title,
  logo,
  description,
  rightComponent,
  onClick,
}: Props) {
  return (
    <div className={cx(styles.container, className)} onClick={onClick}>
      {logo}
      <div className={styles.body}>
        <Typography.Paragraph bold noMargin>
          {title}
        </Typography.Paragraph>
        <Typography.Paragraph noMargin isDescription>
          {description}
        </Typography.Paragraph>
      </div>
      {rightComponent}
    </div>
  );
}
