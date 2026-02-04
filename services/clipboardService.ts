const fallbackCopy = (text: string): boolean => {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-1000px';
        textarea.style.left = '-1000px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    } catch {
        return false;
    }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator?.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // fall through to execCommand fallback
        }
    }
    return fallbackCopy(text);
};

export const readFromClipboard = async (): Promise<string> => {
    if (!navigator?.clipboard?.readText) {
        throw new Error('Clipboard unavailable.');
    }
    try {
        return await navigator.clipboard.readText();
    } catch {
        throw new Error('Clipboard unavailable.');
    }
};
