import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}


export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  open,
  onClose,
  children,
  title,
}) => {
  const location = useLocation();

  
  useEffect(() => {
    if (open) onClose();
    
  }, [location.pathname]);

  
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            aria-hidden
          />

          {}
          <motion.aside
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 left-0 z-50 h-[100dvh] w-[85vw] max-w-[320px] bg-white border-r border-slate-200 shadow-2xl lg:hidden flex flex-col"
            role="dialog"
            aria-modal
            aria-label={title || 'Navigation menu'}
          >
            {}
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 shrink-0">
              <span className="text-sm font-black text-slate-900">
                {title || 'Menu'}
              </span>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSidebar;