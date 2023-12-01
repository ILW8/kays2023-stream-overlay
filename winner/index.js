let comingup, stage_data, players;

let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

let title = document.getElementById('title');
let winner = document.getElementById('win-name-name');
let red_name = document.getElementById('red-name');
let red_score = document.getElementById('red-score');
let blue_name = document.getElementById('blue-name');
let blue_score = document.getElementById('blue-score');

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let tempMapName;
let nameRed = 'Red Team', scoreRed = 0;
let nameBlue = 'Blue Team', scoreBlue = 0;

socket.onmessage = event => {
	let data = JSON.parse(event.data);

	if (data.tourney.manager.teamName.left && nameRed !== data.tourney.manager.teamName.left) {
		nameRed = data.tourney.manager.teamName.left;
		red_name.innerHTML = nameRed;
	}

	if (data.tourney.manager.teamName.right && nameBlue !== data.tourney.manager.teamName.right) {
		nameBlue = data.tourney.manager.teamName.right;
		blue_name.innerHTML = nameBlue;
	}

	if (scoreRed !== data.tourney.manager.stars.left || scoreBlue !== data.tourney.manager.stars.right) {
		scoreRed = data.tourney.manager.stars.left;
		scoreBlue = data.tourney.manager.stars.right;
		red_score.innerHTML = scoreRed;
		blue_score.innerHTML = scoreBlue;

		let winnerName = scoreRed > scoreBlue ? nameRed : nameBlue;
		winner.innerHTML = `${winnerName} wins`;
	}
}

(async () => {
	$.ajaxSetup({ cache: false });
	stage_data = await $.getJSON('../_data/beatmaps.json');
	document.getElementById('stage-name').innerHTML = stage_data?.stage || '//';
})();
