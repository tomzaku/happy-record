import ChecklistTodayMobile from "./index.mobile"
import ChecklistTodayDesktop from "./ChecklistToday.desktop"
import { useIsMobile } from "@dreamer/global"

const ChecklistToday = (props: any) => {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <ChecklistTodayMobile { ...props } />
  } else {
    return <ChecklistTodayDesktop { ...props } />
  }

}
export default ChecklistToday
