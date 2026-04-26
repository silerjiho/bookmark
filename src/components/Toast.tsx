import { useBoxStore } from "../store/boxStore";

export default function ToastContainer() {
  const toasts = useBoxStore((s) => s.toasts);
  const dismiss = useBoxStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none w-full px-4 max-w-md">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto bg-[#1d1d1f]/95 backdrop-blur-xl text-white text-[14px] font-medium tracking-tight px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] animate-toast-in"
          style={{
            maxWidth: "100%",
          }}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
