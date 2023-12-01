let comingup, stage_data, players;

let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

let title = document.getElementById('title');
let winner = document.getElementById('winner');

let red_name = document.getElementById('red-name');
let red_pfp = document.getElementById('red-pfp');
let red_seed = document.getElementById('red-seed');
let red_points = document.getElementById('red-points');

let blue_name = document.getElementById('blue-name');
let blue_pfp = document.getElementById('blue-pfp');
let blue_seed = document.getElementById('blue-seed');
let blue_points = document.getElementById('blue-points');

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let tempMapName;
let nameRed = 'PLAYER 1', scoreRed = 0;
let nameBlue = 'PlAYER 2', scoreBlue = 0;

socket.onmessage = event => {
	let data = JSON.parse(event.data);

	if (tempMapName !== `${data.menu.bm.metadata.artist} - ${data.menu.bm.metadata.title}`) {
		tempMapName = `${data.menu.bm.metadata.artist} - ${data.menu.bm.metadata.title}`;
		title.innerHTML = `♪ ${tempMapName}`;
	}

	if (players && data.tourney.manager.teamName.left && nameRed !== data.tourney.manager.teamName.left) {
		nameRed = data.tourney.manager.teamName.left;
		red_name.innerHTML = nameRed;
		let player = players.find(p => p.name == nameRed);
		if (player) {
			red_pfp.src = player.flag_url;
			red_seed.innerHTML = 'SEED ' + player.seed;
		}
	}

	if (players && data.tourney.manager.teamName.right && nameBlue !== data.tourney.manager.teamName.right) {
		nameBlue = data.tourney.manager.teamName.right;
		blue_name.innerHTML = nameBlue;
		let player = players.find(p => p.name == nameBlue);
		if (player) {
			blue_pfp.src = player.flag_url;
			blue_seed.innerHTML = 'SEED ' + player.seed;
		}
	}

	if (scoreRed !== data.tourney.manager.stars.left || scoreBlue !== data.tourney.manager.stars.right) {
		scoreRed = data.tourney.manager.stars.left;
		scoreBlue = data.tourney.manager.stars.right;
		red_points.innerHTML = scoreRed;
		blue_points.innerHTML = scoreBlue;

		let winnerName = scoreRed > scoreBlue ? data.tourney.manager.teamName.left : data.tourney.manager.teamName.right;
		winner.innerHTML = winnerName == 'Roba' ? 'Roba tuhoo' : `${winnerName} voittaa`;
	}
}

(async () => {
	$.ajaxSetup({ cache: false });
	stage_data = await $.getJSON('../_data/beatmaps.json');
	players = await $.getJSON('../_data/players.json');
	document.getElementById('stage-name').innerHTML = stage_data?.stage || '//';
})();
