import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import Input from '@moon-ui/input';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';
import { useTags, Tag } from '@dreamer/global/src/store/tags/useTags';
import cx from 'classnames';
import styles from './index.module.scss';
import List from '@moon-ui/list';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  className?: string;
}

const TagInput = ({ tags, setTags, className }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const intl = useIntl();
  const { addTag, searchTags } = useTags();

  const handleAddTag = (tagName: string) => {
    const trimmedTag = tagName.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      // Add to global store first
      const newTag = addTag(trimmedTag);
      if (newTag) {
        setTags([...tags, newTag.name]);
      }
      setInputValue('');
      setShowSelector(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchQuery(value);
    console.log('Input changed, value:', value, 'setting showSelector to true');
    setShowSelector(true);
  };

  const handleInputClick = () => {
    console.log('Input clicked, current showSelector:', showSelector);
    setShowSelector(!showSelector);
    console.log('Setting showSelector to:', !showSelector);
  };

  const handleSelectTag = (tag: Tag) => {
    if (!tags.includes(tag.name)) {
      setTags([...tags, tag.name]);
    }
    setInputValue('');
    setShowSelector(false);
  };

  // Close selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={cx(styles.container, className)}>
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:tag-broken" />}
        noPaddingHorizontal
        title={intl.formatMessage({
          defaultMessage: 'Tag',
          id: 'label-tag.label',
        })}
        rightComponent={
          <div className={styles.inputWrapper}>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={
                <>
                  {/* <Icon */}
                  {/*   icon="material-symbols:search" */}
                  {/*   className={styles.searchIcon} */}
                  {/* /> */}
                  Add a tag (press Enter or comma)
                </>
              }
              border="dash"
              classes={{
                input: styles.input,
              }}
              onClick={handleInputClick}
              renderRightInput={() => (
                <>
                  <div className={styles.tagsContainer}>
                    {tags.map((tag, index) => (
                      <div key={index} className={styles.tag}>
                        <Typography.Text className={styles.tagText}>
                          {tag}
                        </Typography.Text>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => handleRemoveTag(tag)}
                          aria-label="Remove tag"
                        >
                          <Icon width={16} icon="proicons:cancel" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Icon
                    icon="material-symbols:keyboard-arrow-down"
                    className={cx(styles.dropdownArrow, {
                      [styles.open]: showSelector,
                    })}
                  />
                </>
              )}
              renderLeftInput={() => <></>}
            />
            {showSelector && (
              <div ref={selectorRef} className={styles.selector}>
                {(() => {
                  console.log(
                    'Selector visible, searchQuery:',
                    searchQuery,
                    'searchTags result:',
                    searchTags(searchQuery),
                  );
                  return null;
                })()}
                {searchTags(searchQuery).map(tag => (
                  <div
                    key={tag.id}
                    className={styles.selectorItem}
                    onClick={() => handleSelectTag(tag)}
                  >
                    <Typography.Text>{tag.name}</Typography.Text>
                  </div>
                ))}
                {searchQuery.trim() &&
                  !searchTags(searchQuery).find(
                    tag =>
                      tag.name.toLowerCase() ===
                      searchQuery.trim().toLowerCase(),
                  ) && (
                    <div
                      className={styles.selectorItem}
                      onClick={() => handleAddTag(searchQuery)}
                    >
                      <Typography.Text>
                        Create "{searchQuery.trim()}"
                      </Typography.Text>
                    </div>
                  )}
                {searchTags(searchQuery).length === 0 &&
                  searchQuery.trim() === '' && (
                    <div className={styles.selectorItem}>
                      <Typography.Text>Type to search tags...</Typography.Text>
                    </div>
                  )}
              </div>
            )}
          </div>
        }
      />
    </div>
  );
};

export default TagInput;
