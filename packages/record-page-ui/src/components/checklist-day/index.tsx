import ChecklistDayMobile from "./index.mobile"
import ChecklistDayDesktop from "./ChecklistDay.desktop"
import { useIsMobile } from "@dreamer/global"

const ChecklistDay = (props: any) => {
  const isMobile = useIsMobile()
  if (isMobile) {
    return <ChecklistDayMobile { ...props } />
  } else {
    return <ChecklistDayDesktop { ...props } />
  }

}
export default ChecklistDay
