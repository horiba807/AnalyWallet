import { createClient } from '@supabase/supabase-js';
import { supabaseClient } from '@/common/config/supabase.js';
import { showToast } from '@/common/ui/toast.js';
import { showConfirm } from "@/common/ui/confirmModal.js";

//==========================================================================
// バックアップコード検証・消費ヘルパー関数
//==========================================================================
async function verifyAndConsumeBackupCode(inputCode, userId) {
    const { data: records, error } = await supabaseClient
        .from('mfa_backup_codes')
        .select('id, encrypted_code, iv, used_at')
        .eq('user_id', userId)
        .is('used_at', null);

    if (error || !records || records.length === 0) {
        return { success: false, message: '有効なバックアップコードが見つかりません' };
    }

    const cleanInput = inputCode.replace(/-/g, '').toUpperCase();

    for (const record of records) {
        const rawCode = await decryptText(record.encrypted_code, record.iv);
        if (!rawCode) continue;

        const cleanRawCode = rawCode.replace(/-/g, '').toUpperCase();

        if (cleanInput === cleanRawCode) {
            const { error: updateError } = await supabaseClient
                .from('mfa_backup_codes')
                .update({ used_at: new Date().toISOString() })
                .eq('id', record.id);

            if (updateError) {
                console.error("使用済み更新エラー:", updateError.message);
                return { success: false, message: 'コードの消費処理に失敗しました' };
            }

            return { success: true };
        }
    }

    return { success: false, message: 'バックアップコードが正しくないか、既に使用されています' };
}

//==========================================================================
// パスワードリセット処理（二段階認証対応版）
//==========================================================================
const resetForm = document.getElementById('form-reset-password');

if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('input-reset-new-password')?.value;

        if (!newPassword || newPassword.length < 12) {
            showToast("パスワードは12文字以上で入力してください。", 'error');
            return;
        }

        // --- パスワード更新を実行する内部処理 ---
        const executePasswordUpdate = async () => {
            const { error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                showToast(`更新に失敗しました:\n${error.message}`, 'error');
                return false;
            } else {
                showToast("パスワードが更新されました。", 'success');
                window.location.href = 'index.html';
                return true;
            }
        };

        // 1. ユーザーの現在および必要な認証レベル（AAL）をチェック
        const { data: mfaData, error: mfaError } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaError) {
            showToast(`認証ステータスの取得に失敗しました: \n ${mfaError.message}`, 'error');
            return;
        }

        // 2. 二段階認証が必要な場合（現在のレベルがaal1 かつ 次に必要なレベルがaal2）
        if (mfaData.currentLevel === 'aal1' && mfaData.nextLevel === 'aal2') {
            const loginMfaModal = document.getElementById('loginMFA-modal_wrapper');
            if (loginMfaModal) loginMfaModal.classList.add('active');

            const totpContainer = document.getElementById('mfa-totp-container');
            const backupContainer = document.getElementById('mfa-backup-container');
            const btnSwitchToBackup = document.getElementById('btn-switch-to-backup');
            const btnSwitchToTotp = document.getElementById('btn-switch-to-totp');
            const loginMfaVerifyBtn = document.getElementById('btn-login-mfa-verify');

            let currentMode = 'totp';

            // モード切替：バックアップコード
            if (btnSwitchToBackup) {
                btnSwitchToBackup.onclick = () => {
                    currentMode = 'backup';
                    if (totpContainer) totpContainer.style.display = 'none';
                    if (backupContainer) backupContainer.style.display = 'block';
                };
            }

            // モード切替：TOTP（認証アプリ）
            if (btnSwitchToTotp) {
                btnSwitchToTotp.onclick = () => {
                    currentMode = 'totp';
                    if (backupContainer) backupContainer.style.display = 'none';
                    if (totpContainer) totpContainer.style.display = 'block';
                };
            }

            // モーダル内の「認証する」ボタン押下時
            if (loginMfaVerifyBtn) {
                loginMfaVerifyBtn.onclick = async () => {
                    const { data: { user } } = await supabaseClient.auth.getUser();
                    if (!user) {
                        showToast('ユーザー情報の取得に失敗しました', 'error');
                        return;
                    }

                    // -------------------------------------------------------------
                    // パターンA：バックアップコード認証
                    // -------------------------------------------------------------
                    if (currentMode === 'backup') {
                        const backupCodeInput = document.getElementById('login-backup-code')?.value.trim();
                        if (!backupCodeInput) {
                            return showToast('バックアップコードを入力してください', 'error');
                        }

                        const result = await verifyAndConsumeBackupCode(backupCodeInput, user.id);
                        if (!result.success) {
                            showToast(result.message, 'error');
                            return;
                        }

                        sessionStorage.setItem('mfa_verified_by_backup', 'true');
                        showToast('バックアップコードで認証しました', 'success');

                        // パスワード更新の実行
                        const success = await executePasswordUpdate();
                        if (success && loginMfaModal) {
                            loginMfaModal.classList.remove('active');
                        }
                        return;
                    }

                    // -------------------------------------------------------------
                    // パターンB：通常TOTP（6桁コード）認証
                    // -------------------------------------------------------------
                    const code = document.getElementById('login-mfa-code')?.value.trim();
                    if (!code || code.length !== 6) return showToast('6桁の数字を入力してください', 'error');

                    const { data: factorsData } = await supabaseClient.auth.mfa.listFactors();
                    const activeFactor = factorsData?.all?.find(f => f.status === 'verified');

                    if (!activeFactor) {
                        showToast(`エラーが発生しました: 有効なMFA設定が見つかりません`, 'error');
                        return;
                    }

                    // Challenge生成
                    const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
                        factorId: activeFactor.id
                    });
                    if (challengeError) {
                        showToast(`エラーが発生しました: \n ${challengeError.message}`, 'error');
                        return;
                    }

                    // Verify実行（成功するとセッションが AAL2 に昇格）
                    const { error: verifyError } = await supabaseClient.auth.mfa.verify({
                        factorId: activeFactor.id,
                        challengeId: challengeData.id,
                        code: code
                    });

                    if (verifyError) {
                        showToast('コードが正しくないか、有効期限が切れています。再度入力してください', 'error');
                        return;
                    }

                    // AAL2昇格後にパスワード更新を実行
                    const success = await executePasswordUpdate();
                    if (success && loginMfaModal) {
                        loginMfaModal.classList.remove('active');
                    }
                };
            }

        } else {
            // 3. MFA未設定、またはすでにAAL2（二段階認証済み）の場合はそのまま更新
            await executePasswordUpdate();
        }
    });
}