// 初始化PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// 全局变量
let photoData = null;
let pdfDoc = null;
let currentPage = 1;
let zoomLevel = 1;
let pdfCanvas = null;
let pdfBytes = null;
let templateImage = null;
let editableFields = {};

// 计数器相关变量
let visitCount = 0;
let downloadCount = 0;

// 预览垂直偏移，用于微调字段位置
const previewYOffset = 5;

// PDF文件路径
const PDF_URL = '11.pdf';

// 字段映射 - 字段名称和准确位置信息（基于模板）
const fieldPositions = {
    name: { page: 1, x: 279, y: 200, width: 300, height: 25, defaultValue: '' },
    gender: { page: 1, x: 279, y: 242, width: 300, height: 25, defaultValue: '' },
    birthDate: { page: 1, x: 279, y: 285, width: 300, height: 25, defaultValue: '' },
    ethnicity: { page: 1, x: 279, y: 329, width: 300, height: 25, defaultValue: '' },
    schoolName: { page: 1, x: 279, y: 373, width: 300, height: 25, defaultValue: '' },
    educationLevel: { page: 1, x: 279, y: 416, width: 300, height: 25, defaultValue: '' },
    major: { page: 1, x: 279, y: 459, width: 350, height: 25, defaultValue: '' },
    programDuration: { page: 1, x: 279, y: 503, width: 300, height: 25, defaultValue: '' },
    educationCategory: { page: 1, x: 279, y: 547, width: 300, height: 25, defaultValue: '' },
    studyMode: { page: 1, x: 279, y: 590, width: 300, height: 25, defaultValue: '' },
    school: { page: 1, x: 279, y: 633, width: 300, height: 25, defaultValue: '' },
    department: { page: 1, x: 279, y: 678, width: 300, height: 25, defaultValue: '' },
    enrollmentDate: { page: 1, x: 279, y: 721, width: 300, height: 25, defaultValue: '' },
    academicStatus: { page: 1, x: 279, y: 765, width: 350, height: 25, defaultValue: '' },
    graduationDate: { page: 1, x: 279, y: 809, width: 300, height: 25, defaultValue: '' },
    photo: { page: 1, x: 600, y: 150, width: 120, height: 160 }
};

// 动态加载所需的库
function loadScripts() {
    return new Promise((resolve, reject) => {
        // 加载html2canvas
        const html2canvasScript = document.createElement('script');
        html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        html2canvasScript.onload = () => {
            // html2canvas加载完成后，加载jspdf
            const jspdfScript = document.createElement('script');
            jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            jspdfScript.onload = resolve;
            jspdfScript.onerror = reject;
            document.head.appendChild(jspdfScript);
        };
        html2canvasScript.onerror = reject;
        document.head.appendChild(html2canvasScript);
    });
}

// 更新计数器显示
function updateCounters() {
    document.getElementById('visitCounter').textContent = visitCount;
    document.getElementById('downloadCounter').textContent = downloadCount;
}

// 从 localStorage 加载计数器数据
function loadCounters() {
    const storedVisitCount = localStorage.getItem('visitCount');
    const storedDownloadCount = localStorage.getItem('downloadCount');
    
    visitCount = storedVisitCount ? parseInt(storedVisitCount) : 0;
    downloadCount = storedDownloadCount ? parseInt(storedDownloadCount) : 0;
    
    // 增加访问次数
    visitCount++;
    localStorage.setItem('visitCount', visitCount.toString());
    
    // 更新显示
    updateCounters();
}

