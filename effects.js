// 按钮点击水波纹效果
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.btn-ripple').forEach(button => {
        button.addEventListener('click', function(e) {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.style.width = ripple.style.height = Math.max(button.offsetWidth, button.offsetHeight) + 'px';
            ripple.style.left = x - ripple.offsetWidth / 2 + 'px';
            ripple.style.top = y - ripple.offsetHeight / 2 + 'px';
            ripple.classList.add('ripple-effect');
            
            button.appendChild(ripple);
            
            // 移除水波纹
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// 页面加载完成显示问候
function showWelcomeToast() {
    if (sessionStorage.getItem('welcomeShown')) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification info';
    toast.innerHTML = '<i class="fas fa-smile"></i> 欢迎使用学籍在线验证报告编辑器！';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 3000);
    
    sessionStorage.setItem('welcomeShown', 'true');
}

// 页面加载完成后显示欢迎消息
window.addEventListener('load', function() {
    showWelcomeToast();
});
