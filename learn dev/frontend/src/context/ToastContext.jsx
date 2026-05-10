import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info") => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.type}`}>
            <span>{item.message}</span>
            <button type="button" onClick={() => remove(item.id)}>x</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
};
