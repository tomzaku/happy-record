import Card from '@moon-ui/card';
import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import styles from './index.module.scss';

type Props = {
  title: string;
  total: number;
  icon: string;
  background?: string;
  iconColor?: string;
};

const CardSummary = (props: Props) => {
  return (
    <Card className={styles.container}>
      <div>
        <Typography.Title level={2} noMargin style={{ marginBottom: -6 }}>
          {props.total}
        </Typography.Title>
        <Typography.Text>{props.title}</Typography.Text>
      </div>
      <Icon icon={props.icon} width={30} color={props.iconColor} />
      <div
        className={styles.background}
        style={{ background: props.background }}
      />
    </Card>
  );
};

export default CardSummary;
