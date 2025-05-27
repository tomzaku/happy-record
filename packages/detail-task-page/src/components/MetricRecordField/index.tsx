import Chart from 'react-apexcharts';
import { useMetricRecordField } from './useMetricRecordField';
import { RecordField } from '@dreamer/global/src/store/record-field';

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
