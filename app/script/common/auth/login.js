import { supabaseClient } from "@/common/config/supabase.js";
import { showToast } from '@/common/ui/toast.js';
import { decryptText } from '@/common/utils/crypto.js';
import { initPasswordResetModal } from '@/common/auth/resetPassModal.js';

//==========================================================================
//ログインの実行
//==========================================================================
const authForm = document.getElementById('auth-form');

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    //■■■■■■■■■■■■■■■■■■ メールとパスワードでサインイン ■■■■■■■■■■■■■■■■■■
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (signInError) {
        showToast(`ログインに失敗しました: \n ${signInError.message}`, 'error');
        return;
    }

    //■■■■■■■■■■■■■■■■■■ 二段階認証 ■■■■■■■■■■■■■■■■■■
    //==========================================================================
    // バックアップコード検証・消費ヘパー関数
    //==========================================================================
    async function verifyAndConsumeBackupCode(inputCode, userId) {
        // ユーザーのバックアップコード一覧をDBから取得
        const { data: records, error } = await supabaseClient
            .from('mfa_backup_codes')
            .select('id, encrypted_code, iv, used_at')
            .eq('user_id', userId)
            .is('used_at', null); // 未使用のものだけ

        if (error || !records || records.length === 0) {
            return { success: false, message: '有効なバックアップコードが見つかりません' };
        }

        // 入力文字列の整形（ハイフン除去・大文字化して統一）
        const cleanInput = inputCode.replace(/-/g, '').toUpperCase();

        // 全未使用コードを復号して照合
        for (const record of records) {
            const rawCode = await decryptText(record.encrypted_code, record.iv);
            if (!rawCode) continue;

            const cleanRawCode = rawCode.replace(/-/g, '').toUpperCase();

            // コードが一致した場合
            if (cleanInput === cleanRawCode) {
                // DB上のコードを「使用済み（used_at = 現在日時）」に更新
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


    //■■■■■■■■■■■■■■■■■■ 二段階認証 ログイン処理 ■■■■■■■■■■■■■■■■■■

    // ユーザーのAAL（認証レベル）をチェックする
    const { data: mfaData, error: mfaError } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mfaError) {
        showToast(`ログインに失敗しました: \n 認証ステータスの取得に失敗しました`, 'error');
        return;
    }

    // currentLevelがaal1（パスワード完了）かつ、nextLevelがaal2（MFAが必要）になっている場合
    if (mfaData.currentLevel === 'aal1' && mfaData.nextLevel === 'aal2') {
        const loginMfaModal = document.getElementById('loginMFA-modal_wrapper');
        loginMfaModal.classList.add('active');

        // UI要素の取得
        const totpContainer = document.getElementById('mfa-totp-container');
        const backupContainer = document.getElementById('mfa-backup-container');
        const btnSwitchToBackup = document.getElementById('btn-switch-to-backup');
        const btnSwitchToTotp = document.getElementById('btn-switch-to-totp');
        const loginMfaVerifyBtn = document.getElementById('btn-login-mfa-verify');

        // 現在どのモードか（'totp' または 'backup'）
        let currentMode = 'totp';

        // 🔄 モード切替イベント：バックアップコード入力へ
        if (btnSwitchToBackup) {
            btnSwitchToBackup.onclick = () => {
                currentMode = 'backup';
                totpContainer.style.display = 'none';
                backupContainer.style.display = 'block';
            };
        }

        // 🔄 モード切替イベント：TOTP入力へ
        if (btnSwitchToTotp) {
            btnSwitchToTotp.onclick = () => {
                currentMode = 'totp';
                backupContainer.style.display = 'none';
                totpContainer.style.display = 'block';
            };
        }

        // 🔐 「認証する」ボタンが押されたときの処理
        loginMfaVerifyBtn.onclick = async () => {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                showToast('ユーザー情報の取得に失敗しました', 'error');
                return;
            }

            // -------------------------------------------------------------
            // パターンA：バックアップコードで認証する場合
            // -------------------------------------------------------------
            if (currentMode === 'backup') {
                const backupCodeInput = document.getElementById('login-backup-code').value.trim();
                if (!backupCodeInput) {
                    return showToast('バックアップコードを入力してください', 'error');
                }

                // バックアップコードの照合・消費を実行
                const result = await verifyAndConsumeBackupCode(backupCodeInput, user.id);

                if (!result.success) {
                    showToast(result.message, 'error');
                    return;
                }

                //バックアップコード認証成功フラグ
                sessionStorage.setItem('mfa_verified_by_backup', 'true');

                showToast('バックアップコードで認証しました', 'success');
                // メイン画面へ移動
                window.location.href = '../index.html';
                return;
            }

            // -------------------------------------------------------------
            // パターンB：通常通り認証アプリ（TOTP 6桁）で認証する場合
            // -------------------------------------------------------------
            const code = document.getElementById('login-mfa-code').value.trim();
            if (code.length !== 6) return showToast('6桁の数字を入力してください', 'error');

            // ユーザーに紐づいている有効なMFA設定（Factor）のIDを取得する
            const { data: factorsData } = await supabaseClient.auth.mfa.listFactors();
            const activeFactor = factorsData?.all?.find(f => f.status === 'verified');

            if (!activeFactor) {
                showToast(`エラーが発生しました: 有効なMFA設定が見つかりません`, 'error');
                return;
            }

            // コードを検証
            const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
                factorId: activeFactor.id
            });
            if (challengeError) {
                showToast(`エラーが発生しました: \n ${challengeError.message}`, 'error');
                return;
            }

            // コードの有効性検証
            const { error: verifyError } = await supabaseClient.auth.mfa.verify({
                factorId: activeFactor.id,
                challengeId: challengeData.id,
                code: code
            });

            if (verifyError) {
                showToast('コードが正しくないか、有効期限が切れています。再度入力してください', 'error');
                return;
            }

            // メイン画面へ移動
            window.location.href = '../index.html';
        };

    } else {
        // 二段階認証を設定していないユーザ
        window.location.href = '../index.html';
    }

});

