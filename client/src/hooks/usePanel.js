/**
 * usePanel Hook
 * Manages the sliding panel animation (login/home screens)
 * Replaces direct DOM manipulation with React refs
 */

import { useRef, useCallback } from 'react';

export default function usePanel() {
    const containerRef = useRef(null);

    const showRightPanel = useCallback(() => {
        containerRef.current?.classList.add('right-panel-active');
    }, []);

    const showLeftPanel = useCallback(() => {
        containerRef.current?.classList.remove('right-panel-active');
    }, []);

    return { containerRef, showRightPanel, showLeftPanel };
}
