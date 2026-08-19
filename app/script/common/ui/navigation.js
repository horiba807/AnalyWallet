//==========================================================================
// メニューアイコン・ドロワーメニューのナビゲーション
//==========================================================================
export function setupHeaderMenu() {
    const menuBtn = document.getElementById('header_menu_icon');
    if (!menuBtn) return;

    menuBtn.addEventListener("click", () => {
        const headerMenu = document.getElementById('header_menu');
        const icon = document.getElementById('menuIcon');
        const headerNav = document.getElementById('sm_navlist');
        const headerLogo = document.getElementById('header-logo');
        const headerNavList = document.getElementById('header-nav');

        headerMenu.classList.toggle('active');
        headerNav.classList.toggle('remove');

        if (headerMenu.classList.contains('active')) {
            icon.textContent = "close";
            document.body.classList.add('no-scroll');
            headerLogo.classList.add('no-display');
            headerNavList.classList.add('no-display');
        } else {
            icon.textContent = "menu";
            document.body.classList.remove('no-scroll');
            headerLogo.classList.remove('no-display');
            headerNavList.classList.remove('no-display');
        }
    });
}

//==========================================================================
// ドロワーメニューのタブ切り替え
//==========================================================================
export function setupTabNavigation() {
    const menuButtons = document.querySelectorAll('.drawer-menu__tab.btn');
    menuButtons.forEach(btn => {
        btn.addEventListener("click", function () {
            menuButtons.forEach(b => {
                b.classList.remove('active');
                const targetId = b.dataset.target;
                document.getElementById(targetId)?.classList.remove('active');
            });

            this.classList.add('active');
            const currentTargetId = this.dataset.target;
            document.getElementById(currentTargetId)?.classList.add('active');
        });
    });
}