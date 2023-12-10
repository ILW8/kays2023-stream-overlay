const point_rotation_red = [-12, 15, -3, 18, 9, 1, -19];
const point_rotation_blue = [-8, -14, 16, 0, 18, 6, 15];
let stage_data, players;
(async () => {
	$.ajaxSetup({ cache: false });
	stage_data = await $.getJSON('../_data/beatmaps.json');
	if (stage_data) document.getElementById('stage-name').innerHTML = stage_data.stage || '//';
})();

let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

let map_image = document.getElementById('mapImage');
let title = document.getElementById('title');
let artist = document.getElementById('artist');
let diff = document.getElementById('diff');

let red_name = document.getElementById('red-name');
let red_points = document.getElementById('red-points');
let red_score = document.getElementById('red-score');
let red_combo = document.getElementById('red-combo');

let blue_name = document.getElementById('blue-name');
let blue_points = document.getElementById('blue-points');
let blue_score = document.getElementById('blue-score');
let blue_combo = document.getElementById('blue-combo');

let score_row = document.getElementById('score-row');
let lead_bar = document.getElementById('lead-bar');
let score_diff = document.getElementById('score-diff');
let chat_container = document.getElementById('chat-container');
let chat = document.getElementById('chat');
let progressChart = document.getElementById('progress');
let strain_container = document.getElementById('strains-container');

socket.onopen = () => { console.log('Successfully Connected'); };

let animation = {
	red_score: new CountUp('red-score', 0, 0, 0, .3, { useEasing: true, useGrouping: true, separator: ' ', decimal: '.' }),
	red_combo: new CountUp('red-combo', 0, 0, 0, .3, { useEasing: false, useGrouping: true, separator: ' ', decimal: '.', suffix: 'x' }),
	blue_score: new CountUp('blue-score', 0, 0, 0, .3, { useEasing: true, useGrouping: true, separator: ' ', decimal: '.' }),
	blue_combo: new CountUp('blue-combo', 0, 0, 0, .3, { useEasing: false, useGrouping: true, separator: ' ', decimal: '.', suffix: 'x' }),
	score_diff: new CountUp('score-diff', 0, 0, 0, .3, { useEasing: true, useGrouping: true, separator: ' ', decimal: '.' }),
}

socket.onclose = event => {
	console.log('Socket Closed Connection: ', event);
	socket.send('Client Closed!');
};

socket.onerror = error => { console.log('Socket Error: ', error); };

let image, title_, artist_, diff_, modid_, replay_, mapid, md5;
let last_score_update = 0, last_strain_update = 0;

let tempStrains, seek, fullTime;
let changeStats = false;
let statsCheck = false;

let chatLen = 0;

let bestOf, firstTo;
let scoreVisible, starsVisible;
let starsRed, scoreRed, nameRed, comboRed;
let starsBlue, scoreBlue, nameBlue, comboBlue;

scoreRed = 0;
scoreBlue = 0;

