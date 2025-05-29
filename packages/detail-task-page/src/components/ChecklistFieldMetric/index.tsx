import { useMetricRecordField } from './useMetricRecordField';
import Chart from 'react-apexcharts';
import { RecordField } from '@dreamer/global/src/store/record-field';

const ChecklistFieldMetric = ({
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

export default ChecklistFieldMetric;
