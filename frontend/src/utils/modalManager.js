import { useEffect } from 'react';

let activeModalsCount = 0;

export function registerModalOpen() {
  activeModalsCount++;
  if (typeof document !== 'undefined') {
    document.body.classList.add('modal-open');
    window.dispatchEvent(new CustomEvent('dhanmool:modal-change', { detail: { hasOpenModal: true } }));
  }
  return () => {
    activeModalsCount = Math.max(0, activeModalsCount - 1);
    if (activeModalsCount === 0 && typeof document !== 'undefined') {
      document.body.classList.remove('modal-open');
      window.dispatchEvent(new CustomEvent('dhanmool:modal-change', { detail: { hasOpenModal: false } }));
    }
  };
}

export function useModalLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const cleanup = registerModalOpen();
    return () => {
      cleanup();
    };
  }, [isOpen]);
}
