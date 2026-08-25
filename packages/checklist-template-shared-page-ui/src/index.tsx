import { useIsMobile } from '@dreamer/global';
import ChecklistTemplateSharedPageDesktop from './index.desktop';
import ChecklistTemplateSharedPageMobile from './index.mobile';

// Split the same way record-page-ui/detail-task-page are — the old version
// of this page was a single component, styled for a phone-width card and
// just left to stretch (badly) into a full desktop viewport. See CLAUDE.md
// and useChecklistTemplateSharedPage.ts for the logic both variants share.
const ChecklistTemplateSharedPageUi = () => {
  const isMobile = useIsMobile();
  return isMobile ? <ChecklistTemplateSharedPageMobile /> : <ChecklistTemplateSharedPageDesktop />;
};

export default ChecklistTemplateSharedPageUi;
