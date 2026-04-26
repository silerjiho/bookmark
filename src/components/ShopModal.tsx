import { ITEMS, type ShopItem } from "../api/items";

interface ShopModalProps {
  points: number;
  acting: boolean;
  onClose: () => void;
  onBuy: (item: ShopItem) => Promise<void> | void;
}

export default function ShopModal({ points, acting, onClose, onBuy }: ShopModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center apple-glass animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-auto sm:rounded-2xl rounded-t-3xl shadow-[0_-10px_60px_rgba(0,0,0,0.2)] animate-in zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/85 backdrop-blur-xl px-5 py-3 flex items-center justify-between border-b border-black/[0.06]">
          <div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
              상점
            </h2>
            <p className="text-[12px] text-[rgba(0,0,0,0.48)] tracking-tight mt-0.5">
              보유 포인트{" "}
              <span className="text-[#0066cc] font-semibold">{points} P</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.06] hover:bg-black/[0.12] text-[#1d1d1f] flex items-center justify-center text-[15px] leading-none transition"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <p className="px-5 pt-4 text-[12px] text-[rgba(0,0,0,0.48)] tracking-tight">
          구매한 도구는 즉시 장착됩니다. 기존에 장착한 도구는 사라집니다.
        </p>

        <div className="px-5 py-4 grid grid-cols-2 gap-2">
          {ITEMS.map((item) => {
            const canAfford = points >= item.price;
            const disabled = !canAfford || acting;
            return (
              <button
                key={item.key}
                onClick={() => onBuy(item)}
                disabled={disabled}
                className={`text-left bg-[#f5f5f7] rounded-xl px-3 py-3 transition ${
                  disabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-black/[0.06] active:scale-[0.97]"
                }`}
              >
                <div className="text-[14px] font-semibold text-[#1d1d1f] tracking-tight">
                  {item.name}
                </div>
                <div className="text-[12px] text-[#0066cc] mt-0.5 tracking-tight">
                  {item.price} P
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
