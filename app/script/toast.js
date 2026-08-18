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
        <span class="toast__message">${message}</span>
        <div class="toast__close-btn">
            <span class="material-symbols-rounded" id="toast-closebtn">
                close
            </span>
        </div>
    `;

    // コンテナに追加
    container.appendChild(toast);

    // アニメーション用にクラスを少し遅れて付与
    requestAnimationFrame(() => {
        toast.classList.add('toast--show');
    });

    document.getElementById('toast-closebtn').addEventListener("click", () => {
        toast.classList.remove('toast--show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    });

    // 指定時間後にフェードアウトして削除
    setTimeout(() => {
        toast.classList.remove('toast--show');
        // アニメーションが終わったらDOMから削除
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}