import qs from 'qs';
import { useParams } from 'react-router-dom';

const ChecklistTemplateSharedPageUi = () => {
  const params = useParams();
  console.log('PARAMS', params);
  const queryParams = qs.parse(location.search, { ignoreQueryPrefix: true });
  console.log('>>>>QS', queryParams);

  return '';
};

export default ChecklistTemplateSharedPageUi;
