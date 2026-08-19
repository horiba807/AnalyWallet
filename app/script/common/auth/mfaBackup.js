import { supabaseClient } from "@/common/config/supabase.js";
import { showToast } from '@/common/ui/toast.js';
import { showConfirm } from "@/common/ui/confirmModal.js";

import { decryptText, generateBackupCodes, encryptText } from "@/common/utils/crypto.js";
//==========================================================================
// MFA バックアップコード操作 & UI連携
//==========================================================================

// バックアップコードを発行して暗号化DB保存
export async function createAndSaveBackupCodes() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const rawCodes = generateBackupCodes(10);

    const insertData = await Promise.all(
        rawCodes.map(async (code) => {
            const { encryptedCode, iv } = await encryptText(code);
            return {
                user_id: user.id,
                encrypted_code: encryptedCode,
                iv: iv
            };
        })
    );

    await supabaseClient.from('mfa_backup_codes').delete().eq('user_id', user.id);
    const { error } = await supabaseClient.from('mfa_backup_codes').insert(insertData);

    if (error) {
        console.error("バックアップコード保存エラー:", error.message);
        showToast(`バックアップコードの生成に失敗しました:\n  ${error.message}`, "error");
        return null;
    }

    return rawCodes;
}

// DBから暗号化コードを取得し復号して返す
export async function fetchAndDecryptBackupCodes() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
        .from('mfa_backup_codes')
        .select('encrypted_code, iv, used_at')
        .eq('user_id', user.id);

    if (error || !data) return [];

    const decryptedList = await Promise.all(
        data.map(async (item) => {
            const rawCode = await decryptText(item.encrypted_code, item.iv);
            return {
                code: rawCode,
                isUsed: !!item.used_at
            };
        })
    );

    return decryptedList;
}

// 未使用のバックアップコード件数を取得
export async function getUnusedBackupCodesCount() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabaseClient
        .from('mfa_backup_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('used_at', null);

    if (error) return 0;
    return count || 0;
}

// コード一覧を画面に描画
export function showGeneratedBackupCodes(codesData) {
    const displayArea = document.getElementById('backup-display-area');
    const codesList = document.getElementById('backup-codes-list');
    const copyBtn = document.getElementById('btn-copy-backup-codes');
    const downloadBtn = document.getElementById('btn-download-backup-codes');

    if (!codesList) return;

    const normalizedData = codesData.map(item =>
        typeof item === 'string' ? { code: item, isUsed: false } : item
    );

    codesList.innerHTML = normalizedData.map(item => {
        if (item.isUsed) {
            return `<div style="text-decoration: line-through; opacity: 0.5;">${item.code}</div>`;
        }
        return `<div>${item.code}</div>`;
    }).join('');

    displayArea.style.display = 'block';

    const activeCodes = normalizedData.filter(i => !i.isUsed).map(i => i.code);

    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(activeCodes.join('\n'));
            showToast('未使用のコードをクリップボードにコピーしました', 'success');
        };
    }

    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const blob = new Blob([activeCodes.join('\n')], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `AnalyWallet-backup-codes-${Date.now()}.txt`;
            a.click();
        };
    }
}

// 残数を更新する処理
export async function updateBackupCount() {
    const countSpan = document.getElementById('backup-remaining-count');
    if (countSpan) {
        const count = await getUnusedBackupCodesCount();
        countSpan.textContent = count;
    }
}

// アコーディオンの開閉とイベント設定
export function setupBackupAccordion() {
    const toggleBtn = document.getElementById('btn-toggle-backup');
    const accordionBody = document.getElementById('backup-accordion-body');
    const arrow = document.getElementById('accordion-arrow');
    const regenerateBtn = document.getElementById('btn-regenerate-backup');

    if (toggleBtn && accordionBody) {
        toggleBtn.onclick = async () => {
            const isOpen = accordionBody.classList.toggle('open');
            if (arrow) arrow.textContent = isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down';

            if (isOpen) {
                const decryptedCodes = await fetchAndDecryptBackupCodes();
                if (decryptedCodes.length > 0) {
                    showGeneratedBackupCodes(decryptedCodes);
                }
            }
        };
    }

    if (regenerateBtn) {
        regenerateBtn.onclick = async () => {
            const isConfirmed = await showConfirm(
                "新しいバックアップコードを発行しますか？\n※古いバックアップコードはすべて使えなくなります。",
                "再発行の確認", "キャンセル", "再発行する", true
            );
            if (!isConfirmed) return;

            const newCodes = await createAndSaveBackupCodes();
            if (newCodes) {
                showGeneratedBackupCodes(newCodes);
                updateBackupCount();
                showToast("新しいバックアップコードを発行しました", "success");
            }
        };
    }
}