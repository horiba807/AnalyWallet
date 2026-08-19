import { state } from '@/common/state/state.js';
import { updateHistoryDisplay } from '@/features/dashboard/dashboardUi.js';

export function setupDashboardEvents() {
    // 初期ボタンのアクティブ化
    const initialBtn = document.querySelector(`.month_btn[data-month="${state.currentMonth}"]`);
    if (initialBtn) initialBtn.classList.add('active');

    // 年切り替え
    document.getElementById('prev-year')?.addEventListener('click', () => { state.currentYear--; updateHistoryDisplay(); });
    document.getElementById('next-year')?.addEventListener('click', () => { state.currentYear++; updateHistoryDisplay(); });

    // 月切り替え
    document.querySelectorAll('.month_btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.month_btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const val = btn.dataset.month; // "1"〜"12" または "annual"

            // 'annual' ならそのまま文字列、数字なら Number 型にしてセット
            state.currentMonth = (val === 'annual') ? 'annual' : Number(val);

            // 再描画を実行！
            updateHistoryDisplay();
        });
    });

    // カテゴリフィルター
    document.getElementById('filter-category')?.addEventListener('change', (e) => {
        state.currentCategory = e.target.value;
        updateHistoryDisplay();
    });
}