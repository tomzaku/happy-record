import { useIsMobile } from '@dreamer/global';

import { default as FocusZoneFabMobile } from './FocusZoneFab.mobile';
import { default as FocusZoneFabDesktop } from './FocusZoneFab.desktop';

const FocusZoneFab = (props: any) => {
    const isMobile = useIsMobile()
    if(isMobile) {
        return <FocusZoneFabMobile {...props} />
    }
    return  <FocusZoneFabDesktop {...props} />
}

export default FocusZoneFab;