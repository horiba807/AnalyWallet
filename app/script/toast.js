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


// confirm
export function showConfirm(
    message,
    title = "確認",
    cancelBtn = "キャンセル",
    okBtn = "送信する",
    isDanger = false // ボタンが緑か赤かフラグ
) {
    return new Promise((resolve) => {
        const existingModal = document.getElementById('confirm-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal-backdrop';

        // trueならdanger、false ならokのクラスを使う
        const okBtnClass = isDanger ? 'modal__btn--danger' : 'modal__btn--ok';

        modal.innerHTML = `
      <div class="modal">
        <h3 class="modal__title">${title}</h3>
        <p class="modal__message">${message}</p>
        <div class="modal__actions">
          <button type="button" class="modal__btn modal__btn--cancel" id="confirm-cancel">${cancelBtn}</button>
          <button type="button" class="modal__btn ${okBtnClass}" id="confirm-ok">${okBtn}</button>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            modal.classList.add('modal-backdrop--show');
        });

        const closeModal = (result) => {
            modal.classList.remove('modal-backdrop--show');
            modal.addEventListener('transitionend', () => {
                modal.remove();
                resolve(result);
            }, { once: true });
        };

        document.getElementById('confirm-ok').addEventListener('click', () => closeModal(true));
        document.getElementById('confirm-cancel').addEventListener('click', () => closeModal(false));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(false);
        });
    });
}