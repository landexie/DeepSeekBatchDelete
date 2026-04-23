// ==UserScript==
// @name         DeepSeek批量删除对话
// @namespace    https://github.com/landexie
// @homepageURL  https://github.com/landexie/DeepSeekBatchDelete
// @author       landexie
// @license      MIT
// @version      2026-2-9
// @description  为DeepSeek网页添加了一个批量删除按钮
// @match        https://chat.deepseek.com/*
// @icon         https://www.deepseek.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    setTimeout(main, 200); // FIXME 延时200ms，简单粗暴。定时检查需要的元素存在是更好的solution

    function main() {
        if (!JSON.parse(localStorage.getItem("userToken")).value) {
            return; // 未登录
        }

        const myStyle = document.createElement("style");
        myStyle.textContent = `            
            .btn::after { content: "";}
            .btn-danger { color: var(--dsw-alias-state-error-primary); overflow: hidden}
            .btn-danger::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0); /* 初始透明 */
              transition: background-color .2s;
              pointer-events: none; /* 允许点击穿透 */
            }
            .btn-danger:hover::before {
              background-color: var(--dsw-alias-interactive-bg-hover-danger);
            }
        `;
        document.head.append(myStyle);

        // const btnNewChat = document.querySelector(".ds-scroll-area").previousSibling;
        const btnNewChat = document.querySelector("._5a8ac7a");  // 直接用混淆后的类名
        const btnBatchDelete = btnNewChat.cloneNode();
        btnBatchDelete.classList.add("btn", "btn-danger");
        const btnCancel = btnNewChat.cloneNode();
        btnCancel.classList.add("btn");
        const btnReverse = btnNewChat.cloneNode();
        btnReverse.classList.add("btn");
        const btnConfirm = btnNewChat.cloneNode();
        btnConfirm.classList.add("btn", "btn-danger");
        let checkboxes = [];

        const container = document.createElement("div");
        const container2 = document.createElement("div");

        btnNewChat.before(container);
        container.style.cssText = `display : flex; justify-content: space-between;`;
        btnBatchDelete.style.width = "40%";
        btnNewChat.style.width = "55%";
        btnBatchDelete.innerText = "批量删除";
        container.append(btnBatchDelete, btnNewChat);

        container.before(container2);
        container2.style.cssText = `display : flex; justify-content: space-between;`;
        btnCancel.style.width = "30%";
        btnReverse.style.width = "30%";
        btnConfirm.style.width = "30%";
        btnCancel.textContent = "取消";
        btnReverse.textContent = "反选";
        btnConfirm.textContent = "删除";
        container2.append(btnCancel, btnReverse, btnConfirm);
        container2.style.display = "none";


        btnBatchDelete.addEventListener("click", function () {
            container.style.display = "none";
            container2.style.display = "flex";
            addCheckbox();
        });

        btnCancel.addEventListener("click", function () {
            container.style.display = "flex";
            container2.style.display = "none";
            removeCheckbox();
        });

        btnReverse.addEventListener("click", function () {
            for (let checkbox of checkboxes) {
                checkbox.checked = !checkbox.checked;
            }
        });

        btnConfirm.addEventListener("click", confirmDelete);

        function addCheckbox() {
            // let chats = document.querySelectorAll(".ds-scroll-area .ds-scroll-area a");
            // let chats = document.querySelector(".ds-scroll-area").querySelector(".ds-scroll-area").querySelectorAll("a");
            const chats = document.querySelectorAll("._546d736");
            for (let a of chats) {
                a.style.justifyContent = "unset";
                let checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.style.cssText = `height:100%; aspect-ratio: 1;`;
                checkbox.name = a.href.toString().split("/").pop();
                checkbox.refer = a;
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                };
                a.prepend(checkbox);
                checkboxes.push(checkbox);
            }

        }

        function removeCheckbox() {
            for (let checkbox of checkboxes) {
                checkbox.remove();
            }
            checkboxes = [];
        }

        /* 清理没有对话的日期分组 */
        function removeEmptyDateGroup() {
            // let dateGroups = document.querySelector(".ds-scroll-area .ds-scroll-area").firstChild.childNodes;
            const dateGroups = document.querySelectorAll("._3098d02");
            for (let dateGroup of dateGroups) {
                let flagNoContent = true;
                for (let a of dateGroup.querySelectorAll("a")) {
                    if (a.style.display !== "none") {
                        flagNoContent = false;
                    }
                }
                if (flagNoContent) {
                    dateGroup.style.display = "none";
                }
            }
        }

        // 创建新对话时，添加回日期
        let observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                try {
                    for (let node of mutation.addedNodes) {
                        if (node.tagName === "A") {
                            node.parentElement.style.display = "";
                        }
                    }
                } catch (e) {
                }
            }
        });
        // observer.observe(document.querySelector(".ds-scroll-area").querySelector(".ds-scroll-area").firstChild, {
        observer.observe(document.querySelector("._77cdc67"), {
            childList: true,
            subtree: true
        });

        function confirmDelete() {
            const userToken = JSON.parse(localStorage.getItem("userToken")).value;

            (async () => {
                const promises = [];
                for (let checkbox of checkboxes) {
                    if (!checkbox.checked) {
                        continue;
                    }
                    let sessionID = checkbox.name;

                    promises.push(fetch("https://chat.deepseek.com/api/v0/chat_session/delete", {
                            "credentials": "include",
                            "headers": {
                                "Accept": "*/*",
                                "authorization": `Bearer ${userToken}`,
                                "content-type": "application/json",
                            },
                            "body": JSON.stringify({chat_session_id: sessionID}),
                            "method": "POST",
                        }).then(r => {
                            if (r.ok) {
                                if (checkbox.name === location.href.toString().split('/').pop()) {
                                    btnNewChat.click(); // 若删除了选中的对话，创建新对话
                                }
                                // checkbox.refer.remove();
                                checkbox.refer.style.display = "none"; // NOTE: 不能直接删除
                            }
                        })
                    );
                }

                await Promise.allSettled(promises);
                removeEmptyDateGroup();

            })();

            removeCheckbox();
            container.style.display = "flex";
            container2.style.display = "none";
        }
    }
})();




