let mappool, stage_data;

/** maps selected beatmap to scene transition timeout id
 * @type {Object.<number, number>} dict
 */
let selectedMapsTransitionTimeout = {};
const pick_to_transition_delay_ms = 10000;
const gameplay_scene_name = "gameplay";
const mappool_scene_name = "mappool";

const sceneCollection = document.getElementById("sceneCollection");

const point_rotation_red = [-12, 15, -3, 18, 9, 1, -19];
const point_rotation_blue = [-8, -14, 16, 0, 18, 6, 15];
(async () => {
	$.ajaxSetup({ cache: false });
	mappool = await $.getJSON('../_data/beatmaps.json');
	stage_data = await $.getJSON('../_data/beatmaps.json');
	if (stage_data) document.getElementById('stage-name').innerHTML = stage_data.stage || '//';
})();

let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let pick_button = document.getElementById('pickButton');
let autopick_button = document.getElementById('autoPickButton');
let autoadvance_button = document.getElementById('autoAdvanceButton');
let autoadvance_timer_container = document.getElementById('autoAdvanceTimer');
let autoadvance_timer_label = document.getElementById('autoAdvanceTimerLabel');
let autoadvance_timer_time = new CountUp('autoAdvanceTimerTime', 10, 0, 1, 10, {useEasing: false, suffix: 's'});
autoadvance_timer_container.style.opacity = '0';

let red_name = document.getElementById('red-name');
let red_points = document.getElementById('red-points');

let blue_name = document.getElementById('blue-name');
let blue_points = document.getElementById('blue-points');

let progressChart = document.getElementById('progress');
let strain_container = document.getElementById('strains-container');

let image, title_, artist_, diff_, modid_, replay_, mapid, md5;
let last_score_update = 0, last_strain_update = 0;

let tempStrains, seek, fullTime;
let changeStats = false;
let statsCheck = false;


/**
 * ipcState as defined in osu.Game.Tournament/IPC/TourneyState.cs:
 *     public enum TourneyState
 *     {
 *         Initialising,
 *         Idle,
 *         WaitingForClients,
 *         Playing,
 *         Ranking
 *     }
 * @type {{WaitingForClients: number, Playing: number, Ranking: number, Idle: number, Initialising: number}}
 */
const TourneyState = {
	"Initialising": 0,
	"Idle": 1,
	"WaitingForClients": 2,
	"Playing": 3,
	"Ranking": 4,
}

/**
 * Last active TourneyState
 * @type {number}
 */
let lastState;
let sceneTransitionTimeoutID;

let bestOf, firstTo;
let starsRed, starsBlue;

let beatmaps = new Set();
let hasSetup = false;
let redName = 'Red Team', blueName = 'Blue Team';
let tempMapID = 0;
let currentPicker = 'red';
let enableAutoPick = false;
let enableAutoAdvance = false;
let selectedMaps = [];

/* === START OBS INIT === */
obsGetScenes(scenes => {
	console.log(scenes);
	for (const scene of scenes) {
		let clone = document.getElementById("sceneButtonTemplate").content.cloneNode(true);
		let buttonNode = clone.querySelector('div');
		buttonNode.id = `scene__${scene}`;
		buttonNode.textContent = `GO TO: ${scene}`;
		buttonNode.onclick = function() { obsSetCurrentScene(scene); };
		sceneCollection.appendChild(clone);
	}

	obsGetCurrentScene((scene) => {
		document.getElementById(`scene__${scene.name}`).classList.add("activeScene");
	});
});

window.addEventListener('obsSceneChanged', function(event) {
	let activeButton = document.getElementById(`scene__${event.detail.name}`);

	for (const scene of sceneCollection.children) {
		scene.classList.remove("activeScene");
	}
	activeButton.classList.add("activeScene");

});
/* === END OBS INIT === */


