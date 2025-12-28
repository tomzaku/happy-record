import React from 'react';
import { defaultKeyboardControls } from '../config/gameConfig';
import styles from './HelpMenu.module.scss';

type HelpMenuProps = {
  isOpen: boolean;
  onToggle: () => void;
};

// Format key display names
const formatKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ' ': 'Space',
  };
  return keyMap[key] || key.toUpperCase();
};

const HelpMenu = ({ isOpen, onToggle }: HelpMenuProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onToggle]);

  return (
    <div className={styles.helpContainer} ref={containerRef}>
      <button
        className={styles.helpButton}
        onClick={onToggle}
        aria-label="How to play"
        type="button"
      >
        <span className={styles.questionMark}>?</span>
      </button>
      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3 className={styles.title}>How to Play</h3>
            <button
              className={styles.closeButton}
              onClick={onToggle}
              aria-label="Close"
              type="button"
            >
              ×
            </button>
          </div>
          <div className={styles.content}>
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Objective</h4>
              <p className={styles.text}>
                Score goals by getting the ball into your opponent's goal area.
                The ball must cross the goal line to score.
              </p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Green Team Controls</h4>
              <div className={styles.controlsList}>
                <div className={styles.controlItem}>
                  <kbd className={styles.key}>{formatKey(defaultKeyboardControls.greenLeft)}</kbd>
                  <span className={styles.controlText}>Move left</span>
                </div>
                <div className={styles.controlItem}>
                  <kbd className={styles.key}>{formatKey(defaultKeyboardControls.greenRight)}</kbd>
                  <span className={styles.controlText}>Move right</span>
                </div>
                <div className={styles.controlItem}>
                  <kbd className={styles.key}>{formatKey(defaultKeyboardControls.greenRotateLeft)}</kbd>
                  <span className={styles.controlText}>Rotate players</span>
                </div>
                <div className={styles.controlItem}>
                  <kbd className={styles.key}>{formatKey(defaultKeyboardControls.greenRotateRight)}</kbd>
                  <span className={styles.controlText}>Rotate players</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Red Team Controls</h4>
              <div className={styles.controlsList}>
                <div className={styles.controlItem}>
                  <kbd className={styles.key}>{formatKey(defaultKeyboardControls.redLeft)}</kbd>
                  <span className={styles.controlText}>Move left</span>
                </div>
                <div className={styles.controlItem}>
                  <kbd className={styles.key}>{formatKey(defaultKeyboardControls.redRight)}</kbd>
                  <span className={styles.controlText}>Move right</span>
                </div>
                <div className={styles.controlItem}>
                  <kbd className={styles.key}>{formatKey(defaultKeyboardControls.redRotateLeft)}</kbd>
                  <span className={styles.controlText}>Rotate players</span>
                </div>
                <div className={styles.controlItem}>
                  <kbd className={styles.key}>{formatKey(defaultKeyboardControls.redRotateRight)}</kbd>
                  <span className={styles.controlText}>Rotate players</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Camera Controls</h4>
              <p className={styles.text}>
                Click and drag to rotate the camera. Use the mouse wheel to zoom in/out.
              </p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Tips</h4>
              <ul className={styles.tipsList}>
                <li>Rotate your players to control the ball direction</li>
                <li>Move your rows strategically to block shots</li>
                <li>Use the camera controls to get a better view</li>
                <li>Practice timing your rotations for better ball control</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpMenu;