//==========================================================================
//サインアップモーダル
//==========================================================================
const modalDisplayBtn = document.getElementById("displayModalBtn");
const signupModal = document.getElementById("signup-modal_wrapper");
const signupModal_closeBtn = document.getElementById('close_modal_btn');
const signupForm = document.getElementById('signup-form');

//モーダルの開閉
modalDisplayBtn.addEventListener("click", async () => {
    signupModal.classList.add('active');
});
signupModal_closeBtn.addEventListener("click", async () => {
    signupModal.classList.remove('active');
});
//背景のどこかを押しても削除
signupModal.addEventListener('click', (e) => {
    if (e.target === signupModal) {
        signupModal.classList.remove('active');
    }
});

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        //規約の同意チェック
        const termsCheckbox = document.getElementById('signup-terms');
        //チェックしていない場合
        if (termsCheckbox && !termsCheckbox.checked) {
            showToast('利用規約およびプライバシーポリシーへの同意が必要です', 'error');
            return;
        }

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        // Supabaseのサインアップ
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: 'https://analywallet.com/app/index.html', // 認証完了後に表示するページ
            },
        });

        if (error) {
            showToast(`アカウント登録に失敗しました: \n ${error.message}`, 'error');
            console.log(`error: ${error.message}`);

            return;
        }

        // Supabaseのデフォルト設定への対策
        showToast('入力したメールアドレスに確認メールを送信しました。メールボックスをご確認ください。', 'success');


        // モーダルを閉じる
        signUpModal.classList.remove('active');
        signupForm.reset(); // 入力欄を空に
    });
}

//==========================================================================
//パスワードを忘れた場合の処理
//==========================================================================
initPasswordResetModal();

document.getElementById('openResetPassModal').addEventListener('click', async() => {
    initPasswordResetModal();
});