import React from 'react';
import Chart from 'react-apexcharts';
import { useMetricRecordField } from './useMetricRecordField';

const MetricRecordField = ({
  checklistTemplateId,
  fields,
}: {
  checklistTemplateId: string;
  fields: RecordField[];
}) => {
  const { options, series } = useMetricRecordField({
    checklistTemplateId,
    fields,
  });
  return <Chart options={options} series={series} type="bar" />;
};

export default MetricRecordField;
