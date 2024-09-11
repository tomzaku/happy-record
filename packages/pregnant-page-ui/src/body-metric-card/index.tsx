import Card from '@moon-ui/card';
import { Icon } from '@iconify/react';
import Typography from '@moon-ui/typography';

import { useNavigate } from 'react-router-dom';
import { useBodyMetric } from '@dreamer/global';

import styles from './index.module.scss';
const BodyMetricCard = () => {
  const { currentBodyMetric } = useBodyMetric();

  const navigate = useNavigate();
  if (currentBodyMetric) {
    return (
      <Card
        onClick={() => navigate('/weight-record')}
        className={styles.container}
      >
        <Typography.Title level={3} noMargin className={styles.title}>
          Weight: {currentBodyMetric?.weight} kg
        </Typography.Title>
        <Typography.Text className={styles.subtitle}>
          Your belly size: {currentBodyMetric?.bellySize} cm
        </Typography.Text>
        <Icon
          className={styles.babyLogo}
          color={'rgba(255,255,255,0.3)'}
          width={70}
          height={70}
          icon="emojione-monotone:pregnant-woman"
        />
      </Card>
    );
  } else {
    return (
      <Card
        className={styles.container}
        onClick={() => navigate('/weight-record')}
      >
        <Typography.Title level={3} noMargin className={styles.title}>
          Let’s track your weight and belly size today!
        </Typography.Title>
      </Card>
    );
  }
};

export default BodyMetricCard;
