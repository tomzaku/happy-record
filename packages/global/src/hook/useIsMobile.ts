import { useState, useEffect } from 'react';
import { detectMobile } from '../util';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(detectMobile());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(detectMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};
