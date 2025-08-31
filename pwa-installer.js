// PWA Install Helper
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
        this.init();
    }

    init() {
        // ฟัง event สำหรับ install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('💡 PWA Install prompt available');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallUI();
        });

        // ฟัง event เมื่อ app ถูกติดตั้ง
        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA installed successfully');
            this.hideInstallUI();
            this.showInstalledMessage();
        });

        // เช็คว่าใช้งานใน standalone mode หรือไม่
        if (this.isStandalone) {
            console.log('📱 Running in standalone mode');
            this.hideInstallUI();
        }

        // สร้าง install banner
        this.createInstallBanner();
        
        // Register service worker
        this.registerServiceWorker();
    }

    // สร้าง install banner
    createInstallBanner() {
        // เช็คว่ามี banner อยู่แล้วหรือไม่
        if (document.getElementById('pwa-install-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-install-banner hidden';
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-info">
                    <div class="pwa-banner-icon">
                        <i class="fas fa-mobile-alt"></i>
                    </div>
                    <div class="pwa-banner-text">
                        <h4>ติดตั้ง TDM แอปบนมือถือ</h4>
                        <p>เพื่อใช้งานได้แม้ไม่มีเน็ต และเข้าถึงได้เร็วขึ้น</p>
                    </div>
                </div>
                <div class="pwa-banner-actions">
                    <button class="pwa-install-btn" onclick="pwaInstaller.install()">
                        <i class="fas fa-download"></i> ติดตั้ง
                    </button>
                    <button class="pwa-close-btn" onclick="pwaInstaller.hideInstallUI()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        // เพิ่ม styles
        const style = document.createElement('style');
        style.textContent = `
            .pwa-install-banner {
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff7f00, #ff6500);
                color: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 9999;
                transition: all 0.3s ease;
                max-width: 500px;
                margin: 0 auto;
            }
            
            .pwa-install-banner.hidden {
                transform: translateY(100px);
                opacity: 0;
                pointer-events: none;
            }
            
            .pwa-banner-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 15px 20px;
                gap: 15px;
            }
            
            .pwa-banner-info {
                display: flex;
                align-items: center;
                gap: 15px;
                flex: 1;
            }
            
            .pwa-banner-icon {
                font-size: 32px;
                opacity: 0.9;
            }
            
            .pwa-banner-text h4 {
                margin: 0 0 5px 0;
                font-size: 16px;
                font-weight: 600;
            }
            
            .pwa-banner-text p {
                margin: 0;
                font-size: 13px;
                opacity: 0.9;
                line-height: 1.3;
            }
            
            .pwa-banner-actions {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .pwa-install-btn {
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            }
            
            .pwa-install-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-1px);
            }
            
            .pwa-close-btn {
                background: transparent;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 8px;
                border-radius: 4px;
                opacity: 0.7;
                transition: opacity 0.3s ease;
            }
            
            .pwa-close-btn:hover {
                opacity: 1;
            }
            
            @media (max-width: 768px) {
                .pwa-install-banner {
                    left: 10px;
                    right: 10px;
                    bottom: 10px;
                }
                
                .pwa-banner-content {
                    padding: 12px 15px;
                }
                
                .pwa-banner-text h4 {
                    font-size: 15px;
                }
                
                .pwa-banner-text p {
                    font-size: 12px;
                }
            }
            
            /* Slide up animation */
            @keyframes slideUp {
                from {
                    transform: translateY(100px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .pwa-install-banner.show {
                animation: slideUp 0.3s ease-out;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(banner);
    }

    // แสดง install UI
    showInstallUI() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner && !this.isStandalone) {
            banner.classList.remove('hidden');
            banner.classList.add('show');
        }
    }

    // ซ่อน install UI
    hideInstallUI() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.classList.add('hidden');
            banner.classList.remove('show');
        }
    }

    // ติดตั้งแอป
    async install() {
        if (!this.deferredPrompt) {
            console.log('❌ Install prompt not available');
            return;
        }

        try {
            // แสดง install prompt
            this.deferredPrompt.prompt();
            
            // รอการเลือกของ user
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('✅ User accepted PWA install');
            } else {
                console.log('❌ User dismissed PWA install');
            }
            
            // ล้าง prompt
            this.deferredPrompt = null;
            this.hideInstallUI();
            
        } catch (error) {
            console.error('❌ Install error:', error);
        }
    }

    // แสดงข้อความเมื่อติดตั้งสำเร็จ
    showInstalledMessage() {
        // สร้าง toast notification
        const toast = document.createElement('div');
        toast.className = 'pwa-install-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-check-circle"></i>
                <span>ติดตั้งแอปเรียบร้อยแล้ว!</span>
            </div>
        `;

        // เพิ่ม styles สำหรับ toast
        const style = document.createElement('style');
        style.textContent = `
            .pwa-install-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                animation: toastSlideIn 0.3s ease-out;
            }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            @keyframes toastSlideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(toast);

        // ลบ toast หลัง 3 วินาที
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Register service worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('🔧 Registering service worker...');
                const registration = await navigator.serviceWorker.register('./sw.js');
                
                console.log('✅ Service Worker registered:', registration);
                
                // ฟัง updates
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Service Worker update found');
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🎉 New service worker installed');
                            this.showUpdateAvailable();
                        }
                    });
                });
                
                // Register for background sync
                if ('sync' in registration) {
                    console.log('🔄 Background sync supported');
                }
                
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        } else {
            console.log('❌ Service Worker not supported');
        }
    }

    // แสดงการอัปเดต
    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #007bff;
                color: white;
                padding: 10px 20px;
                text-align: center;
                z-index: 9999;
                font-size: 14px;
            ">
                <i class="fas fa-sync-alt"></i>
                เวอร์ชันใหม่พร้อมใช้งาน
                <button onclick="window.location.reload()" style="
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    margin-left: 10px;
                    cursor: pointer;
                ">อัปเดตเลย</button>
                <button onclick="this.parentElement.remove()" style="
                    background: transparent;
                    border: none;
                    color: white;
                    margin-left: 10px;
                    cursor: pointer;
                    font-size: 16px;
                ">×</button>
            </div>
        `;
        document.body.appendChild(updateBanner);
    }
}

// สร้าง instance ใหม่เมื่อ DOM โหลดเสร็จ
let pwaInstaller;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        pwaInstaller = new PWAInstaller();
    });
} else {
    pwaInstaller = new PWAInstaller();
}
