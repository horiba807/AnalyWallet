import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/',
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                app: path.resolve(__dirname, 'app/index.html'),
                login: path.resolve(__dirname, 'app/login/index.html'),
                reset: path.resolve(__dirname, 'app/login/reset.html'),
                privacy: path.resolve(__dirname, 'info/privacy.html'),
                terms: path.resolve(__dirname, 'info/terms.html'),
                contact: path.resolve(__dirname, 'info/contact.html'),


            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './app/script'), // @ を app/script へのショートカットに設定
        },
    },
});