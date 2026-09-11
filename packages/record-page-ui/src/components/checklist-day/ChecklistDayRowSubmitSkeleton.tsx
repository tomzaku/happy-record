import React from 'react';
import List from '@moon-ui/list';
import Skeleton from '@moon-ui/skeleton';
import styles from './ChecklistDay.desktop.module.scss';

type Props = {
  // `group.fields.length`, not `fieldsByGroup[group.id].length` — the field-id list already
  // comes off the template, so it's known the instant `template` itself loads, unlike the
  // resolved RecordField rows (a separate fetch, `useRecordField`'s own store) this stands in
  // for while `checklist` hasn't landed yet. Using the id count keeps this skeleton's row count
  // stable rather than starting at 0 and jumping once fields resolve too.
  fieldCount: number;
};

// Stands in for ChecklistFieldGroupAdd (compact) inside one .rowExpandedGroupColumn while this
// row's `checklist` hasn't loaded/been created yet (see ChecklistDayRowSubmit) — same row shape
// (an icon + title on the left, an input-shaped value on the right) as the real fields will use,
// so the group column doesn't jump size once they land. Plain default `tone="surface"` — this
// sits inside a real Card (.rowExpandedGroupColumn), which is exactly what that tone is for
// (see @moon-ui/skeleton's own doc comment on its now-darker default gradient).
const ChecklistDayRowSubmitSkeleton = ({ fieldCount }: Props) => (
  <>
    {Array.from({ length: Math.max(fieldCount, 1) }).map((_, index) => (
      // eslint-disable-next-line react/no-array-index-key
      <List.ItemMeta
        key={index}
        logo={<Skeleton width={24} height={24} circle />}
        title={<Skeleton width={90} height={12} />}
        noPaddingHorizontal
        rightComponent={<Skeleton width={60} height={32} radius={8} />}
      />
    ))}
    <div className={styles.rowExpandedSkeletonFooter}>
      <Skeleton width={64} height={30} radius={8} />
    </div>
  </>
);

export default ChecklistDayRowSubmitSkeleton;
