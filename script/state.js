export const moneyForm = document.getElementById('money-form');
export let state = {
    history: [],
    myChart: null, // グラフのインスタンスを保持する変数
    lineChart: null,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    currentCategory: 'all',
    isLoginMode: true, // ログインか新規登録かのフラグ
    editingId: null, // 編集中のID
    transactions: [],
    categories: {
        expense: [],
        income: []
    }
    
};