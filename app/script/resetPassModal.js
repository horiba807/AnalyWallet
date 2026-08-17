// resetPass.js
import { createClient } from '@supabase/supabase-js';
import { supabaseClient } from './supabase.js'
import { showToast, showConfirm } from './toast.js';
import { decryptText } from "./api.js"

/**
 * パスワード再設定モーダルの初期化処理
 * @param {Object} options - オプション（リダイレクトURLなどを個別指定したい場合）
 * @param {string} options.redirectTo - パスワード再設定メール内のリンク先URL
 */
export function initPasswordResetModal(options = {}) {
    const resetPassModalBtn = document.getElementById('openResetPassModal');
    const resetPassModal = document.getElementById('forgetPass-modal_wrapper');
    const resetPassModal_closeBtn = document.getElementById('close_FogetPassModal_btn');
    const forgotPasswordLink = document.getElementById('link-forgot-password');

    // 1. モーダルを開く
    if (resetPassModalBtn && resetPassModal) {
        resetPassModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetPassModal.classList.add('active');
        });
    }

    // 2. モーダルを閉じる（ボタン）
    if (resetPassModal_closeBtn && resetPassModal) {
        resetPassModal_closeBtn.addEventListener('click', () => {
            resetPassModal.classList.remove('active');
        });
    }

    // 3. モーダルを閉じる（背景クリック）
    if (resetPassModal) {
        resetPassModal.addEventListener('click', (e) => {
            if (e.target === resetPassModal) {
                resetPassModal.classList.remove('active');
            }
        });
    }

    // 4. 再設定メール送信処理
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('forgotPass-email');
            const email = emailInput ? emailInput.value.trim() : '';

            if (!email) {
                showToast('メールアドレスを入力してください', 'error');
                return;
            }

            // モーダル
            const isConfirmed = await showConfirm(`${email} 宛てにパスワード再設定メールを送信しますか？`, "メール送信確認", "キャンセル", "送信する", false);
            if (!isConfirmed) return;

            // デフォルトのリダイレクトURL（引数で上書き可能）
            const redirectUrl = options.redirectTo || 'http://localhost:5173/AnalyWallet/app/login/reset.html';

            // Supabaseに送信リクエスト
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) {
                showToast(`メール送信に失敗しました: \n ${error.message}`, 'error');
            } else {
                showToast('再設定メールを送信しました。メールボックスをご確認ください。', 'success');

                // 送信成功時の後処理（モーダルを閉じて入力欄をリセット）
                if (resetPassModal) resetPassModal.classList.remove('active');
                if (emailInput) emailInput.value = '';
            }
        });
    }
}