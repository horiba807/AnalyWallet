import { showToast } from '@/common/ui/toast.js';
import { showConfirm } from "@/common/ui/confirmModal.js";
import { enrollMFA, challengeAndVerifyMFA, getMFAStatus, unenrollMFA } from '@/common/auth/mfaApi.js';
import { createAndSaveBackupCodes, showGeneratedBackupCodes, updateBackupCount, setupBackupAccordion } from '@/common/auth/mfaBackup.js';

//==========================================================================
// MFA 
//==========================================================================
export async function checkAndRenderMFA() {
    const unregisteredArea = document.getElementById('mfa-unregistered-area');
    const registeredArea = document.getElementById('mfa-registered-area');
    const activatedAtSpan = document.getElementById('mfa-activated-at');
    const unenrollBtn = document.getElementById('btn-mfa-unenroll');

    const activeFactor = await getMFAStatus();

    if (activeFactor) {
        unregisteredArea?.classList.remove('active');
        registeredArea?.classList.add('active');

        const enrollDate = new Date(activeFactor.created_at);
        if (activatedAtSpan) {
            activatedAtSpan.textContent = enrollDate.toLocaleString('ja-JP');
        }

        setupBackupAccordion();
        await updateBackupCount();

        if (unenrollBtn) {
            unenrollBtn.onclick = async () => {
                const isConfirmed = await showConfirm(
                    `本当に二段階認証を解除しますか？\nアカウントのセキュリティ強度が低下します。`,
                    "確認", "キャンセル", "解除する", true
                );
                if (!isConfirmed) return;

                const success = await unenrollMFA(activeFactor.id);
                if (success) {
                    showToast('二段階認証を解除しました', "success");
                    checkAndRenderMFA();
                }
            };
        }
    } else {
        unregisteredArea?.classList.add('active');
        registeredArea?.classList.remove('active');
        setupMFAEvent();
    }
}

function setupMFAEvent() {
    const enrollBtn = document.getElementById('btn-mfa-enroll');
    const setupArea = document.getElementById('mfa-setup-area');
    const secretKeyElement = document.getElementById('mfa-secret-key');
    const verifyBtn = document.getElementById('btn-mfa-verify');

    let currentFactorId = null;

    if (enrollBtn) {
        enrollBtn.onclick = async () => {
            const mfaData = await enrollMFA();
            if (mfaData) {
                currentFactorId = mfaData.id;
                if (secretKeyElement) secretKeyElement.textContent = mfaData.totp.secret;
                if (setupArea) setupArea.classList.add('active');
                enrollBtn.disabled = true;
            }
        };
    }

    if (verifyBtn) {
        verifyBtn.onclick = async () => {
            const codeInput = document.getElementById('mfa-code-input').value;
            if (codeInput.length !== 6) {
                showToast('6桁の数字を入力してください', 'error');
                return;
            }

            const success = await challengeAndVerifyMFA(currentFactorId, codeInput);
            if (success) {
                showToast('二段階認証を設定しました', "success");
                checkAndRenderMFA();
                const backupCodes = await createAndSaveBackupCodes();
                if (backupCodes) {
                    showGeneratedBackupCodes(backupCodes);
                    await updateBackupCount();
                }
            }
        };
    }
}