// 增加下载次数
function incrementDownloadCount() {
    downloadCount++;
    localStorage.setItem('downloadCount', downloadCount.toString());
    updateCounters();
}

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    // 显示提示信息
    showMessage('正在加载PDF文件和相关库，请稍候...');
    
    try {
        // 加载所需脚本
        await loadScripts();
        
        // 加载计数器
        loadCounters();
        
        // 加载PDF并创建模板
        await initApp();
        
        // 照片上传预览
        const photoInput = document.getElementById('photo');
        const photoPreview = document.getElementById('photoPreview');

        // 添加窗口大小改变事件监听器 - 延迟重绘以提高性能
        let resizeTimer;
        const handleResize = async function() {
            // 显示加载状态，防止用户在重绘期间操作
            const pdfViewer = document.getElementById('pdfViewer');
            const templateContainer = pdfViewer.querySelector('.template-container');
            
            if (templateContainer) {
                // 在重绘前先添加调整中的视觉提示
                templateContainer.style.opacity = '0.5';
                templateContainer.style.transition = 'opacity 0.2s ease';
            }
            
            // 延迟重绘
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(async () => {
                if (pdfDoc) {
                    // 重新创建模板
                    await createEditableTemplate();
                    
                    // 重新应用表单数据到模板
                    const formData = getFormData();
                    updateTemplateWithFormData(formData);
                }
            }, 250);
        };
        
        window.addEventListener('resize', debounce(handleResize, 200, false));

        photoInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    photoData = e.target.result;
                    
                    // 更新照片预览
                    const img = document.createElement('img');
                    img.src = photoData;
                    photoPreview.innerHTML = '';
                    photoPreview.appendChild(img);
                    
                    // 更新PDF上的照片字段
                    if (editableFields.photo) {
                        const photoImg = document.createElement('img');
                        photoImg.src = photoData;
                        photoImg.style.width = '100%';
                        photoImg.style.height = '100%';
                        photoImg.style.objectFit = 'cover';
                        
                        editableFields.photo.innerHTML = '';
                        editableFields.photo.appendChild(photoImg);
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // 表单字段变更事件
        const formInputs = document.querySelectorAll('#infoForm input, #infoForm select');
        formInputs.forEach(input => {
            if (input.type !== 'file') {
                input.addEventListener('change', function() {
                    const fieldName = this.id;
                    let value = this.value;
                    
                    // 处理特殊字段
                    if (fieldName === 'gender') {
                        value = this.value === 'Male' ? 'Male' : 'Female';
                    } else if (fieldName === 'birthDate' || fieldName === 'enrollmentDate' || fieldName === 'graduationDate') {
                        value = formatDate(this.value);
                    } else if (fieldName === 'programDuration') {
                        value = this.value + ' years';
                    }
                    
                    // 更新可编辑字段
                    if (editableFields[fieldName]) {
                        editableFields[fieldName].textContent = value;
                    }
                });
            }
        });

        // 下载PDF按钮点击事件
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.addEventListener('click', () => {
            if (!validateForm()) {
                return;
            }
            
            generatePDF();
        });
    } catch (error) {
        console.error('初始化失败:', error);
        hideMessage();
    }
});

// 防抖函数 - 增强版，支持立即执行选项
function debounce(func, wait, immediate = false) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// 初始化应用
async function initApp() {
    try {
        // 加载原始PDF作为模板
        await loadTemplateImage();
        
        // 创建预览
        await createEditableTemplate();
        
        // 填充表单默认值
        populateFormWithDefaults();
        
        hideMessage();
    } catch (error) {
        console.error('应用初始化失败:', error);
        showMessage('无法加载PDF模板，请确保使用本地服务器运行此应用');
    }
}

