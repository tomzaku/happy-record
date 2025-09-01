import RecordPageMobile from './index.mobile'
import RecordPageDesktop from './index.desktop'
import { useIsMobile } from '@dreamer/global'

const RecordPage = (props: any) => {
  const isMobile = useIsMobile()
  if(isMobile) {
    return <RecordPageMobile {...props} />
  } else {
    return <RecordPageDesktop {...props} />
  }
}


export default RecordPage
