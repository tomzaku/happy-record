import React from 'react';
import Skeleton from '@moon-ui/skeleton';
import { SettingsCard, SettingsRow } from '../SettingsCard';

/**
 * Stands in for ChecklistGenericInfo (the "General Settings" card) while `checklistTemplate`
 * hasn't loaded — reuses the real SettingsCard/SettingsRow shell so a settings row's own
 * padding/sizing lines up exactly once real rows render in its place.
 */
export const GenericInfoSkeleton = () => (
  <SettingsCard>
    {[0, 1, 2, 3].map(i => (
      <SettingsRow
        key={i}
        logo={<Skeleton circle width={20} height={20} />}
        title={<Skeleton width={100} height={14} />}
        description={<Skeleton width={160} height={12} />}
      />
    ))}
  </SettingsCard>
);