// 加载PDF模板并转换为图像
async function loadTemplateImage() {
    try {
        showLoading('加载PDF模板中...');
        
        // 使用fetch获取PDF数据
        const response = await fetch(PDF_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 获取PDF的ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        pdfBytes = new Uint8Array(arrayBuffer);
        
        // 使用PDF.js渲染PDF
        const loadingTask = pdfjsLib.getDocument({data: pdfBytes});
        pdfDoc = await loadingTask.promise;
        
        // 获取第一页
        const page = await pdfDoc.getPage(1);
        
        // 设置合适的缩放比例 - 根据容器宽度自适应
        const pdfViewer = document.getElementById('pdfViewer');
        const containerWidth = pdfViewer.clientWidth - 40; // 减去内边距
        const pdfOriginalWidth = page.getViewport({ scale: 1 }).width;
        let scale = 1.5;
        
        // 如果容器宽度小于PDF原始宽度的1.5倍，则调整缩放比例
        if (containerWidth < pdfOriginalWidth * 1.5) {
            scale = containerWidth / pdfOriginalWidth;
        }
        
        const viewport = page.getViewport({ scale: scale });
        
        // 创建canvas来渲染PDF页面
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        
        // 渲染PDF页面到canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // 将canvas转换为图像
        templateImage = {
            src: canvas.toDataURL('image/png'),
            width: viewport.width,
            height: viewport.height
        };
        
        hideLoading();
    } catch (error) {
        console.error('加载PDF模板失败:', error);
        hideLoading();
        throw error;
    }
}

// 创建可编辑的模板
async function createEditableTemplate() {
    // 准备PDF查看器
    const pdfViewer = document.getElementById('pdfViewer');
    
    // 显示加载指示器
    pdfViewer.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><div>正在渲染预览...</div></div>';
    
    // 获取PDF查看器的宽度
    const viewerWidth = pdfViewer.clientWidth - 40; // 减去内边距
    
    // 加一点延迟以显示加载指示器
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 计算合适的缩放比例
    const scale = Math.min(1, viewerWidth / templateImage.width);
    const scaledWidth = templateImage.width * scale;
    const scaledHeight = templateImage.height * scale;
    
    // 清除加载指示器
    pdfViewer.innerHTML = '';
    
    // 创建模板容器
    const templateContainer = document.createElement('div');
    templateContainer.className = 'template-container';
    templateContainer.style.position = 'relative';
    templateContainer.style.width = `${scaledWidth}px`;
    templateContainer.style.height = `${scaledHeight}px`;
    templateContainer.style.margin = '0 auto'; // 居中显示
    templateContainer.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; // 添加阴影
    
    // 添加模板背景图
    const bgImage = document.createElement('img');
    bgImage.src = templateImage.src;
    bgImage.style.width = '100%';
    bgImage.style.height = '100%';
    bgImage.style.position = 'absolute';
    bgImage.style.top = '0';
    bgImage.style.left = '0';
    bgImage.style.zIndex = '1';
    bgImage.style.maxWidth = '100%'; // 确保不超出容器
    bgImage.style.objectFit = 'contain'; // 保持比例
    templateContainer.appendChild(bgImage);
    
    // 创建可编辑字段
    for (const [fieldName, position] of Object.entries(fieldPositions)) {
        if (fieldName !== 'photo') {
            // 创建文本字段
            const fieldElement = document.createElement('div');
            fieldElement.className = 'editable-field';
            fieldElement.dataset.field = fieldName;
            fieldElement.textContent = position.defaultValue || '';
            
            // 根据缩放比例调整位置和大小
            fieldElement.style.position = 'absolute';
            fieldElement.style.left = `${position.x * scale}px`;
            fieldElement.style.top = `${(position.y - previewYOffset) * scale}px`;
            fieldElement.style.width = `${position.width * scale}px`;
            fieldElement.style.height = `${position.height * scale}px`;
            fieldElement.style.zIndex = '10';
            
            // 添加点击事件
            fieldElement.addEventListener('click', () => {
                // 聚焦对应的表单输入
                const inputElement = document.getElementById(fieldName);
                if (inputElement) {
                    inputElement.focus();
                }
                
                // 高亮当前字段
                for (const el of Object.values(editableFields)) {
                    el.classList.remove('active-field');
                }
                fieldElement.classList.add('active-field');
            });
            
            templateContainer.appendChild(fieldElement);
            editableFields[fieldName] = fieldElement;
        } else {
            // 创建照片字段
            const photoField = document.createElement('div');
            photoField.className = 'editable-field photo-field';
            photoField.dataset.field = 'photo';
            
            // 根据缩放比例调整位置和大小
            photoField.style.position = 'absolute';
            photoField.style.left = `${position.x * scale}px`;
            photoField.style.top = `${(position.y - previewYOffset) * scale}px`;
            photoField.style.width = `${position.width * scale}px`;
            photoField.style.height = `${position.height * scale}px`;
            photoField.style.zIndex = '10';
            
            photoField.innerHTML = '<div style="text-align: center; padding-top: 40%;">点击上传照片</div>';
            
            // 添加点击事件
            photoField.addEventListener('click', () => {
                // 点击触发文件上传
                document.getElementById('photo').click();
            });
            
            templateContainer.appendChild(photoField);
            editableFields.photo = photoField;
        }
    }
    
    // 添加水印 - 使用单一大水印
    // 根据PDF大小计算合适的水印大小
    const pdfWidth = scaledWidth;  // 使用缩放后的宽度
    const watermarkSize = Math.min(50, pdfWidth * 0.12); // 水印大小与PDF宽度相关，但最大为50px
    
    // 创建中央大水印
    const centerWm = document.createElement('div');
    centerWm.className = 'watermark';
    centerWm.textContent = '绝密';
    centerWm.style.position = 'absolute';
    centerWm.style.left = `${scaledWidth / 2}px`;
    centerWm.style.top = `${scaledHeight / 2}px`;
    centerWm.style.fontSize = `${watermarkSize}px`;
    centerWm.style.opacity = '0.2';  // 更透明
    templateContainer.appendChild(centerWm);
    
    // 添加四个角的小水印
    const cornerSize = Math.min(30, pdfWidth * 0.06); // 角落水印更小
    const cornerPositions = [
        { x: scaledWidth * 0.2, y: scaledHeight * 0.2 }, // 左上
        { x: scaledWidth * 0.8, y: scaledHeight * 0.2 }, // 右上
        { x: scaledWidth * 0.2, y: scaledHeight * 0.8 }, // 左下
        { x: scaledWidth * 0.8, y: scaledHeight * 0.8 }  // 右下
    ];
    
    cornerPositions.forEach(pos => {
        const wm = document.createElement('div');
        wm.className = 'watermark';
        wm.textContent = '绝密';
        wm.style.position = 'absolute';
        wm.style.left = `${pos.x}px`;
        wm.style.top = `${pos.y}px`;
        wm.style.fontSize = `${cornerSize}px`;
        wm.style.opacity = '0.15';
        templateContainer.appendChild(wm);
    });
    // 裁剪底部灰色空白区域（留出顶部内容）
    templateContainer.style.clipPath = 'inset(0% 0% 15% 0%)';
    
    // 添加到预览区
    pdfViewer.appendChild(templateContainer);
}

// 更新模板中的表单数据
function updateTemplateWithFormData(formData) {
    // 更新每个字段的内容
    for (const [fieldName, value] of Object.entries(formData)) {
        if (fieldName !== 'photo' && editableFields[fieldName]) {
            editableFields[fieldName].textContent = value;
        }
    }
    
    // 更新照片(如果有)
    if (formData.photo && editableFields.photo) {
        const photoImg = document.createElement('img');
        photoImg.src = formData.photo;
        photoImg.style.width = '100%';
        photoImg.style.height = '100%';
        photoImg.style.objectFit = 'cover';
        
        editableFields.photo.innerHTML = '';
        editableFields.photo.appendChild(photoImg);
    }
}

// 填充表单默认值
function populateFormWithDefaults() {
    for (const [fieldName, fieldInfo] of Object.entries(fieldPositions)) {
        if (fieldInfo.defaultValue && fieldName !== 'photo') {
            const inputElement = document.getElementById(fieldName);
            if (inputElement) {
                // 特殊处理日期字段
                if (fieldName === 'birthDate' || fieldName === 'enrollmentDate' || fieldName === 'graduationDate') {
                    // 尝试转换为HTML日期输入格式 (YYYY-MM-DD)
                    const dateValue = parseDate(fieldInfo.defaultValue);
                    if (dateValue) {
                        inputElement.value = dateValue;
                    }
                } 
                // 处理学制
                else if (fieldName === 'programDuration') {
                    const durationMatch = fieldInfo.defaultValue.match(/(\d+)/);
                    if (durationMatch) {
                        inputElement.value = durationMatch[1];
                    }
                }
                // 处理其他字段
                else {
                    inputElement.value = fieldInfo.defaultValue;
                }
            }
        }
    }
}

// 生成PDF
async function generatePDF() {
    try {
        showLoading('生成PDF中...');
        // 获取表单数据
        const data = getFormData();
        // 加载原始 PDF
        const existingPdfBytes = await fetch(PDF_URL).then(res => res.arrayBuffer());
        const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
        // 嵌入 Minion Pro 字体，失败时回退 Helvetica
        let font;
        try {
          const fontBytes = await fetch('MinionPro-Regular.ttf').then(res => res.arrayBuffer());
          font = await pdfDoc.embedFont(fontBytes);
        } catch (err) {
          console.warn('Minion Pro 加载失败，使用 Arial 回退', err);
          font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        }
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width: pageWidth, height: pageHeight } = firstPage.getSize();
        const scale = 1.5;
        // 绘制文本字段
        Object.entries(fieldPositions).forEach(([fieldName, position]) => {
            if (fieldName === 'photo') return;
            // 略微缩小字体，与左侧表单保持一致
            const baseSize = Math.min(position.height / scale * 0.8, position.height / scale);
            const fontSize = baseSize * 0.8;
            const text = data[fieldName] || '';
            const x = position.x / scale;
            const y = pageHeight - position.y / scale - fontSize + (fontSize * 0.2);
            firstPage.drawText(text, { x, y, size: fontSize, font });
        });
        // 绘制照片字段
        if (data.photo) {
            // 支持 PNG 和 JPEG 格式
            let img;
            if (data.photo.startsWith('data:image/jpeg') || data.photo.startsWith('data:image/jpg')) {
                img = await pdfDoc.embedJpg(data.photo);
            } else {
                img = await pdfDoc.embedPng(data.photo);
            }
            const pos = fieldPositions.photo;
            const imgWidth = pos.width / scale;
            const imgHeight = pos.height / scale;
            const x = pos.x / scale;
            const y = pageHeight - pos.y / scale - imgHeight;
            firstPage.drawImage(img, { x, y, width: imgWidth, height: imgHeight });
        }
        // 保存并下载
        const newPdfBytes = await pdfDoc.save();
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '学籍在线验证报告.pdf';
        a.click();
        URL.revokeObjectURL(url);
        hideLoading();
        
        // 增加下载计数
        incrementDownloadCount();
    } catch (error) {
        console.error('生成PDF失败:', error);
        hideLoading();
        showMessage('生成PDF失败，请重试');
    }
}

