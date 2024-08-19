// ==UserScript==
// @name         星河生命周期显示
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  捕获请求头和负载，使用 fetch 发送请求并打印响应
// @match        *://rmt.jxrtv.com:82/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/yanchenur/test/main/display.js
// @downloadURL  https://raw.githubusercontent.com/yanchenur/test/main/display.js
// ==/UserScript==

(function() {
    'use strict';

    // 用于保存捕获的请求头和负载
    let capturedHeaders = {};
    let capturedPayload = null;
    let capturedUrl = null;
    let capturedMethod = null;
    const lifeCycleThresholdMin = 0; // 生命周期最小阈值
    const lifeCycleThresholdMax = 9800; // 生命周期最大阈值

    // 捕获 XMLHttpRequest 请求
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._requestMethod = method;
        this._requestUrl = url;
        this._requestHeaders = {}; // 用于存储请求头

        const originalSetRequestHeader = this.setRequestHeader;
        this.setRequestHeader = function(header, value) {
            this._requestHeaders[header] = value;
            originalSetRequestHeader.apply(this, arguments);
        };

        this.addEventListener('load', function() {
            if (this._requestUrl.includes('/resourcemanagerservice/api/search')) {
                capturedUrl = this._requestUrl;
                capturedMethod = this._requestMethod;
                capturedHeaders = this._requestHeaders;
                capturedPayload = this._requestData ? JSON.parse(this._requestData) : null;

                console.log('Captured XMLHttpRequest Details:');
                console.log('URL:', capturedUrl);
                console.log('Method:', capturedMethod);
                console.log('Headers:', capturedHeaders);
                console.log('Payload:', capturedPayload);

                // 发送相同的请求并打印响应
                sendCapturedRequest();
            }
        });

        originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(data) {
        this._requestData = data; // 保存请求数据
        originalSend.apply(this, arguments);
    };

    // 发送捕获的请求并打印响应
    function sendCapturedRequest() {
        if (!capturedUrl || !capturedPayload) {
            console.log('No captured data available to send.');
            return;
        }

        fetch(capturedUrl, {
            method: capturedMethod,
            headers: capturedHeaders,
            body: JSON.stringify(capturedPayload)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Captured Request Response:');
            console.log(data);

            // 处理响应数据并显示在页面上
            displayResourceData(data);
        })
        .catch(error => {
            console.error('Error sending captured request:', error);
        });
    }

    // 处理响应数据并将生命周期、素材名称和 tapeInfo 显示在对应的元素上
function displayResourceData(data) {
    if (!data.itemList) {
        console.log("No itemList found in the response.");
        return;
    }

    const resources = data.itemList;
    const elements = document.querySelectorAll('.projectDiv'); // 获取页面上的元素
    const maxItems = Math.min(resources.length, elements.length); // 确保不超过元素数量

    // 清除之前的附加内容
    elements.forEach(element => {
        const existingOverlay = element.querySelector('.overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    });

    for (let i = 0; i < maxItems; i++) {
        const resource = resources[i];
        const element = elements[i];

        // 确保元素有定位属性，以便叠加
        element.style.position = 'relative';

        // 判断生命周期值是否在 0 到 9800 之间，并调整颜色和字体大小
        const onlineLifeCycleCondition = (resource.onlineLifeCycleDays > lifeCycleThresholdMin && resource.onlineLifeCycleDays < lifeCycleThresholdMax);
        const lifeCycleCondition = (resource.lifeCycleDays > lifeCycleThresholdMin && resource.lifeCycleDays < lifeCycleThresholdMax);

        const onlineLifeCycleColor = onlineLifeCycleCondition ? 'red' : 'white';
        const lifeCycleColor = lifeCycleCondition ? 'red' : 'white';

        const onlineLifeCycleFontSize = onlineLifeCycleCondition ? '18px' : '14px';
        const lifeCycleFontSize = lifeCycleCondition ? '18px' : '14px';

        // 设置tapeInfo的颜色
        const tapeInfoColor = resource.tapeInfo ? '#00FF00' : 'blue'; // 使用亮绿色

        // 创建并插入新的内容
        const overlay = document.createElement('div');
        overlay.className = 'overlay'; // 添加一个标识类，用于删除
        overlay.style.position = 'absolute';
        overlay.style.bottom = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // 半透明背景
        overlay.style.color = 'white';
        overlay.style.padding = '5px';
        overlay.style.boxSizing = 'border-box';
        overlay.style.zIndex = '1'; // 确保在上层
        overlay.style.pointerEvents = 'none'; // 不阻碍点击事件
        overlay.style.fontFamily = 'Arial, sans-serif'; // 修改字体样式

        // 创建文本内容并设置标题和数值的颜色和字体大小
        overlay.innerHTML = `
            <div><strong style="color:${onlineLifeCycleColor}; font-size:${onlineLifeCycleFontSize};">在线生命周期:</strong> <span style="color:${onlineLifeCycleColor}; font-size:${onlineLifeCycleFontSize};">${resource.onlineLifeCycleDays || "N/A"}</span></div>
            <div><strong style="color:${lifeCycleColor}; font-size:${lifeCycleFontSize};">生命周期:</strong> <span style="color:${lifeCycleColor}; font-size:${lifeCycleFontSize};">${resource.lifeCycleDays || "N/A"}</span></div>
            <div><strong>资源名称:</strong> ${resource.name || "N/A"}</div>
            <div><strong style="color:${tapeInfoColor};">蓝光库:</strong> <span style="color:${tapeInfoColor};">${resource.tapeInfo || "N/A"}</span></div> <!-- 新增的显示tapeInfo部分，并根据条件设置颜色 -->
        `;

        // 插入到目标元素中
        element.appendChild(overlay);
    }
}


})();
