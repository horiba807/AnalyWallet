//==========================================================================
// Web Crypto API（バックアップコード用 暗号化・復号化ユーティリティ）
//==========================================================================
const ENCRYPTION_SECRET = "AnalyWallert-Secret-Key";

async function getCryptoKey() {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(ENCRYPTION_SECRET),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("mfa-backup-salt"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// 生コードを暗号化
async function encryptText(text) {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoded
    );

    return {
        encryptedCode: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
        iv: btoa(String.fromCharCode(...iv))
    };
}

// 暗号化データを復号化して元の文字列に戻す
export async function decryptText(encryptedBase64, ivBase64) {
    try {
        const key = await getCryptoKey();
        const ciphertext = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error("復号化失敗:", e);
        return null;
    }
}

// ランダムな8桁コード生成ユーティリティ
function generateBackupCodes(count = 10) {
    const codes = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < count; i++) {
        let code = '';
        for (let j = 0; j < 8; j++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
}