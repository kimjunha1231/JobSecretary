export interface ConsentModalProps {
    onConsent: (termsAccepted: boolean, privacyAccepted: boolean) => Promise<void>;
    isLoading?: boolean;
}

export interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}
