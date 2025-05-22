import { useIntl } from '@dreamer/translation';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';

const RecordToday = () => {
  const intl = useIntl();
  return (
    <Card>
      <Typography.Title level={3}>
        {intl.formatMessage({
          id: 'detail-task-page.record-today.label',
          defaultMessage: 'Record Today',
        })}
      </Typography.Title>
    </Card>
  );
};

export default RecordToday;
