(function () {
	'use strict';

	function intervalTry(callback, interval, immediate = false) {
		let countOfCall = 0;
		let startTime = Date.now();
		let intervalId = null;
		let func = () => {
			countOfCall++;
			try {
				callback(countOfCall, Date.now() - startTime);
				if (intervalId != null) clearInterval(intervalId);
				return;
			} catch (err) {}
		};
		intervalId = setInterval(func, interval);
		if (immediate) func();
	}

	const plugConfig = {
		key: '04d1d18b27ce50dae87ab9d15e0be9d5',
		name: '[REIFUU@提示]',
		version: '0.1',
		init: 0
	};

	function initPlug() {
		if (localStorage.getItem(plugConfig.key) == null) {
			localStorage.setItem(plugConfig.key, JSON.stringify(plugConfig));
		}
		let localConfig = JSON.parse(localStorage.getItem(plugConfig.key));
		if (localConfig.init === 0) {
			window["Utils"].sync(3, ['REIFUU@Tips食用方法', '', `公屏输入@弹出提示面板\n点击顶部按钮或者按下esc关闭面板\n点击面板显示的用户名称即可自动补全\n使用上下键或者鼠标滚轮可移动预选光标，使用Tab键补全输入\n(点击确认则下次启动不再弹出本提示框)`], (param) => {
				if (param !== null) {
					console.log('run');
					localConfig.init = 1;
					localStorage.setItem(plugConfig.key, JSON.stringify(localConfig));
				}
			});
		}
	}

	function getNowMatchUser(str) {
		let userList = [];
		const userJson = window['Objs'].mapHolder.Assets.userJson;
		const userNameList = Object.keys(userJson);
		const nowRoom = window['roomn'];
		userNameList.forEach((item) => {
			if (userJson[item][4] === nowRoom) {
				if (str) {
					if ((item.indexOf(str.toLowerCase()) > -1)) {
						userList.push(userJson[item][2]);
					}
				} else {
					userList.push(userJson[item][2]);
				}
			}
		});
		return userList;
	}

	function atAllClick() {
		const allUsers = getNowMatchUser();
		if (allUsers.length === 0) return;
		const atStr = allUsers.map(name => ` [*${name}*] `).join('');
		const newValue = sliceValue[0] + atStr + sliceValue[2];
		moveInput.value = newValue;
		const textSizeMeasurer = document.getElementById('textSizeMeasurer');
		textSizeMeasurer.innerHTML = newValue;
		window['moveinputBubble'].style.width = textSizeMeasurer.clientWidth + "px";
		moveInput.focus();
		moveInput.selectionStart = newValue.length;
		moveInput.selectionEnd = newValue.length;
		status = 0;
		deleteAtElement();
	}

	function createTipsElement(roomUsers) {
		const moveInputBubble = document.querySelector('#moveinputBubble');
		const moveInputStyle = window.getComputedStyle(moveInput);
		const moveInputBubbleStyle = window.getComputedStyle(moveInputBubble);
		selectIndex = 0;
		atList = roomUsers;
		deleteAtElement();

		let atTipBox = document.createElement('div');
		atTipBox.id = 'atTipBox';
		atTipBox.style.left = '0px';
		atTipBox.style.position = 'absolute';
		atTipBox.style.zIndex = '999';
		atTipBox.style.backgroundColor = moveInputBubbleStyle.backgroundColor;
		atTipBox.style.width = '100%';
		atTipBox.style.height = 'auto';
		atTipBox.style.borderColor = moveInputBubbleStyle.borderColor;
		atTipBox.style.borderStyle = moveInputBubbleStyle.borderStyle;
		atTipBox.style.borderWidth = moveInputBubbleStyle.borderWidth;
		atTipBox.style.borderBottom = 'none';
		atTipBox.style.borderLeft = 'none';
		atTipBox.style.borderRadius = '8px';
		atTipBox.style.overflow = 'hidden';
		atTipBox.style.padding = '24px 0 12px 0';
		atTipBox.style.backdropFilter = 'blur(4px)';

		let close = document.createElement('div');
		close.id = "atClose";
		close.style.position = 'absolute';
		close.style.background = `#${window['inputcolorhex']}`;
		close.style.height = '6px';
		close.style.width = '20%';
		close.style.top = '4px';
		close.style.left = '50%';
		close.style.borderRadius = '4px';
		close.style.transform = 'translateX(-50%)';
		close.style.maxWidth = '100px';
		close.style.cursor = 'pointer';
		close.addEventListener('click', () => {
			deleteAtElement();
			status = 0;
			moveInput.focus();
		});
		atTipBox.appendChild(close);

		roomUsers.forEach((user, index) => {
			let userItem = document.createElement('div');
			userItem.id = 'atitem';
			userItem.style.margin = '0 20px 0 20px';
			userItem.style.padding = '0 8px';
			userItem.style.whiteSpace = 'nowrap';
			userItem.style.overflow = 'hidden';
			userItem.style.height = '24px';
			userItem.style.textOverflow = 'ellipsis';
			userItem.style.color = moveInputStyle.color;
			userItem.style.textShadow = moveInputStyle.textShadow;
			userItem.style.cursor = 'pointer';
			userItem.style.borderRadius = '4px';
			userItem.style.lineHeight = '24px';
			userItem.style.display = 'flex';
			userItem.style.alignItems = 'center';
			if (index === selectIndex) {
				userItem.style.backgroundColor = `#${window['inputcolorhex']}88`;
			}

			if (user === '[全体成员]') {
				userItem.textContent = '@ 全体成员';
				userItem.addEventListener('click', () => { atAllClick(); });
			} else {
				userItem.textContent = '@ ' + user;
				userItem.addEventListener('click', () => { itemClick(user); });
			}
			atTipBox.appendChild(userItem);
		});

		const totalItems = roomUsers.length;
		const floatOffset = 8;
		atTipBox.style.height = totalItems * 24 + 'px';
		atTipBox.style.top = -1 * (totalItems * 24 + 36 + floatOffset) + 'px';
		moveInputBubble.appendChild(atTipBox);
	}

	function deleteAtElement() {
		let existingAtTipBox = document.querySelector('#atTipBox');
		if (existingAtTipBox) existingAtTipBox.remove();
	}

	function itemClick(name) {
		const atStr = ` [*${name}*] `;
		const selectionStart = moveInput.selectionStart + atStr.length - 1;
		const textSizeMeasurer = document.getElementById('textSizeMeasurer');
		let outArr = sliceValue;
		outArr[1] = atStr;
		moveInput.value = outArr.join("");
		textSizeMeasurer.innerHTML = outArr.join("");
		window['moveinputBubble'].style.width = textSizeMeasurer.clientWidth + "px";
		moveInput.focus();
		moveInput.selectionStart = selectionStart;
		moveInput.selectionEnd = selectionStart;
		status = 0;
		deleteAtElement();
	}

	function updateSelectedElement(elementAll) {
		elementAll.forEach((element, index) => {
			if (index === selectIndex) {
				element.style.backgroundColor = `#${window['inputcolorhex']}88`;
			} else {
				element.style.backgroundColor = 'transparent';
			}
		});
	}

	function detectInput() {
		const inputValue = moveInput.value;
		const selectionStart = moveInput.selectionStart;
		if (moveInput.placeholder !== '说点什么 . . .') {
			deleteAtElement();
			status = 0;
			return;
		}
		if (status) {
			if (((selectionStart - 1) < startIndex) || (selectionStart + 1) > endIndex + 1) {
				status = 0;
				deleteAtElement();
				return;
			}
			sliceValue[0] = inputValue.slice(0, startIndex);
			sliceValue[1] = inputValue.slice(startIndex, endIndex);
			sliceValue[2] = inputValue.slice(endIndex);
			const filterStr = sliceValue[1].slice(1);
			const filteredUsers = getNowMatchUser(filterStr);

			// 如果正在过滤（filterStr 非空）且没有匹配用户，直接关闭面板
			if (filterStr !== '' && filteredUsers.length === 0) {
				status = 0;
				deleteAtElement();
				return;
			}

			// 只在搜索字符串为空时添加「全体成员」
			if (filterStr === '') {
				createTipsElement(['[全体成员]', ...filteredUsers]);
			} else {
				createTipsElement(filteredUsers);
			}
		} else {
			if (inputValue[selectionStart - 1] === "@") {
				status = 1;
				startIndex = selectionStart - 1;
				endIndex = selectionStart;
				endStr = inputValue.slice(selectionStart);
				// 刚输入 @ 时，filterStr 为空，添加全体成员
				createTipsElement(['[全体成员]', ...getNowMatchUser()]);
				detectInput();
			}
		}
	}

	// main
	const moveInput = document.querySelector("#moveinput");
	let atList = [];
	let sliceValue = [];
	let status = 0;
	let startIndex;
	let endIndex;
	let endStr;
	let selectIndex = 0;

	intervalTry(initPlug, 1000);

	moveInput.addEventListener('keydown', (event) => {
		const atTipBox = document.getElementById('atTipBox');
		const atItem = document.querySelectorAll('#atitem');
		if (atTipBox && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
			event.preventDefault();
		}
		if (event.key === 'ArrowUp') {
			selectIndex = (selectIndex - 1 + atItem.length) % atItem.length;
			updateSelectedElement(atItem);
		} else if (event.key === 'ArrowDown') {
			selectIndex = (selectIndex + 1) % atItem.length;
			updateSelectedElement(atItem);
		}
		if (event.key === 'Tab' && atTipBox) {
			event.preventDefault();
			if (atList[selectIndex] === '[全体成员]') {
				atAllClick();
			} else {
				itemClick(atList[selectIndex]);
			}
		}
		if (event.key === "Escape") {
			status = 0;
			deleteAtElement();
		}
		requestAnimationFrame(() => {
			if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
				if (endStr === "") {
					endIndex = moveInput.value.length;
				} else {
					endIndex = moveInput.value.indexOf(endStr);
				}
				detectInput();
			}
		});
	});

	moveInput.addEventListener("click", () => {
		requestAnimationFrame(() => {
			if (endStr === "") {
				endIndex = moveInput.value.length;
			} else {
				endIndex = moveInput.value.indexOf(endStr);
			}
			detectInput();
		});
	});

	document.getElementById('moveinputDisplay').addEventListener("wheel", function (event) {
		const atItem = document.querySelectorAll('#atitem');
		event.preventDefault();
		if (event.deltaY > 0) {
			selectIndex = (selectIndex + 1) % atItem.length;
			updateSelectedElement(atItem);
		} else if (event.deltaY < 0) {
			selectIndex = (selectIndex - 1 + atItem.length) % atItem.length;
			updateSelectedElement(atItem);
		}
	});

	const textObserver = new MutationObserver(() => {
		requestAnimationFrame(() => {
			if (endStr === "") {
				endIndex = moveInput.value.length;
			} else {
				endIndex = moveInput.value.indexOf(endStr);
			}
			detectInput();
		});
	});
	textObserver.observe(document.getElementById('textSizeMeasurer'), { characterData: true, childList: true, subtree: true });
})();