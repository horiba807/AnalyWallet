//confirmModal.js
//確認用のモーダルを表示する関数

//==========================================================================
// 通常の
//==========================================================================
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


//==========================================================================
// パスワード確認付きのモーダル
//==========================================================================
export function showPasswordConfirm(
    message,
    title = "確認",
    placeholder = "現在のパスワード",
    cancelBtn = "キャンセル",
    okBtn = "削除する"
) {
    return new Promise((resolve) => {
        // 既に存在するモーダルがあれば削除
        const existingModal = document.getElementById('confirm-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal-backdrop';

        modal.innerHTML = `
      <div class="modal">
        <h3 class="modal__title">${title}</h3>
        <p class="modal__message">${message}</p>
        
        <form id="confirm-password-form" class="delete-account__pass-form-wrapper">
          <input 
            type="password" 
            class="delete-account__pass-form"
            id="confirm-password-input" 
            placeholder="${placeholder}" 
            required 
            autocomplete="current-password"
          >
        </form>

        <div class="modal__actions">
          <button type="button" class="modal__btn modal__btn--cancel" id="confirm-cancel">${cancelBtn}</button>
          <button type="button" class="modal__btn modal__btn--danger" id="confirm-ok">${okBtn}</button>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        const passwordInput = document.getElementById('confirm-password-input');
        const form = document.getElementById('confirm-password-form');

        requestAnimationFrame(() => {
            modal.classList.add('modal-backdrop--show');
            if (passwordInput) passwordInput.focus(); // モーダル開いた時に自動フォーカス
        });

        // モーダルを閉じる内部関数
        const closeModal = (result) => {
            modal.classList.remove('modal-backdrop--show');
            modal.addEventListener('transitionend', () => {
                modal.remove();
                resolve(result); // 入力されたパスワード文字列 または null を返す
            }, { once: true });
        };

        // 確定処理
        const handleOk = () => {
            const val = passwordInput ? passwordInput.value.trim() : '';
            if (!val) {
                passwordInput.reportValidity(); // 未入力の場合ブラウザ標準の警告を表示
                return;
            }
            closeModal(val);
        };

        // フォーム送信（Enterキーでの送信）対応
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleOk();
        });

        document.getElementById('confirm-ok').addEventListener('click', handleOk);
        document.getElementById('confirm-cancel').addEventListener('click', () => closeModal(null));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(null);
        });
    });
}