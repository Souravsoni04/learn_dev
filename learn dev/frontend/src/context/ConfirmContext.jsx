import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [config, setConfig] = useState(null);

  const confirm = useCallback((title, message, options = {}) => {
    return new Promise((resolve) => {
      setConfig({
        title,
        message,
        resolve,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'danger'
      });
    });
  }, []);

  const handleConfirm = () => {
    config.resolve(true);
    setConfig(null);
  };

  const handleCancel = () => {
    config.resolve(false);
    setConfig(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {config && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4">
              <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center text-xl
                ${config.type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-[#E6F4F1] text-[#00A884]'}
              `}>
                {config.type === 'danger' ? '⚠️' : '❓'}
              </div>
              <h3 className="text-xl font-black text-[#2D3436]">{config.title}</h3>
            </div>
            
            <p className="text-sm text-[#636E72] leading-relaxed">
              {config.message}
            </p>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleCancel}
                className="flex-1 py-4 rounded-2xl bg-[#F8F9FA] text-[#636E72] text-xs font-black uppercase tracking-widest hover:bg-[#E9ECEF] transition-all"
              >
                {config.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`
                  flex-1 py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl
                  ${config.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-[#00A884] hover:bg-[#008F6F] shadow-[#00A884]/20'}
                `}
              >
                {config.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
