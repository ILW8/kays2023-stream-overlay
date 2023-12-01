let comingup, stage_data, players;

let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

let time = document.getElementById('time');
let timer = document.getElementById('timer');

let red_name = document.getElementById('red-name');
let blue_name = document.getElementById('blue-name');
let vs = document.getElementById('vs');

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let tempMapName;
let nameBlue;
let nameRed;
let tempTime;

socket.onmessage = event => {
	let data = JSON.parse(event.data);

	if (comingup && tempTime !== comingup.time) {
		tempTime = comingup.time;
		let matchTimeLocal = new Date(tempTime);
		let offset = matchTimeLocal.getTimezoneOffset();
		let matchTimeUTC = new Date(matchTimeLocal.getTime() + offset * 60000);
		console.log(matchTimeUTC);
		time.innerHTML = matchTimeUTC.toTimeString().split(' ')[0].substring(0, 5);
	}
}

(async () => {
	$.ajaxSetup({ cache: false });
	comingup = await $.getJSON('../_data/coming_up.json');

	if (comingup) {
		if (comingup.showcase) {
			red_name.innerHTML = comingup.showcase || 'Stage Name';
			vs.innerHTML = 'mappool';
			blue_name.innerHTML = 'showcase';
			blue_name.style.textTransform = 'none';
			blue_name.style.fontStyle = 'italic';
			blue_name.style.fontWeight = '500';
		}
		else {
			red_name.innerHTML = comingup?.red_team || 'Red Team';
			blue_name.innerHTML = comingup?.blue_team || 'Blue Team';
		}
	}

	let timer_end = comingup.time;
	if (timer_end > Date.now()) {
		let timer_int = setInterval(() => {
			if (timer_end < Date.now()) {
				if (timer) timer.innerHTML = '00:00';
				clearInterval(timer_int);
			}
			let remaining = Math.floor((timer_end - Date.now()) / 1000);
			let mins = Math.floor(remaining / 60)
			let seconds = Math.floor(remaining - mins * 60);
			let text = `${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
			if (timer && remaining > 0) timer.innerHTML = text;
		}, 1000);
	}
})();
