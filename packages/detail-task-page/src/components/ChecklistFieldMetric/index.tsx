import React from 'react';
import { useMetricRecordField } from './useMetricRecordField';
import Chart from 'react-apexcharts';
import { RecordField } from '@dreamer/global/src/store/record-field';
import CardSummary from '../CardSummary';
import styles from './index.module.scss';
import Select from '@moon-ui/select';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import Icon from '@moon-ui/icon/Icon';

const ChecklistFieldMetric = ({
  checklistTemplateId,
  fields,
}: {
  checklistTemplateId: string;
  fields: RecordField[];
}) => {
  const intl = useIntl();
  const {
    options,
    series,
    currentStreak,
    total,
    fetchChecklistRecords,
    todayCount,
  } = useMetricRecordField({
    checklistTemplateId,
    fields,
  });
  const [rangeDateType, setRangeDateType] = React.useState('month');
  const dateTypeMessage = {
    month: intl.formatMessage({
      id: 'ChecklistFieldMetric.month',
      defaultMessage: 'This Month',
    }),
    year: intl.formatMessage({
      id: 'ChecklistFieldMetric.year',
      defaultMessage: 'This Year',
    }),
  };
  return (
    <>
      <Select
        classes={{
          container: styles.selectContainer,
          input: styles.selectInput,
          selectElement: styles.selectElement,
        }}
        options={[
          {
            label: dateTypeMessage.month,
            value: 'month',
          },
          {
            label: dateTypeMessage.year,
            value: 'year',
          },
        ]}
        onChange={({ value }, { close }) => {
          setRangeDateType(value);
          fetchChecklistRecords(value);
          close();
        }}
        renderInput={() => (
          <>
            <Typography.Text>{dateTypeMessage[rangeDateType]}</Typography.Text>
            <Icon
              className={styles.selectIcon}
              icon="grommet-icons:down"
              width={10}
            />
          </>
        )}
        renderOption={option => (
          <Typography.Text>{option.label}</Typography.Text>
        )}
      />
      <CardSummary
        title={'Today'}
        total={todayCount}
        icon="solar:calendar-outline"
        background="#FFA500"
        iconColor="#FFA500"
      />
      <div className={styles.cardHeader}>
        <CardSummary
          title={'Total'}
          total={total}
          icon="solar:add-square-outline"
          iconColor="green"
          background="green"
        />
        <CardSummary
          title={'Streak'}
          total={currentStreak}
          icon="streamline-flex-color:graph-bar-increase-square-flat"
          background="#4953b1"
        />
      </div>

      <Chart options={options} series={series} type="bar" />
    </>
  );
};

export default ChecklistFieldMetric;
