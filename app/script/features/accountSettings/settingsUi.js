import { supabaseClient } from "@/common/config/supabase.js";
import { showToast } from '@/common/ui/toast.js';
import { showConfirm, showPasswordConfirm } from "@/common/ui/confirmModal.js";
import { updateUserEmail, updateUserPassword } from '@/features/accountSettings/authApi.js';
import { deleteAccount } from '@/features/accountSettings/deleteAccount.js';

// 静的ユーザー情報の描画
export function renderStaticUserInfo(user) {
    const emailSpan = document.getElementById('current-email');
    if (emailSpan) emailSpan.textContent = user.email;

    const createDateSpan = document.getElementById('created-at');
    if (createDateSpan && user.created_at) {
        createDateSpan.textContent = new Date(user.created_at).toLocaleString('ja-JP');
    }

    const lastLoginDate = document.getElementById('last-login');
    if (lastLoginDate && user.last_sign_in_at) {
        lastLoginDate.textContent = new Date(user.last_sign_in_at).toLocaleString('ja-JP');
    }

    const userIdSpan = document.getElementById('userID');
    if (userIdSpan) userIdSpan.textContent = user.id;
}

// ログアウト処理
export function setupLogoutEvent() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
        const isConfirmed = await showConfirm("ログアウトしますか？", "ログアウト", "キャンセル", "ログアウトする", true);
        if (!isConfirmed) return;

        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            showToast(`ログアウトに失敗しました:\n${error.message}`, 'error');
        } else {
            window.location.href = './login/index.html';
        }
    });
}

// アカウント情報更新イベント（メール / パスワード）
export function setupAccountUpdateEvents() {
    const updateEmailForm = document.getElementById('form-update-email');
    const updatePasswordForm = document.getElementById('form-update-password');

    if (updateEmailForm) {
        updateEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newEmail = document.getElementById('input-new-email').value;
            const isConfirmed = await showConfirm(`メールアドレスを ${newEmail} に変更しますか？`, "メールアドレス変更確認", "キャンセル", "変更する", false);
            if (!isConfirmed) return;

            const success = await updateUserEmail(newEmail);
            if (success) {
                showToast(`${newEmail} に確認メールを送信しました。メールをご確認ください。`, success);
                updateEmailForm.reset();
            }
        });
    }

    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            const currentPassword = document.getElementById('input-current-password').value;
            const newPassword = document.getElementById('input-new-password').value;

            if (newPassword.length < 12) {
                showToast('新しいパスワードは、12文字以上で入力してください', "error");
                return;
            }
            if (currentPassword === newPassword) {
                showToast('新しいパスワードは、現在のパスワードと異なるものを入力してください', "error");
                return;
            }

            const isConfirmed = await showConfirm(`パスワードを変更しますか？`, "パスワード変更確認", "キャンセル", "変更する", false);
            if (!isConfirmed) return;

            const success = await updateUserPassword(user.email, currentPassword, newPassword);
            if (success) {
                showToast('パスワードを変更しました', "success");
                updatePasswordForm.reset();
            }
        });
    }
}

// アカウント削除イベント
export function setupDeleteAccountEvent() {
    const deleteBtn = document.getElementById('btn-delete-account');
    if (!deleteBtn) return;

    deleteBtn.onclick = async () => {
        const password = await showPasswordConfirm(
            'アカウントを完全に削除するには、確認のため現在のパスワードを入力してください。',
            'アカウントの削除', '現在のパスワードを入力', 'キャンセル', 'アカウントを削除する'
        );
        if (!password) return;

        const success = await deleteAccount(password);
        if (success) {
            showToast('アカウントを削除しました。\nご利用ありがとうございました。', "success");
            window.location.href = './login/index.html';
        }
    };
}