import { motion } from "framer-motion";

export default function SOSButton({ onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-red-600 text-white font-bold font-display text-sm flex flex-col items-center justify-center sos-btn shadow-2xl shadow-red-900/60 hover:bg-red-500 active:scale-95 transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, delay: 0.5 }}
      aria-label="Open SOS Emergency Panel"
    >
      <span className="text-xl leading-none">🆘</span>
      <span className="text-[10px] font-mono mt-0.5 tracking-widest">SOS</span>
    </motion.button>
  );
}