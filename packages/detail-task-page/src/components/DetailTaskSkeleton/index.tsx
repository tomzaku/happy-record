import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Skeleton from '@moon-ui/skeleton';
import { SettingsCard, SettingsRow } from '../SettingsCard';

/**
 * Stands in for ChecklistGenericInfo (the "General Settings" card) while `checklistTemplate`
 * hasn't loaded. Every row here is fixed — same icon/title ChecklistGenericInfo itself always
 * renders for it, template or no — only each row's *value* (schedule summary, tags) actually
 * depends on `checklistTemplate`, so only that part skeletons; the row itself shows up immediately
 * rather than reading as one more anonymous placeholder block. Icon & Color is left out of that:
 * its own description ("Customize appearance") is static too, so there's nothing here worth
 * skeletoning once the row itself is shown. One "Schedule" row now, not two — see
 * ChecklistGenericInfo's own comment on merging Start & End Date into it.
 */
export const GenericInfoSkeleton = () => (
  <SettingsCard>
    <SettingsRow
      logo={<Icon width={24} icon="solar:settings-linear" />}
      title={
        <Typography.Title level={4} noMargin>
          General Settings
        </Typography.Title>
      }
      hoverBackground={false}
    />
    <SettingsRow
      logo={<Icon width={24} icon="solar:calendar-date-line-duotone" />}
      title="Schedule"
      description={<Skeleton width={170} height={12} />}
    />
    <SettingsRow
      logo={<Icon width={24} icon="tdesign:icon" />}
      title="Icon & Color"
      description="Customize appearance"
    />
    <SettingsRow
      logo={<Icon width={24} icon="solar:tag-outline" />}
      title="Tags"
      description={<Skeleton width={110} height={12} />}
    />
  </SettingsCard>
);
