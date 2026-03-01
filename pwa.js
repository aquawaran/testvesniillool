// PWA функционал
const pwaManager = {
    deferredPrompt: null,
    isInstalled: false,
    
    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.checkInstallStatus();
        this.setupInstallButton();
    },
    
    // Регистрация Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                
                // Проверяем обновления
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    },
    
    // Настройка промпта установки
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('Install prompt available');
            // НЕ показываем баннер автоматически
            // this.showInstallBanner();
        });
        
        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            this.hideInstallBanner();
            this.showInstallSuccess();
            this.updateInstallButton();
        });
    },
    
    // Проверка статуса установки
    checkInstallStatus() {
        // Проверяем, запущено ли приложение в standalone режиме
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true;
        
        if (this.isInstalled) {
            console.log('App is running in standalone mode');
        }
    },
    
    // Показать баннер установки
    showInstallBanner() {
        if (this.isInstalled) return;
        
        const banner = document.createElement('div');
        banner.id = 'installBanner';
        banner.className = 'install-banner';
        banner.innerHTML = `
            <div class="install-banner-content">
                <div class="install-banner-info">
                    <span class="install-banner-icon">📱</span>
                    <div class="install-banner-text">
                        <strong>Установите Clone</strong>
                        <div>Добавьте на главный экран для быстрого доступа</div>
                    </div>
                </div>
                <div class="install-banner-actions">
                    <button id="installBannerBtn" class="install-banner-btn">Установить</button>
                    <button id="installBannerClose" class="install-banner-close">×</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // Обработчики кнопок
        document.getElementById('installBannerBtn').addEventListener('click', () => {
            this.installApp();
        });
        
        document.getElementById('installBannerClose').addEventListener('click', () => {
            this.hideInstallBanner();
        });
        
        // Показываем баннер с задержкой
        setTimeout(() => {
            banner.classList.add('show');
        }, 2000);
    },
    
    // Скрыть баннер установки
    hideInstallBanner() {
        const banner = document.getElementById('installBanner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
            }, 300);
        }
    },
    
    // Установка приложения
    async installApp() {
        if (!this.deferredPrompt) {
            this.showManualInstallInstructions();
            return;
        }
        
        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
            this.hideInstallBanner();
        } catch (error) {
            console.error('Error during app installation:', error);
            this.showManualInstallInstructions();
        }
    },
    
    // Показать инструкции по ручной установке
    showManualInstallInstructions() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'installInstructionsModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📱 Как установить приложение</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="install-instructions">
                        <div class="instruction-step">
                            <strong>Chrome (Android):</strong>
                            <ol>
                                <li>Нажмите на меню (три точки) в браузере</li>
                                <li>Выберите "Добавить на главный экран"</li>
                                <li>Нажмите "Добавить"</li>
                            </ol>
                        </div>
                        <div class="instruction-step">
                            <strong>Safari (iOS):</strong>
                            <ol>
                                <li>Нажмите на кнопку "Поделиться"</li>
                                <li>Прокрутите вниз и выберите "На экран «Домой»"</li>
                                <li>Нажмите "Добавить"</li>
                            </ol>
                        </div>
                        <div class="instruction-step">
                            <strong>Другие браузеры:</strong>
                            <p>Ищите опцию "Добавить на главный экран" или "Install as app" в меню браузера</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('show');
    },
    
    // Настройка кнопки в настройках
    setupInstallButton() {
        // Ждем загрузки настроек
        setTimeout(() => {
            const settingsModal = document.getElementById('settingsModal');
            if (!settingsModal) {
                console.log('Settings modal not found, retrying...');
                setTimeout(() => this.setupInstallButton(), 1000);
                return;
            }
            
            const modalBody = settingsModal.querySelector('.modal-body');
            if (!modalBody) return;
            
            // Создаем секцию PWA в настройках
            const pwaSection = document.createElement('div');
            pwaSection.className = 'settings-section';
            pwaSection.innerHTML = `
                <h4>📱 Мобильное приложение</h4>
                <div id="pwaInstallSection">
                    <p id="pwaStatusText">Проверка статуса установки...</p>
                    <button id="pwaInstallBtn" class="btn-primary" style="display: none;">
                        📱 Установить приложение
                    </button>
                    <button id="pwaUninstallBtn" class="btn-secondary" style="display: none;">
                        🗑️ Удалить приложение
                    </button>
                    <div class="pwa-features">
                        <small>
                            ✅ Офлайн режим<br>
                            ✅ Push-уведомления<br>
                            ✅ Быстрый запуск<br>
                            ✅ Полноэкранный режим
                        </small>
                    </div>
                </div>
            `;
            
            // Ищем секцию "Опасные действия"
            const dangerousSection = Array.from(modalBody.querySelectorAll('.settings-section')).find(section => {
                const h4 = section.querySelector('h4');
                return h4 && h4.textContent.includes('Опасные действия');
            });
            
            if (dangerousSection) {
                modalBody.insertBefore(pwaSection, dangerousSection);
            } else {
                modalBody.appendChild(pwaSection);
            }
            
            this.updateInstallButton();
            
            // Обработчики кнопок
            document.getElementById('pwaInstallBtn').addEventListener('click', () => {
                this.installApp();
            });
            
            document.getElementById('pwaUninstallBtn').addEventListener('click', () => {
                this.showUninstallInstructions();
            });
        }, 500);
    },
    
    // Обновить статус кнопки установки
    updateInstallButton() {
        const statusText = document.getElementById('pwaStatusText');
        const installBtn = document.getElementById('pwaInstallBtn');
        const uninstallBtn = document.getElementById('pwaUninstallBtn');
        
        if (!statusText || !installBtn || !uninstallBtn) return;
        
        if (this.isInstalled) {
            statusText.textContent = '✅ Приложение установлено на устройстве';
            installBtn.style.display = 'none';
            uninstallBtn.style.display = 'inline-block';
        } else if (this.deferredPrompt) {
            statusText.textContent = '📱 Доступна установка одним кликом';
            installBtn.style.display = 'inline-block';
            uninstallBtn.style.display = 'none';
        } else {
            statusText.textContent = '📱 Установите приложение для лучшего опыта';
            installBtn.style.display = 'inline-block';
            uninstallBtn.style.display = 'none';
        }
    },
    
    // Показать инструкции по удалению
    showUninstallInstructions() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'uninstallInstructionsModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🗑️ Как удалить приложение</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="uninstall-instructions">
                        <div class="instruction-step">
                            <strong>Android:</strong>
                            <p>Удерживайте иконку приложения на главном экране и выберите "Удалить"</p>
                        </div>
                        <div class="instruction-step">
                            <strong>iOS:</strong>
                            <p>Удерживайте иконку приложения на главном экране и выберите "Удалить приложение"</p>
                        </div>
                        <div class="instruction-step">
                            <strong>Chrome OS:</strong>
                            <p>Откройте chrome://apps, нажмите правой кнопкой на иконку и выберите "Удалить"</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('show');
    },
    
    // Показать уведомление об обновлении
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-notification-content">
                <span>🔄 Доступна новая версия Clone</span>
                <button id="updateBtn" class="update-btn">Обновить</button>
                <button id="updateClose" class="update-close">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        document.getElementById('updateBtn').addEventListener('click', () => {
            window.location.reload();
        });
        
        document.getElementById('updateClose').addEventListener('click', () => {
            notification.remove();
        });
    },
    
    // Показать успешную установку
    showInstallSuccess() {
        const notification = document.createElement('div');
        notification.className = 'install-success-notification';
        notification.innerHTML = `
            <div class="install-success-content">
                <span>✅ Clone успешно установлен на устройстве!</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
};

// Инициализация PWA при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    pwaManager.init();
});

// Экспорт для использования в других скриптах
window.pwaManager = pwaManager;
