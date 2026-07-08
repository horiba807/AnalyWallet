import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    // GitHubのリポジトリ名
    base: '/AnalyWallet/',
});

build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),       // トップページ
                login: resolve(__dirname, 'login/index.html'), // ログインページ
                about: resolve(__dirname, 'about/index.html'), 
            },
        },
    },
});