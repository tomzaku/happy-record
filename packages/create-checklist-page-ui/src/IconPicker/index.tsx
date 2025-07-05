import { useState } from 'react';
import List from '@moon-ui/list';
import { Icon } from '@moon-ui/icon/Icon';
import ColorPicker, { ColorView } from '../ColorPicker';

// Hooks
import { useIntl } from '@dreamer/translation';
import Input from '@moon-ui/input';

// Utils
import cx from 'classnames';

import styles from './index.module.scss';

type Props = {
  selectedIcon: string;
  setSelectedIcon: (icon: string) => void;
  className?: string;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
};

enum DropDownStatus {
  Color,
  Icon,
  Hidden,
}
const IconPicker = ({
  selectedIcon,
  setSelectedIcon,
  className,
  selectedColor,
  setSelectedColor,
}: Props) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [icons, setIcons] = useState<string[]>([]);

  const [showDropDown, setShowDropDown] = useState(DropDownStatus.Hidden);

  const intl = useIntl();

  const searchIcons = async (term: string) => {
    const results = await fetch(
      `https://api.iconify.design/search?query=${term}`,
    );
    const data = await results.json();
    if (data?.icons?.length > 0) {
      setIcons(data.icons);
    }
  };

  const handleIconClick = (icon: string) => {
    setSelectedIcon(icon);
    setShowDropDown(DropDownStatus.Hidden);
  };

  return (
    <div className={cx(className, styles.container)}>
      <List.ItemMeta
        logo={<Icon width={24} icon={'tdesign:icon'} />}
        title={intl.formatMessage({
          defaultMessage: 'Icons',
          id: 'icon-picker.title',
        })}
        rightComponent={
          <div className={styles.rightContainer}>
            <Icon width={24} icon={selectedIcon} color={selectedColor} />
          </div>
        }
        noPaddingHorizontal
      />
      <>
        <div className={styles.inputContainer}>
          <Input
            placeholder={
              <>
                <Icon
                  icon="material-symbols:search"
                  className={styles.searchIcon}
                />
                Search icons
              </>
            }
            border="dash"
            value={searchTerm}
            showClear
            onChange={e => {
              setSearchTerm(e.target.value);
              searchIcons(e.target.value);
              if (e.target.value.length === 0) {
                setShowDropDown(DropDownStatus.Hidden);
              } else {
                setShowDropDown(DropDownStatus.Icon);
              }
            }}
            className={styles.iconSearchInput}
            classes={{
              input: styles.searchInput,
            }}
          />
          <ColorView
            value={selectedColor}
            className={styles.colorView}
            onClick={() => {
              setShowDropDown(DropDownStatus.Color);
            }}
          />
        </div>
        {showDropDown === DropDownStatus.Icon && (
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
                <Icon
                  icon={icon}
                  width="24"
                  height="24"
                  color={selectedColor}
                />
              </div>
            ))}
          </div>
        )}
        {showDropDown === DropDownStatus.Color && (
          <ColorPicker
            value={selectedColor}
            setValue={value => {
              setSelectedColor(value);
              setShowDropDown(DropDownStatus.Hidden);
            }}
            className={styles.colorPicker}
          />
        )}
      </>
    </div>
  );
};

export default IconPicker;