socket.onmessage = async event => {
	let data = JSON.parse(event.data);

	if (scoreVisible !== data.tourney.manager.bools.scoreVisible) {
		scoreVisible = data.tourney.manager.bools.scoreVisible;
		if (scoreVisible) {
			chat_container.style.opacity = 0;
			score_row.style.opacity = 1;
		} else {
			chat_container.style.opacity = 1;
			score_row.style.opacity = 0;
		}
	}

	if (starsVisible !== data.tourney.manager.bools.starsVisible) {
		starsVisible = data.tourney.manager.bools.starsVisible;
		if (starsVisible) {
			blue_points.style.opacity = 1;
			red_points.style.opacity = 1;
			document.getElementById('stage-name').innerHTML = stage_data?.stage || '//';

		} else {
			blue_points.style.opacity = 0;
			red_points.style.opacity = 0;
			document.getElementById('stage-name').innerHTML = `${stage_data?.stage || '//'} ✦ WARMUP` || 'WARMUP';
		}
	}

	if (image !== data.menu.bm.path.full) {
		image = data.menu.bm.path.full;
		data.menu.bm.path.full = data.menu.bm.path.full.replace(/#/g, '%23').replace(/%/g, '%25').replace(/\\/g, '/').replace(/'/g, "\\'");
		map_image.style.backgroundImage = `url('http://${location.host}/Songs/${data.menu.bm.path.full}')`;
	}

	if (stage_data && (md5 !== data.menu.bm.md5 || title_ !== data.menu.bm.metadata.title)) {
		await delay(500);
		changeStats = true;
	}

	if (changeStats) {
		changeStats = false;

		md5 = data.menu.bm.md5;
		mapid = data.menu.bm.id;
		map = stage_data?.beatmaps ? stage_data.beatmaps.find(m => m.beatmap_id == data.menu.bm.id) || { id: data.menu.bm.id, mods: 'XX', identifier: '' } : { mods: 'XX' };
		let mod_ = map.mods;
		let stats = getModStats(data.menu.bm.stats.CS, data.menu.bm.stats.AR, data.menu.bm.stats.OD, map?.bpm || data.menu.bm.stats.BPM.max, mod_);

		if (title_ !== data.menu.bm.metadata.title) { title_ = data.menu.bm.metadata.title; title.innerHTML = title_; }
		if (artist_ !== data.menu.bm.metadata.artist) { artist_ = data.menu.bm.metadata.artist; artist.innerHTML = artist_; }
		if (diff_ !== data.menu.bm.metadata.difficulty) { diff_ = data.menu.bm.metadata.difficulty; diff.innerHTML = `[${diff_}]`; }

		document.getElementById('cs').innerHTML = `${stats.cs}`;
		document.getElementById('ar').innerHTML = `${stats.ar}`;
		document.getElementById('sr').innerHTML = map?.sr || data.menu.bm.stats.fullSR;
		document.getElementById('bpm').innerHTML = `${map?.bpm || stats.bpm}`;
		document.getElementById('mod-id').innerHTML = map?.identifier || 'XX';
		document.getElementById('mod-id').style.backgroundColor = `var(--accent-mod-${mod_?.toLowerCase() || 'xx'})`;

		let len = data.menu.bm.time.full - data.menu.bm.time.firstObj;
		let mins = Math.trunc((len / stats.speed || 1) / 1000 / 60);
		let secs = Math.trunc((len / stats.speed || 1) / 1000 % 60);
		document.getElementById('len').innerHTML = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	const createPoint = (color, index) => {
		let node = document.createElement('div');
		node.className = `star ${color}`;
		node.id = `${color}${index}`;
		let rotation = color == 'red' ? point_rotation_red[index] : point_rotation_blue[index];
		node.style.transform = `rotate(${rotation}deg)`;
		document.getElementById(`${color}-points`).appendChild(node);
	}

	if (bestOf !== data.tourney.manager.bestOF) {
		let newmax = Math.ceil(data.tourney.manager.bestOF / 2);
		if (bestOf === undefined) {
			for (let i = 1; i <= newmax; i++) {
				createPoint('red', i);
				createPoint('blue', i);
			}
		}
		if (bestOf < data.tourney.manager.bestOF) {
			for (let i = firstTo + 1; i <= newmax; i++) {
				createPoint('red', i);
				createPoint('blue', i);
			}
		} else {
			for (let i = firstTo; i > newmax; i--) {
				document.getElementById('red-points').removeChild(document.getElementById(`red${i}`));
				document.getElementById('blue-points').removeChild(document.getElementById(`blue${i}`));
			}
		}
		bestOf = data.tourney.manager.bestOF;
		firstTo = newmax;
	}

	if (starsRed !== data.tourney.manager.stars.left) {
		starsRed = data.tourney.manager.stars.left;
		for (let i = 1; i <= starsRed; i++) {
			document.getElementById(`red${i}`).style.opacity = 1;
		}
		for (let i = starsRed + 1; i <= firstTo; i++) {
			document.getElementById(`red${i}`).style.opacity = 0.3;
		}
	}

	if (starsBlue !== data.tourney.manager.stars.right) {
		starsBlue = data.tourney.manager.stars.right;
		for (let i = 1; i <= starsBlue; i++) {
			document.getElementById(`blue${i}`).style.opacity = 1;
		}
		for (let i = starsBlue + 1; i <= firstTo; i++) {
			document.getElementById(`blue${i}`).style.opacity = 0.3;
		}
	}

	if (data.tourney.manager.teamName.left && nameRed !== data.tourney.manager.teamName.left) {
		nameRed = data.tourney.manager.teamName.left;
		red_name.innerHTML = nameRed;
	}

	if (data.tourney.manager.teamName.right && nameBlue !== data.tourney.manager.teamName.right) {
		nameBlue = data.tourney.manager.teamName.right;
		blue_name.innerHTML = nameBlue;
	}

	if (!scoreVisible && (scoreRed > 0 || scoreBlue > 0)) {
		scoreRed = 0;
		scoreBlue = 0;
		animation.red_score.update(scoreRed);
		animation.blue_score.update(scoreBlue);
	}

	if (tempStrains != JSON.stringify(data.menu.pp.strains) && window.strainGraph) {
		tempStrains = JSON.stringify(data.menu.pp.strains);
		if (data.menu.pp.strains) {
			let temp_strains = smooth(data.menu.pp.strains, 5);
			let new_strains = [];
			for (let i = 0; i < 60; i++) {
				new_strains.push(temp_strains[Math.floor(i * (temp_strains.length / 60))]);
			}
			new_strains = [0, ...new_strains, 0];

			config.data.datasets[0].data = new_strains;
			config.data.labels = new_strains;
			config.options.scales.y.max = Math.max(...new_strains);
			configProgress.data.datasets[0].data = new_strains;
			configProgress.data.labels = new_strains;
			configProgress.options.scales.y.max = Math.max(...new_strains);
			window.strainGraph.update();
			window.strainGraphProgress.update();
		}
		else {
			config.data.datasets[0].data = [];
			config.data.labels = [];
			configProgress.data.datasets[0].data = [];
			configProgress.data.labels = [];
			window.strainGraph.update();
			window.strainGraphProgress.update();
		}
	}

	let now = Date.now();
	if (fullTime !== data.menu.bm.time.mp3) { fullTime = data.menu.bm.time.mp3; onepart = 496 / fullTime; }
	if (seek !== data.menu.bm.time.current && fullTime && now - last_strain_update > 300) {
		last_strain_update = now;
		seek = data.menu.bm.time.current;

		if (scoreRed == 0 || scoreBlue == 0 || !scoreVisible) {
			progressChart.style.maskPosition = '-496px 0px';
			progressChart.style.webkitMaskPosition = '-496px 0px';
		}
		else {
			let maskPosition = `${-496 + onepart * seek}px 0px`;
			progressChart.style.maskPosition = maskPosition;
			progressChart.style.webkitMaskPosition = maskPosition;
		}
	}

	if (scoreVisible) {
		let scores = [];
		let combos = [];
		let playerCount = data.tourney.ipcClients.length;
		for (let i = 0; i < playerCount; i++) {
			let score = data.tourney.ipcClients[i].gameplay.score;
			if (data.tourney.ipcClients[i]?.gameplay?.mods?.str?.toUpperCase().includes('EZ')) score *= 2;
			scores.push({ id: i, score });
			combos.push({ id: i, combo: data.tourney.ipcClients[i].gameplay.combo.current });
		}

		scoreRed = scores.filter(s => s.id < playerCount / 2).map(s => s.score).reduce((a, b) => a + b);
		scoreBlue = scores.filter(s => s.id >= playerCount / 2).map(s => s.score).reduce((a, b) => a + b);
		comboRed = combos.filter(s => s.id < playerCount / 2).map(s => s.combo).reduce((a, b) => a + b);
		comboBlue = combos.filter(s => s.id >= playerCount / 2).map(s => s.combo).reduce((a, b) => a + b);

		let scoreDiff = Math.abs(scoreRed - scoreBlue);
		let maxScore = Math.max(scoreRed, scoreBlue, 3000000)

		animation.red_score.update(scoreRed);
		animation.blue_score.update(scoreBlue);

		animation.red_combo.update(comboRed);
		animation.blue_combo.update(comboBlue);

		animation.score_diff.update(scoreDiff);


		if (scoreRed > scoreBlue) {
			blue_score.style.fontWeight = '500';
			blue_score.style.fontSize = '40px';
			red_score.style.fontWeight = '700';
			red_score.style.fontSize = '50px';

			lead_bar.style.width = Math.max(12, 360 * (Math.min(0.5, Math.pow((scoreDiff) / maxScore, 0.7)) * 2)) + 'px';
			lead_bar.style.right = '960px';
			lead_bar.style.left = 'unset';
			lead_bar.style.borderLeft = '12px solid #fcfcfc';
			lead_bar.style.borderRight = 'unset';

			score_diff.setAttribute('data-before', '◀');
			score_diff.setAttribute('data-after', '');
			score_diff.style.opacity = 1;
		}
		else if (scoreBlue > scoreRed) {
			blue_score.style.fontWeight = '700';
			blue_score.style.fontSize = '50px';
			red_score.style.fontWeight = '500';
			red_score.style.fontSize = '40px';

			lead_bar.style.width = Math.max(12, 360 * (Math.min(0.5, Math.pow((scoreDiff) / maxScore, 0.7)) * 2)) + 'px';
			lead_bar.style.right = 'unset';
			lead_bar.style.left = '960px';
			lead_bar.style.borderLeft = 'unset';
			lead_bar.style.borderRight = '12px solid #fcfcfc';

			score_diff.setAttribute('data-before', '');
			score_diff.setAttribute('data-after', '▶');
			score_diff.style.opacity = 1;
		}
		else {
			blue_score.style.fontWeight = '500';
			blue_score.style.fontSize = '45px';
			red_score.style.fontWeight = '500';
			red_score.style.fontSize = '45px';

			lead_bar.style.width = '0px';
			lead_bar.style.right = '960px';
			lead_bar.style.left = 'unset';
			lead_bar.style.borderLeft = 'unset';
			lead_bar.style.borderRight = 'unset';

			score_diff.setAttribute('data-before', '');
			score_diff.setAttribute('data-after', '');
			score_diff.style.opacity = 0;
		}
	}
	if (!scoreVisible) {
		if (chatLen != data.tourney.manager.chat.length) {
			if (chatLen == 0 || (chatLen > 0 && chatLen > data.tourney.manager.chat.length)) { chat.innerHTML = ''; chatLen = 0; }

			for (let i = chatLen; i < data.tourney.manager.chat.length; i++) {
				let text = data.tourney.manager.chat[i].messageBody;

				if (data.tourney.manager.chat[i].name == 'BanchoBot' && text.startsWith('Match history')) { continue; }
				if (text.toLowerCase().startsWith('!mp')) { continue; }

				let chatParent = document.createElement('div');
				chatParent.setAttribute('class', 'chat');

				let chatTime = document.createElement('div');
				chatTime.setAttribute('class', 'chatTime');

				let team = data.tourney.manager.chat[i].team;
				let chatName = document.createElement('div');
				chatName.setAttribute('class', `chatName ${team}`);

				let chatText = document.createElement('div');
				chatText.setAttribute('class', 'chatText');

				chatTime.innerText = data.tourney.manager.chat[i].time;
				if (team == 'bot') chatName.innerText = data.tourney.manager.chat[i].name;
				else chatName.innerText = data.tourney.manager.chat[i].name + ':\xa0';
				chatText.innerText = text;

				chatParent.append(chatTime);
				chatParent.append(chatName);
				chatParent.append(chatText);
				chat.append(chatParent);
			}

			chatLen = data.tourney.manager.chat.length;
			chat.scrollTop = chat.scrollHeight;
		}
	}
}

const delay = async time => new Promise(resolve => setTimeout(resolve, time));

window.onload = function () {
	let ctx = document.getElementById('strains').getContext('2d');
	window.strainGraph = new Chart(ctx, config);

	let ctxProgress = document.getElementById('strainsProgress').getContext('2d');
	window.strainGraphProgress = new Chart(ctxProgress, configProgress);
};

const getModStats = (cs_raw, ar_raw, od_raw, bpm_raw, mods) => {
	mods = mods.replace('NC', 'DT');
	mods = mods.replace('FM', 'HR');

	let speed = mods.includes('DT') ? 1.5 : mods.includes('HT') ? 0.75 : 1;
	let ar = mods.includes('HR') ? ar_raw * 1.4 : mods.includes('EZ') ? ar_raw * 0.5 : ar_raw;

	let ar_ms = Math.max(Math.min(ar <= 5 ? 1800 - 120 * ar : 1200 - 150 * (ar - 5), 1800), 450) / speed;
	ar = ar <= 5 ? (1800 - ar_ms) / 120 : 5 + (1200 - ar_ms) / 150;

	let cs = Math.round(Math.min(mods.includes('HR') ? cs_raw * 1.3 : mods.includes('EZ') ? cs_raw * 0.5 : cs_raw, 10) * 10) / 10;

	let od = mods.includes('HR') ? od_raw * 1.4 : mods.includes('EZ') ? od_raw * 0.5 : od_raw;
	od = Math.round(Math.min((79.5 - Math.min(79.5, Math.max(19.5, 79.5 - Math.ceil(6 * od))) / speed) / 6, 11) * 10) / 10;

	return {
		cs: Math.round(cs * 10) / 10,
		ar: Math.round(ar * 10) / 10,
		od: Math.round(od * 10) / 10,
		bpm: Math.round(bpm_raw * speed * 10) / 10,
		speed
	}
}

let config = {
	type: 'line',
	data: {
		labels: [],
		datasets: [{
			borderColor: 'rgba(245, 245, 245, 0)',
			backgroundColor: '#ffe79c',
			data: [],
			fill: true,
			stepped: false,
		}]
	},
	options: {
		tooltips: { enabled: false },
		legend: { display: false, },
		elements: { point: { radius: 0 } },
		responsive: false,
		scales: {
			x: { display: false, },
			y: {
				display: false,
				min: 0,
				max: 100
			}
		},
		animation: { duration: 0 }
	}
}

let configProgress = {
	type: 'line',
	data: {
		labels: [],
		datasets: [{
			borderColor: 'rgba(245, 245, 245, 0)',
			backgroundColor: '#fcfcfc',
			data: [],
			fill: true,
			stepped: false,
		}]
	},
	options: {
		tooltips: { enabled: false },
		legend: { display: false, },
		elements: { point: { radius: 0 } },
		responsive: false,
		scales: {
			x: { display: false, },
			y: {
				display: false,
				min: 0,
				max: 100
			}
		},
		animation: { duration: 0 }
	}
}
