import React from 'react';
import Input from '@moon-ui/input';
import { Icon } from '@iconify/react';
import Typography from '@moon-ui/typography';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import Card from '@moon-ui/card';
import Button from '@moon-ui/button/src/DefaultButton';
import { useBodyMetric } from '@dreamer/global';
import MetricCalendar from '../metric-calendar';

const MetricInputCard = () => {
  const [weight, setWeight] = React.useState(40.2);
  const [bellySize, setBellySize] = React.useState(50.2);
  const { addBodyMetric, currentBodyMetric, currentDay } = useBodyMetric();
  const [isMetricRecorded, setIsMetricRecorded] = React.useState(
    !!currentBodyMetric
  );
  React.useEffect(() => {
    setIsMetricRecorded(!!currentBodyMetric);
  }, [currentBodyMetric]);
  const intl = useIntl();
  if (isMetricRecorded && currentBodyMetric) {
    return (
      <Card>
        <MetricCalendar />
        <div className={styles.header}>
          <Icon
            width={100}
            color="rgba(16,154,0,0.16)"
            icon="ion:checkmark-done-circle-outline"
            className={styles.iconSuccess}
          />
          <Typography.Title level={3} className={styles.questionTitle}>
            {intl.formatMessage({
              id: 'pregnant-weight-record.label-recorded',
              defaultMessage:
                "You've already recorded your weight and belly's size.",
            })}
          </Typography.Title>
        </div>
        <div className={styles.divider} />
        <div className={styles.inputContainer}>
          <div className={styles.iconAnswerContainer}>
            <Icon width={24} icon="icon-park-outline:industrial-scales" />
            <Typography.Text className={styles.titleAnswer}>
              Weight
            </Typography.Text>
          </div>
          <Input
            type="number"
            readOnly
            className={styles.numberInput}
            value={currentBodyMetric.weight}
            step="0.01"
            min={20}
            max={120}
          />
          <Typography.Text className={styles.kgText}>Kg</Typography.Text>
        </div>
        <div className={styles.inputContainer}>
          <div className={styles.iconAnswerContainer}>
            <Icon width={24} icon="twemoji:straight-ruler" />
            <Typography.Text className={styles.titleAnswer}>
              Belly's Size
            </Typography.Text>
          </div>

          <Input
            type="number"
            readOnly
            className={styles.numberInput}
            value={currentBodyMetric.bellySize}
            step="0.01"
            min={20}
            max={120}
          />
          <Typography.Text className={styles.kgText}>Cm</Typography.Text>
        </div>
        <div className={styles.editFooter}>
          <Button
            onClick={() => {
              setIsMetricRecorded(false);
            }}
          >
            EDIT
          </Button>
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <MetricCalendar />
      <div>
        <Typography.Title level={3} className={styles.questionTitle}>
          {intl.formatMessage(
            {
              id: 'pregnant-weight-record.label-pregnant-weight',
              defaultMessage:
                "What's your weight {{day}}? And how's your belly growing, mama?",
            },
            {
              day:
                new Date(currentDay).toLocaleString() ===
                new Date().toLocaleString()
                  ? 'today'
                  : new Date(currentDay).toLocaleDateString(),
            }
          )}
        </Typography.Title>
      </div>
      <div className={styles.divider} />
      <div className={styles.inputContainer}>
        <div className={styles.iconAnswerContainer}>
          <Icon width={24} icon="icon-park-outline:industrial-scales" />
          <Typography.Text className={styles.titleAnswer}>
            Weight
          </Typography.Text>
        </div>
        <Input
          type="number"
          border="dash"
          className={styles.numberInput}
          onChange={event => setWeight(Number(event.target.value))}
          value={weight}
          step="0.01"
          min={20}
          max={120}
        />
        <Typography.Text className={styles.kgText}>Kg</Typography.Text>
      </div>
      <div className={styles.inputContainer}>
        <div className={styles.iconAnswerContainer}>
          <Icon width={24} icon="twemoji:straight-ruler" />
          <Typography.Text className={styles.titleAnswer}>
            Belly's Size
          </Typography.Text>
        </div>

        <Input
          type="number"
          border="dash"
          className={styles.numberInput}
          value={bellySize}
          onChange={event => setBellySize(Number(event.target.value))}
          step="0.01"
          min={20}
          max={120}
        />
        <Typography.Text className={styles.kgText}>Cm</Typography.Text>
      </div>
      <Button
        onClick={() => {
          addBodyMetric({
            weight,
            bellySize,
            createdAt: currentDay.toISOString(),
          });
          setIsMetricRecorded(true);
        }}
      >
        SUBMIT
      </Button>
    </Card>
  );
};

export default MetricInputCard;
