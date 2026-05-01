"use client"

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900 shadow-2xl"
                    >
                        {/* Header Decoration */}
                        <div className={`h-2 w-full ${type === 'danger' ? 'bg-rose-500' : 'bg-emerald-500'}`} />

                        <div className="p-8">
                            <div className="flex items-start justify-between">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${type === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    <AlertCircle size={28} />
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-100 leading-none">
                                    {title}
                                </h3>
                                <p className="mt-3 text-sm leading-relaxed text-slate-400 font-medium">
                                    {message}
                                </p>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 rounded-2xl border border-slate-700/50 bg-slate-800 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-slate-700"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`flex-1 rounded-2xl py-3 text-sm font-black uppercase tracking-widest text-white transition-all shadow-lg ${type === 'danger'
                                            ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                                            : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                                        }`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ConfirmationModal;
