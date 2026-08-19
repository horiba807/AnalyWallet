import { createClient } from '@supabase/supabase-js';
import { supabaseClient } from './supabase.js';
import { showToast } from './toast.js';
import { showConfirm } from "./confirmModal.js";

//==========================================================================
// パスワードリセット
//==========================================================================
const resetForm = document.getElementById('form-reset-password');
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('input-reset-new-password').value;

    if (newPassword.length < 12) { 
        showToast("パスワードは12文字以上で入力してください。", 'error');
        return;
    }

    // 💡 実はメールのリンクをクリックしてこのページに来た時点で、
    // 裏側では「パスワード変更だけが許可された特殊なログイン状態」になっています。
    // なので、updateUser を呼ぶだけでパスワードが上書きされます！
    const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        showToast(`更新に失敗しました:\n${error.message}`, 'error');
    } else {
        showToast("パスワードが更新されました。", 'success');
        // パスワード変更と同時にログインも完了しているので、そのままメイン画面へ
        window.location.href = 'index.html';
    }
});