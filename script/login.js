import { supabaseClient } from './supabase.js'

const authForm = document.getElementById('auth-form');

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        // Supabaseでログインを実行
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert(`ログイン失敗: ${error.message}`);
            return;
        }

        // ログイン成功
        window.location.href = '../index.html';
    });
}

