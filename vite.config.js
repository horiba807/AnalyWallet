import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/AnalyWallet/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'app/index.html'),
                login: resolve(__dirname, 'app/login/index.html'),
                about: resolve(__dirname, 'about/index.html')
            }
        }
    }
})