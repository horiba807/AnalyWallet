import pkg from '@/../../package.json';

//==========================================================================
// バージョン番号の描画
//==========================================================================
export function renderAppVersion() {
    const appVerElement = document.getElementById('app-version');
    if (appVerElement) {
        appVerElement.textContent = `Ver. ${pkg.version}`;
    }
}