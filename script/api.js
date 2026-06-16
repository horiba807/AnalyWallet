async function fetchTransactions() {
    const { data, error } = await supabaseClient
        .from('transactions')
        .select('*');

    if (error) {
        console.error("読み込みエラー:", error);
    } else {
        history = data || [];
        updateHistoryDisplay();
    }
}