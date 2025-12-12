'use client';

import Link from 'next/link';
import { FileText, Shield, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Spinner } from '@/shared/ui';
import { ConsentModalProps } from '../types';
import { useConsentForm } from '../hooks';

export const ConsentModal: React.FC<ConsentModalProps> = ({ onConsent, isLoading = false }) => {
    const {
        termsAccepted,
        setTermsAccepted,
        privacyAccepted,
        setPrivacyAccepted,
        allAccepted,
        handleSubmit
    } = useConsentForm();

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                        <Shield className="text-white" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-100 mb-2">서비스 이용 동의</h2>
                    <p className="text-sm text-neutral-400">
                        CoverLetterVault 서비스를 이용하시려면<br />
                        아래 약관에 동의해 주세요.
                    </p>
                </div>

                {/* Consent Checkboxes */}
                <div className="space-y-4 mb-6">
                    {/* Terms of Service */}
                    <label
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${termsAccepted
                            ? 'border-primary bg-primary/5'
                            : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'
                            }`}
                    >
                        <div className="flex items-center h-6">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="w-5 h-5 rounded border-neutral-600 text-primary focus:ring-primary focus:ring-offset-0 bg-neutral-700 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText size={16} className="text-neutral-400" />
                                <span className="text-sm font-medium text-neutral-200">이용약관</span>
                                <span className="text-xs text-red-400">(필수)</span>
                            </div>
                            <Link
                                href="/policy/terms"
                                target="_blank"
                                className="text-xs text-primary hover:text-primary/80 underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                전문 보기 →
                            </Link>
                        </div>
                    </label>

                    {/* Privacy Policy */}
                    <label
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${privacyAccepted
                            ? 'border-primary bg-primary/5'
                            : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'
                            }`}
                    >
                        <div className="flex items-center h-6">
                            <input
                                type="checkbox"
                                checked={privacyAccepted}
                                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                className="w-5 h-5 rounded border-neutral-600 text-primary focus:ring-primary focus:ring-offset-0 bg-neutral-700 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield size={16} className="text-neutral-400" />
                                <span className="text-sm font-medium text-neutral-200">개인정보처리방침</span>
                                <span className="text-xs text-red-400">(필수)</span>
                            </div>
                            <Link
                                href="/policy/privacy"
                                target="_blank"
                                className="text-xs text-primary hover:text-primary/80 underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                전문 보기 →
                            </Link>
                        </div>
                    </label>
                </div>

                {/* Submit Button */}
                <button
                    onClick={() => handleSubmit(onConsent)}
                    disabled={!allAccepted || isLoading}
                    className={`w-full py-3.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${allAccepted && !isLoading
                        ? 'bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02]'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <Spinner size="sm" className="border-neutral-400 border-t-transparent" />
                            처리 중...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={18} />
                            동의하고 시작하기
                        </>
                    )}
                </button>

                {/* Footer Note */}
                <p className="text-xs text-neutral-500 text-center mt-4">
                    동의하지 않으시면 서비스를 이용하실 수 없습니다.
                </p>
            </motion.div>
        </div>
    );
};
