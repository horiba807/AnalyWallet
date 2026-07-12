import { supabaseClient } from './supabase.js'

//==========================================================================
//ログインの実行
//==========================================================================
const authForm = document.getElementById('auth-form');

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    // メールとパスワードでサインイン
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (signInError) {
        alert(`ログイン失敗: ${signInError.message}`);
        return;
    }

    //ユーザーのAAL（認証レベル）をチェックする
    const { data: mfaData, error: mfaError } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();

    if (mfaError) {
        alert("認証ステータスの取得に失敗しました。");
        return;
    }
    // currentLevelがaal1（パスワード完了）かつ、nextLevelがaal2（MFAが必要）になっている場合
    if (mfaData.currentLevel === 'aal1' && mfaData.nextLevel === 'aal2') {
        // MFAコード入力モーダルを表示する
        const loginMfaModal = document.getElementById('loginMFA-modal_wrapper');
        loginMfaModal.classList.add('active');

        // 「認証してログイン」ボタンが押されたときの処理
        const loginMfaVerifyBtn = document.getElementById('btn-login-mfa-verify');

        loginMfaVerifyBtn.onclick = async () => {
            const code = document.getElementById('login-mfa-code').value;
            if (code.length !== 6) return alert("6桁の数字を入力してください。");

            // ユーザーに紐づいている有効なMFA設定（Factor）のIDを取得する
            const { data: factorsData } = await supabaseClient.auth.mfa.listFactors();
            const activeFactor = factorsData.all.find(f => f.status === 'verified');

            if (!activeFactor) {
                alert("MFAの設定が見つかりません。");
                return;
            }

            // コードを検証
            const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
                factorId: activeFactor.id
            });

            if (challengeError) return alert(challengeError.message);

            const { error: verifyError } = await supabaseClient.auth.mfa.verify({
                factorId: activeFactor.id,
                challengeId: challengeData.id,
                code: code
            });

            if (verifyError) {
                alert("コードが正しくないか、有効期限が切れています。");
                return;
            }

            // メイン画面へ移動
            window.location.href = '../index.html';
        };

    } else {
        // 二段階認証を設定していないユーザーは、そのままメイン画面へ
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
            alert("利用規約およびプライバシーポリシーへの同意が必要です。");
            return;
        }

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        // Supabaseのサインアップ
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            alert(`登録失敗: ${error.message}`);
            return;
        }

        // Supabaseのデフォルト設定への対策
        alert("登録申請が完了しました！入力したメールアドレスに確認メールが届いているか確認してください。");

        // モーダルを閉じる
        signUpModal.classList.remove('active');
        signupForm.reset(); // 入力欄を空に
    });
}

//==========================================================================
//パスワードを忘れた場合の処理
//==========================================================================
const resetPassModalBtn = document.getElementById('openResetPassModal');
const resetPassModal = document.getElementById('forgetPass-modal_wrapper');
const resetPassModal_closeBtn = document.getElementById('close_FogetPassModal_btn');

resetPassModalBtn.addEventListener('click', async() => {
    resetPassModal.classList.add('active');
});
resetPassModal_closeBtn.addEventListener("click", async () => {
    resetPassModal.classList.remove('active');
});
//背景のどこかを押しても削除
resetPassModal.addEventListener('click', (e) => {
    if (e.target === resetPassModal) {
        resetPassModal.classList.remove('active');
    }
});

const forgotPasswordLink = document.getElementById('link-forgot-password');

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();

        const email = document.getElementById('forgotPass-email').value;

        if (!email) {
            alert("パスワードをリセットするには、まずメールアドレスを入力してください。");
            return;
        }

        if (!confirm(`${email} 宛てにパスワード再設定メールを送信しますか？`)) return;

        // 🚀 Supabaseに再設定メールの送信をリクエスト
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            // 💡 ユーザーがメールのリンクをクリックしたときの「飛び先」を指定します
            // ※ローカル開発（Live Serverなど）の環境に合わせてポート番号(5500など)を調整してください
            redirectTo: 'http://localhost:5173/AnalyWallet/login/reset.html',
        });

        if (error) {
            alert(`メール送信エラー: ${error.message}`);
        } else {
            alert("🎉 パスワード再設定メールを送信しました！メールボックスを確認してください。");
        }
    });
}