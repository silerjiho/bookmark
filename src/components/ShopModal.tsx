import { ITEMS, type ShopItem } from "../api/items";

interface ShopModalProps {
  points: number;
  acting: boolean;
  onClose: () => void;
  onBuy: (item: ShopItem) => Promise<void>;
}

export default function ShopModal({ points, acting, onClose, onBuy }: ShopModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl overflow-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">상점</h2>
            <p className="text-sm text-slate-500 mt-0.5">보유 포인트: <span className="font-bold text-amber-600">{points} P</span></p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 text-2xl leading-none hover:text-slate-600 px-1"
          >
            &times;
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-3">
          구매한 도구는 즉시 장착됩니다. 기존에 장착한 도구는 사라집니다.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {ITEMS.map((item) => {
            const canAfford = points >= item.price;
            return (
              <button
                key={item.key}
                onClick={() => onBuy(item)}
                disabled={!canAfford || acting}
                className="text-sm border border-slate-200 rounded-lg py-2.5 px-2 hover:bg-amber-50 hover:border-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
              >
                <div className="font-bold text-slate-800">{item.name}</div>
                <div className="text-xs text-amber-600 mt-0.5">{item.price} P</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