// 显示消息
function showMessage(message, autoHideMs = 0, type = 'info') {
    const pdfViewer = document.getElementById('pdfViewer');
    
    // 检查是否已有消息元素
    let messageEl = pdfViewer.querySelector('.message-box');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'message-box';
        pdfViewer.appendChild(messageEl);
    }
    
    // 添加图标
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i> ';
            messageEl.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i> ';
            messageEl.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i> ';
            messageEl.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
    }
    
    messageEl.innerHTML = icon + message;
    messageEl.style.display = 'flex';
    messageEl.classList.add('slide-in-up');
    
    // 自动隐藏
    if (autoHideMs > 0) {
        setTimeout(() => {
            hideMessage();
        }, autoHideMs);
    }
}

// 隐藏消息
function hideMessage() {
    const messageEl = document.querySelector('.message-box');
    if (messageEl) {
        messageEl.classList.add('fade-out');
        setTimeout(() => {
            messageEl.style.display = 'none';
            messageEl.classList.remove('fade-out');
            messageEl.classList.remove('slide-in-up');
        }, 300);
    }
}

// 表单验证
function validateForm() {
    const form = document.getElementById('infoForm');
    const inputs = form.querySelectorAll('input, select');
    
    let isValid = true;
    
    inputs.forEach(input => {
        if (input.hasAttribute('required') && !input.value && input.type !== 'file') {
            input.style.borderColor = 'red';
            isValid = false;
        } else {
            input.style.borderColor = '#ddd';
        }
    });
    
    if (!isValid) {
        alert('请填写所有必填字段');
    }
    
    return isValid;
}

