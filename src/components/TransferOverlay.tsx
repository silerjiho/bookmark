export default function TransferOverlay() {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-wait">
      <div className="flex flex-col items-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="font-bold text-lg">포켓몬을 전송중...</p>
        <p className="text-sm text-white/70">GitHub와 통신하고 있어요</p>
      </div>
    </div>
  );
}
