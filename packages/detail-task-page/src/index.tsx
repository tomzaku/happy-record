import { useParams } from 'react-router-dom';
import RecordToday from './components/RecordToday';

const DetailTaskPage = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return;
  }
  return (
    <>
      <RecordToday id={id} />
    </>
  );
};

export default DetailTaskPage;
