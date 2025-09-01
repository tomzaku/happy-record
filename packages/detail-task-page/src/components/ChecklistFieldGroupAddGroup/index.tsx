import ChecklistFieldGroupAddGroupMobile from './index.mobile';
import ChecklistFieldGroupAddGroupDesktop from './index.desktop';

import { useIsMobile } from '@dreamer/global';

const ChecklistFieldGroupAddGroup = (props: any) => {
  const isMobile = useIsMobile()
  if(isMobile) {
    return  <ChecklistFieldGroupAddGroupMobile {...props} />
  }
  return (
  <ChecklistFieldGroupAddGroupDesktop {...props} />
  )
}

export default ChecklistFieldGroupAddGroup
