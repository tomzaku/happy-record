import Card from '@moon-ui/card';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Lottie from 'lottie-react';

import { useNavigate } from 'react-router-dom';
import { useBodyMetric } from '@dreamer/global';
import babyLottie from '../../baby-animation-lottie.json';

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
          // color={'rgba(0,0,0,0.08)'}
          icon="openmoji:pregnant-woman-light-skin-tone"
          width={30}
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
        {/* <Lottie */}
        {/*   className={styles.babyLogo} */}
        {/*   width={70} */}
        {/*   animationData={babyLottie} */}
        {/*   loop={true} */}
        {/* /> */}
      </Card>
    );
  }
};

export default BodyMetricCard;
