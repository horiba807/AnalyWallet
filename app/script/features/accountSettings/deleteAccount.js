import { showToast } from '@/common/ui/toast.js';

//==========================================================================
// アカウント削除
//==========================================================================

// アカウントの完全削除（パスワード検証付き）
export async function deleteAccount(password) {
    try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            showToast('ユーザー情報の取得に失敗しました。再ログインしてください。', 'error');
            return false;
        }

        const { error: authError } = await supabaseClient.auth.signInWithPassword({
            email: user.email,
            password: password
        });

        if (authError) {
            showToast('パスワードが正しくありません。', 'error');
            return false;
        }

        const { error: rpcError } = await supabaseClient.rpc('delete_user_account');

        if (rpcError) {
            showToast(`アカウントの削除に失敗しました:\n${rpcError.message}`, 'error');
            return false;
        }

        return true;

    } catch (err) {
        console.error(err);
        showToast('処理中にエラーが発生しました。', 'error');
        return false;
    }
}