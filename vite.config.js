import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/AnalyWallet/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'login/index.html'),
                login: resolve(__dirname, 'about/index.html')
            }
        }
    }
})