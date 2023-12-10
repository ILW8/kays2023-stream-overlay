let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const placeholder = params.get('placeholder');
const fontSize = params.get('fontSize');
const color = params.get('color');
const bgFlash = params.get('flashBackground') === 'true';

let nameTemp = placeholder || '';
let combo = 0;
let comboThreshold = 10;
let nameText = document.getElementById('name');
let background = document.getElementById('full-overlay');

(() => {
	if (fontSize) {
		nameText.style.fontSize = `${fontSize}px`
		nameText.style.bottom = `${Math.floor(fontSize / 2)}px`
		nameText.style.right = `${Math.floor(fontSize / 2)}px`
	}

	if (color) {
		nameText.style.color = color == 'red' ? 'var(--red)' : 'var(--blue)';
		nameText.style.textShadow = `2px 2px 0 ${color == 'red' ? 'var(--red-dark)' : 'var(--blue-dark)'}`;
	}
})();

socket.onmessage = async event => {
	let data = JSON.parse(event.data);
	let client = data.tourney?.ipcClients[id];

	if (nameTemp !== client.spectating.name) {
		nameTemp = client.spectating.name || '';
		nameText.innerHTML = nameTemp == '' ? placeholder : nameTemp;
	}

	if (data.tourney.manager.bools.scoreVisible && combo >= 10 && client.gameplay.combo.current < combo) {
		if (bgFlash) {
			background.style.transition = 'background-color 80ms cubic-bezier(0, 1, 0.4, 1)';
			background.style.backgroundColor = 'rgba(255, 87, 87, 0.1)';
		}

		nameText.style.transition = 'transform 100ms cubic-bezier(0, 1, 0.4, 1), color 100ms cubic-bezier(0, 1, 0.4, 1)';
		nameText.style.transform = 'scale(1.15)';
		nameText.style.color = 'var(--red-bright)';

		setTimeout(() => {
			if (bgFlash) {
				background.style.transition = 'background-color 800ms cubic-bezier(0.42, 0.04, 0.49, 0.97)';
				background.style.backgroundColor = 'rgba(255, 87, 87, 0)';
			}

			nameText.style.transition = 'transform 500ms cubic-bezier(0.42, 0.04, 0.49, 0.97), color 500ms cubic-bezier(0.42, 0.04, 0.49, 0.97)';
			nameText.style.transform = 'scale(1.0)';
			nameText.style.color = color === 'red' ? 'var(--red)' : 'var(--blue)';
		}, 150);
	}
	combo = client.gameplay.combo.current;
}
