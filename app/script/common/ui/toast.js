import { escapeHtml } from '@/common/utils/escapeHtml.js';

//==========================================================================
// トーストの作成
//==========================================================================

export function showToast(message, type = 'success', duration = 5000) {
    // トーストを入れるコンテナを取得（無ければ作成）
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // トースト要素を作成
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    // タイプに応じてアイコン名を切り替え（成功: check_circle / エラー: error）
    const icon = type === 'success' ? 'check_circle' : 'error';

    toast.innerHTML = `
        <span class="material-symbols-rounded toast__icon">${icon}</span>
        <span class="toast__message">${escapeHtml(message)}</span>
        <div class="toast__close-btn">
            <span class="material-symbols-rounded">close</span>
        </div>
    `;

    // コンテナに追加
    container.appendChild(toast);

    // アニメーション用にクラスを少し遅れて付与
    requestAnimationFrame(() => {
        toast.classList.add('toast--show');
    });

    // 閉じる処理（×ボタンと時間切れで共通・二重実行しない）
    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timerId);
        toast.classList.remove('toast--show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    // このトースト自身の×ボタンにだけイベントを付ける
    toast.querySelector('.toast__close-btn').addEventListener('click', close);

    // 指定時間後にフェードアウトして削除
    const timerId = setTimeout(close, duration);
}
