import React from 'react';
import { useBodyMetric } from '@dreamer/global';
import Card from '@moon-ui/card';
import Chart from 'react-apexcharts';

import styles from './index.module.scss';
import Typography from '@moon-ui/typography';

const BodyMetricChart = () => {
  const { chartData, updateChartDate } = useBodyMetric();
  React.useEffect(() => {
    updateChartDate();
  }, []);
  const options = {
    stroke: {
      curve: 'smooth',
    },
    fill: {
      type: 'gradient',
    },
    xaxis: {
      categories: chartData?.categories,
    },
  };
  const series = [
    {
      name: 'weight',
      data: chartData?.weights,
    },
    {
      name: "belly's size",
      data: chartData?.bellySizes,
    },
  ];
  console.log('SERIES', series, options);
  if (
    !chartData ||
    !chartData.categories ||
    chartData?.categories.length === 0 ||
    chartData?.weights.length === 0 ||
    chartData?.bellySizes.length === 0
  ) {
    return null;
  }
  return (
    <Card className={styles.container}>
      <Typography.Title level={3} noMargin>
        Timeline
      </Typography.Title>
      <Chart options={options} series={series} type="line" />
    </Card>
  );
};

export default BodyMetricChart;
