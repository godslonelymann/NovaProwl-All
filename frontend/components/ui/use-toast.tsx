"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useEffect,
} from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X as XIcon,
} from "lucide-react";

export type ToastVariant = "default" | "success" | "error" | "warning";

export type ToastOptions = {
  title?: string;
  description?: string;
  duration?: number;
  variant?: ToastVariant;
};

type InternalToast = ToastOptions & {
  id: string;
};

type ToastContextType = {
  toast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function getVariantStyles(variant?: ToastVariant) {
  switch (variant) {
    case "success":
      return {
        wrapper: "bg-emerald-900/95 border-emerald-500/60 text-emerald-50",
        icon: "text-emerald-300",
      };
    case "error":
      return {
        wrapper: "bg-rose-900/95 border-rose-500/60 text-rose-50",
        icon: "text-rose-300",
      };
    case "warning":
      return {
        wrapper: "bg-amber-900/95 border-amber-500/60 text-amber-50",
        icon: "text-amber-300",
      };
    default:
      return {
        wrapper: "bg-slate-900/95 border-slate-700 text-slate-50",
        icon: "text-slate-200",
      };
  }
}

function getVariantIcon(variant?: ToastVariant) {
  switch (variant) {
    case "success":
      return CheckCircle2;
    case "error":
      return XCircle;
    case "warning":
      return AlertTriangle;
    default:
      return Info;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<InternalToast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = Math.random().toString(36).slice(2);
      const duration = options.duration ?? 2500;

      const toastObj: InternalToast = {
        id,
        title: options.title,
        description: options.description,
        duration,
        variant: options.variant ?? "default",
      };

      setToasts((prev) => [...prev, toastObj]);

      window.setTimeout(() => {
        removeToast(id);
      }, duration + 150);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[9999]">
        {toasts.map((t) => (
          <AnimatedToast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function AnimatedToast({
  toast,
  onClose,
}: {
  toast: InternalToast;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(enterTimer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    window.setTimeout(() => onClose(), 180);
  };

  const { wrapper, icon } = getVariantStyles(toast.variant);
  const Icon = getVariantIcon(toast.variant);

  return (
    <div
      className={`
        transform transition-all duration-200 ease-out
        ${visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}
      `}
    >
      <div
        className={`
          ${wrapper}
          rounded-xl border shadow-lg backdrop-blur-sm
          px-4 py-3
          flex items-start gap-3
          max-w-xs
        `}
      >
        <div className="mt-[2px]">
          <Icon className={`w-4 h-4 ${icon}`} />
        </div>

        <div className="flex-1">
          {toast.title && (
            <p className="text-sm font-semibold leading-tight">
              {toast.title}
            </p>
          )}
          {toast.description && (
            <p className="text-xs mt-1 leading-snug opacity-90">
              {toast.description}
            </p>
          )}
        </div>

        <button
          onClick={handleClose}
          className="ml-2 mt-0.5 p-1 rounded-full hover:bg-white/10"
        >
          <XIcon className="w-3.5 h-3.5 opacity-80" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
