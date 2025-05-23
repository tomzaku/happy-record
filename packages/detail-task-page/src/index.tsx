import { useParams, useSearchParams } from 'react-router-dom';
import RecordDay from './components/RecordDay';

const DetailTaskPage = () => {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');
  if (!id || !currentDay) {
    return;
  }
  return (
    <>
      <RecordDay id={id} currentDay={currentDay} />
    </>
  );
};

export default DetailTaskPage;