socket.onmessage = async event => {
	/**
	 * gosumemory data object
	 * @type {import('../shared/utils.js').GosuData}
	 */
	let data = JSON.parse(event.data);

	if (!hasSetup) setupBeatmaps();

	/**
	 * switch to mappool scene after ranking screen
	 */
	{
		let newState = data.tourney.manager.ipcState;
		if (enableAutoAdvance) {
			if (lastState === TourneyState.Ranking && newState === TourneyState.Idle) {
				sceneTransitionTimeoutID = setTimeout(() => {
					obsGetCurrentScene((scene) => {
						if (scene.name !== gameplay_scene_name)  // e.g. on winner screen
							return
						obsSetCurrentScene(mappool_scene_name);
					});
				}, 2000);
			}
			if (lastState !== newState && newState !== TourneyState.Idle) {
				clearTimeout(sceneTransitionTimeoutID);
			}
		}
		lastState = newState;
	}


	if (tempMapID !== data.menu.bm.id && data.menu.bm.id != 0) {
		if (tempMapID == 0) tempMapID = data.menu.bm.id;
		else {
			tempMapID = data.menu.bm.id;
			let pickedMap = Array.from(beatmaps).find(b => b.beatmapID == tempMapID);
			if (pickedMap && enableAutoPick && !selectedMaps.includes(tempMapID)) pickMap(Array.from(beatmaps).find(b => b.beatmapID == tempMapID), currentPicker == 'red' ? redName : blueName, currentPicker);
		}
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
		let stats = getModStats(data.menu.bm.stats.CS, data.menu.bm.stats.AR, data.menu.bm.stats.OD, data.menu.bm.stats.BPM.max, mod_);

		document.getElementById('cs').innerHTML = `${stats.cs}`;
		document.getElementById('ar').innerHTML = `${stats.ar}`;
		document.getElementById('sr').innerHTML = map?.sr || data.menu.bm.stats.fullSR;
		document.getElementById('bpm').innerHTML = `${map?.bpm || stats.bpm}`;

		let len = data.menu.bm.time.full - data.menu.bm.time.firstObj;
		let mins = Math.trunc((len / stats.speed || 1) / 1000 / 60);
		let secs = Math.trunc((len / stats.speed || 1) / 1000 % 60);
		document.getElementById('len').innerHTML = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

		let maskPosition = `${-496 + onepart * seek}px 0px`;
		progressChart.style.maskPosition = maskPosition;
		progressChart.style.webkitMaskPosition = maskPosition;
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

	if (data.tourney.manager.teamName.left && redName !== data.tourney.manager.teamName.left) {
		redName = data.tourney.manager.teamName.left;
		red_name.innerHTML = redName;
	}

	if (data.tourney.manager.teamName.right && blueName !== data.tourney.manager.teamName.right) {
		blueName = data.tourney.manager.teamName.right;
		blue_name.innerHTML = blueName;
	}

	updateChat(data);
}

class Beatmap {
	constructor(mods, modID, beatmapID, beatmapsetID, layerName) {
		this.mods = mods;
		this.modID = modID;
		this.beatmapID = beatmapID;
		this.beatmapsetID = beatmapsetID;
		this.layerName = layerName;
	}
	generate() {
		let mappoolContainer = document.getElementById(`${this.mods}`);

		this.clicker = document.createElement('div');
		this.clicker.id = `${this.layerName}Clicker`;

		mappoolContainer.appendChild(this.clicker);
		let clickerObj = document.getElementById(this.clicker.id);

		this.title = document.createElement('div');
		this.title.id = `${this.layerName}TITLE`;
		this.title.setAttribute('class', 'mapTitle');

		this.artist = document.createElement('div');
		this.artist.id = `${this.layerName}ARTIST`;
		this.artist.setAttribute('class', 'mapArtist');

		this.image = document.createElement('div');
		this.image.id = `${this.layerName}IMAGE`;
		this.image.setAttribute('class', 'mapImage');
		this.image.style.backgroundImage = `url('https://assets.ppy.sh/beatmaps/${this.beatmapsetID}/covers/cover.jpg')`;

		this.pickedStatus = document.createElement('div');
		this.pickedStatus.id = `${this.layerName}STATUS`;
		this.pickedStatus.setAttribute('class', 'pickingStatus');

		this.blinkOverlay = document.createElement('div');
		this.blinkOverlay.id = `${this.layerName}BLINK`;
		this.blinkOverlay.setAttribute('class', 'blinkOverlay');

		this.mapContainer = document.createElement('div');
		this.mapContainer.id = `${this.layerName}MAPCONTAINER`;
		this.mapContainer.setAttribute('class', 'mapContainer');

		this.diff = document.createElement('div');
		this.diff.id = `${this.layerName}DIFF`;
		this.diff.setAttribute('class', 'mapDiff');

		this.modIcon = document.createElement('div');
		this.modIcon.id = `${this.layerName}MODICON`;
		this.modIcon.setAttribute('class', 'modIcon');
		this.modIcon.innerHTML = `${this.modID}`;
		this.modIcon.style.backgroundColor = `var(--accent-mod-${this.mods.toLowerCase()})`


		this.top = document.createElement('div');
		this.top.id = `${this.layerName}TOP`;
		this.top.setAttribute('class', 'mapTop');
		this.top.appendChild(this.title);
		this.top.appendChild(this.artist);

		this.bottom = document.createElement('div');
		this.bottom.id = `${this.layerName}BOTTOM`;
		this.bottom.setAttribute('class', 'mapBottom');
		this.bottom.appendChild(this.diff);

		this.clicker.setAttribute('class', 'clicker');
		this.mapContainer.appendChild(this.image);
		this.mapContainer.appendChild(this.top);
		this.mapContainer.appendChild(this.bottom);
		this.mapContainer.appendChild(this.modIcon);
		clickerObj.appendChild(this.mapContainer);
		// clickerObj.appendChild(this.pickedStatus);
		clickerObj.appendChild(this.blinkOverlay);
	}
}

const delay = async time => new Promise(resolve => setTimeout(resolve, time));

async function setupBeatmaps() {
	hasSetup = true;

	let bms = [];
	$.ajaxSetup({ cache: false });
	const jsonData = await $.getJSON(`../_data/beatmaps.json`);
	jsonData.beatmaps.map((beatmap) => { bms.push(beatmap); });

	bms.map(async (beatmap, index) => {
		const bm = new Beatmap(beatmap.mods, beatmap.identifier, beatmap.beatmap_id, beatmap.beatmapset_id, `map${index}`);
		bm.generate();
		bm.clicker.addEventListener('mousedown', () => {
			bm.clicker.addEventListener('click', event => {
				if (!event.shiftKey) event.ctrlKey ? banMap(bm, redName, 'red') : pickMap(bm, redName, 'red');
				else resetMap(bm);
			});
			bm.clicker.addEventListener('contextmenu', event => {
				if (!event.shiftKey) event.ctrlKey ? banMap(bm, blueName, 'blue') : pickMap(bm, blueName, 'blue');
				else resetMap(bm);
			});
		});
		bm.artist.innerHTML = `${beatmap.artist}`;
		bm.title.innerHTML = `${beatmap.title}`;
		bm.diff.innerHTML = `[${beatmap.difficulty}]`;
		beatmaps.add(bm);
	});
}

const pickMap = (bm, playerName, color) => {
	lastPicked = bm;
	switchPick(color);
	selectedMaps.push(bm.beatmapID);
	if (enableAutoAdvance) {
		selectedMapsTransitionTimeout[bm.beatmapID] = setTimeout(() => {
			obsSetCurrentScene(gameplay_scene_name);
			autoadvance_timer_container.style.opacity = '0';
		}, pick_to_transition_delay_ms);

		autoadvance_timer_time = new CountUp('autoAdvanceTimerTime',
			pick_to_transition_delay_ms/1000, 0, 1, pick_to_transition_delay_ms/1000,
			{useEasing: false, suffix: 's'});
		autoadvance_timer_time.start();
		autoadvance_timer_container.style.opacity = '1';
		autoadvance_timer_label.textContent = `Switching to ${gameplay_scene_name} in`;
	}

	bm.top.style.backgroundColor = `var(--${color})`;
	bm.image.style.borderColor = `var(--${color}-darker)`;
	bm.mapContainer.style.boxShadow = `0px 6px 0px var(--${color}-darker)`;
	bm.blinkOverlay.style.animation = 'blinker 1s cubic-bezier(0.36, 0.06, 0.01, 0.57) 300ms 6, slowPulse 5000ms ease-in-out 6000ms 8';
}

const banMap = (bm, playerName, color) => {
	if (bm.mods.includes('TB')) return;
	selectedMaps.push(bm.beatmapID);

	bm.top.style.backgroundColor = `var(--${color}-dark)`;
	bm.image.style.borderColor = `var(--${color}-dark)`;
	bm.mapContainer.style.boxShadow = `0px 6px 0px var(--${color}-dark)`;
	bm.blinkOverlay.style.animation = 'none';
}

const resetMap = bm => {
	clearTimeout(selectedMapsTransitionTimeout[bm.beatmapID]);
	autoadvance_timer_container.style.opacity = '0';

	selectedMaps = selectedMaps.filter(e => e != bm.beatmapID);
	bm.top.style.backgroundColor = `var(--accent)`;
	bm.image.style.borderColor = `var(--accent-dark)`;
	bm.mapContainer.style.boxShadow = `0px 6px 0px var(--accent-dark)`;
	bm.blinkOverlay.style.animation = 'none';
}

const switchPick = color => {
	if (!color) currentPicker = currentPicker == 'red' ? 'blue' : 'red';
	else currentPicker = color == 'red' ? 'blue' : 'red';
	if (currentPicker == 'red') {
		pick_button.style.color = 'var(--red)';
		pick_button.innerHTML = 'RED PICK';
	}
	else {
		pick_button.style.color = 'var(--blue)';
		pick_button.innerHTML = 'BLUE PICK';
	}
}

const switchAutoPick = () => {
	if (enableAutoPick) {
		enableAutoPick = false;
		autopick_button.innerHTML = 'AUTOPICK: OFF';
		autopick_button.style.backgroundColor = '#fc9f9f';
	}
	else {
		enableAutoPick = true;
		autopick_button.innerHTML = 'AUTOPICK: ON';
		autopick_button.style.backgroundColor = '#9ffcb3';
	}
}

const switchAutoAdvance = () => {
	if (enableAutoAdvance) {
		enableAutoAdvance = false;
		autoadvance_button.innerHTML = 'AUTO ADVANCE: OFF';
		autoadvance_button.style.backgroundColor = '#fc9f9f';
	}
	else {
		enableAutoAdvance = true;
		autoadvance_button.innerHTML = 'AUTO ADVANCE: ON';
		autoadvance_button.style.backgroundColor = '#9ffcb3';
	}
}

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