// 获取表单数据
function getFormData() {
    return {
        name: document.getElementById('name').value,
        gender: document.getElementById('gender').value,
        birthDate: formatDate(document.getElementById('birthDate').value),
        ethnicity: document.getElementById('ethnicity').value,
        schoolName: document.getElementById('schoolName').value,
        educationLevel: document.getElementById('educationLevel').value,
        major: document.getElementById('major').value,
        programDuration: document.getElementById('programDuration').value + ' years',
        educationCategory: document.getElementById('educationCategory').value,
        studyMode: document.getElementById('studyMode').value,
        school: document.getElementById('school').value,
        department: document.getElementById('department').value,
        enrollmentDate: formatDate(document.getElementById('enrollmentDate').value),
        academicStatus: document.getElementById('academicStatus').value,
        graduationDate: formatDate(document.getElementById('graduationDate').value),
        photo: photoData
    };
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// 解析日期文本为HTML日期输入格式 (YYYY-MM-DD)
function parseDate(dateText) {
    // 尝试解析多种日期格式
    
    // 格式: "Month DD, YYYY" (例如 "October 31, 2000")
    const formatMonthDDYYYY = /([a-zA-Z]+)\s+(\d{1,2}),\s+(\d{4})/;
    const match1 = dateText.match(formatMonthDDYYYY);
    if (match1) {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const month = monthNames.findIndex(m => m.toLowerCase() === match1[1].toLowerCase()) + 1;
        if (month > 0) {
            const day = match1[2].padStart(2, '0');
            const monthStr = month.toString().padStart(2, '0');
            return `${match1[3]}-${monthStr}-${day}`;
        }
    }

    // 格式: "YYYY-MM-DD"
    const formatYYYYMMDD = /(\d{4})-(\d{2})-(\d{2})/;
    const match2 = dateText.match(formatYYYYMMDD);
    if (match2) {
        return dateText;
    }

    // 格式: "YYYY年MM月DD日"
    const formatChineseDate = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
    const match3 = dateText.match(formatChineseDate);
    if (match3) {
        const month = match3[2].padStart(2, '0');
        const day = match3[3].padStart(2, '0');
        return `${match3[1]}-${month}-${day}`;
    }

    // 无法解析时返回空字符串
    return '';
}

// 显示加载提示
function showLoading(message) {
    // 检查是否已存在加载提示
    let loadingOverlay = document.querySelector('.loading-overlay');
    
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'loading-message';
        loadingMessage.textContent = message || '加载中...';
        
        loadingOverlay.appendChild(loadingMessage);
        document.body.appendChild(loadingOverlay);
    } else {
        const loadingMessage = loadingOverlay.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = message || '加载中...';
        }
        loadingOverlay.style.display = 'flex';
    }
}

// 隐藏加载提示
function hideLoading() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// 更新模板缩放
function updateTemplateZoom() {
    const pdfViewer = document.getElementById('pdfViewer');
    const templateContainer = pdfViewer.querySelector('.template-container');
    if (templateContainer) {
        const scale = 1.5;
        const newWidth = templateImage.width * scale;
        const newHeight = templateImage.height * scale;
        templateContainer.style.width = `${newWidth}px`;
        templateContainer.style.height = `${newHeight}px`;
        templateContainer.style.top = `-${previewYOffset * scale}px`;
    }
}