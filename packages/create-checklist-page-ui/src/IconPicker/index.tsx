import { useState } from 'react';
import List from '@moon-ui/list';
import { Icon } from '@iconify/react';

// Hooks
import { useIntl } from '@dreamer/translation';
import Input from '@moon-ui/input';

// Utils
import cx from 'classnames';

import styles from './index.module.scss';
import Button from '@moon-ui/button';

type Props = {
  selectedIcon: string;
  setSelectedIcon: (icon: string) => void;
  className?: string;
};

const IconPicker = ({ selectedIcon, setSelectedIcon, className }: Props) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [icons, setIcons] = useState<string[]>([]);

  const [showSearchView, setShowSearchView] = useState<boolean>(false);

  const intl = useIntl();

  const searchIcons = async (term: string) => {
    const results = await fetch(
      `https://api.iconify.design/search?query=${term}`
    );
    const data = await results.json();
    data?.icons?.length > 0 && setIcons(data.icons);
  };

  const handleIconClick = (icon: string) => {
    setSelectedIcon(icon);
    setShowSearchView(false);
  };

  return (
    <div className={cx(className, styles.container)}>
      <List.ItemMeta
        logo={<Icon width={24} icon={'tdesign:icon'} />}
        title={intl.formatMessage({
          defaultMessage: 'Icons',
          id: 'icon-picker.title',
        })}
        description={intl.formatMessage({
          defaultMessage: 'Select icons',
          id: 'icon-picker.subtitle',
        })}
        rightComponent={
          <div className={styles.rightContainer}>
            <Button
              type="ghost"
              onClick={() => {
                if (showSearchView) {
                  setShowSearchView(false);
                } else {
                  setShowSearchView(true);
                }
              }}
              className={styles.searchButton}
            >
              <>
                {showSearchView
                  ? intl.formatMessage({
                      defaultMessage: 'Close',
                      id: 'icon-picker.close',
                    })
                  : intl.formatMessage({
                      defaultMessage: 'Search',
                      id: 'icon-picker.search',
                    })}
                <div className={styles.divider} />
                <Icon width={24} icon={selectedIcon} />
              </>
            </Button>
          </div>
        }
      />
      {showSearchView && (
        <>
          <Input
            placeholder="Search icons..."
            border="dash"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              searchIcons(e.target.value);
            }}
            className={styles.iconSearchInput}
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              maxHeight: '300px',
              overflowY: 'scroll',
            }}
          >
            {icons.map(icon => (
              <div
                key={icon}
                onClick={() => handleIconClick(icon)}
                style={{
                  padding: '10px',
                  border: '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <Icon icon={icon} width="24" height="24" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default IconPicker;
