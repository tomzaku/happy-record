import React from 'react';
import Chart from 'react-apexcharts';
import { useMetricRecordField } from './useMetricRecordField';

const MetricRecordField = ({
  checklistTemplateId,
}: {
  checklistTemplateId: string;
}) => {
  const { options, series } = useMetricRecordField({ checklistTemplateId });
  return <Chart options={options} series={series} type="bar" />;
};

export default MetricRecordField;
