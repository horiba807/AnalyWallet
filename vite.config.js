import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/AnalyWallet/',
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                app: path.resolve(__dirname, 'app/index.html'),
                login: path.resolve(__dirname, 'app/login/index.html'),
                about: path.resolve(__dirname, 'about/index.html')
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './app/script'), // @ を app/script へのショートカットに設定
        },
    },
});