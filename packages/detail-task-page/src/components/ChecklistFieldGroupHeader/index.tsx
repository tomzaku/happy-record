import { useIsMobile } from '@dreamer/global'
import ChecklistFieldGroupHeaderMobile from './index.mobile'
import ChecklistFieldGroupHeaderDesktop from './index.desktop'
export { ChecklistFieldGroupTab } from './enums'

const ChecklistFieldGroupHeader = (props: any) => {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <ChecklistFieldGroupHeaderMobile {...props} />
  }
  return (
    <ChecklistFieldGroupHeaderDesktop {...props} />
  )
}
export default ChecklistFieldGroupHeader;
