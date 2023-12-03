let mappool;
(async () => {
	$.ajaxSetup({ cache: false });
	mappool = await $.getJSON('../_data/beatmaps.json');
})();

function setCookie(cname, cvalue) {
	const d = new Date();
	d.setTime(d.getTime() + (24*60*60*1000));
	let expires = "expires="+ d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let pick_button = document.getElementById('pickButton');
let autopick_button = document.getElementById('autoPickButton');

let beatmaps = new Set();
let hasSetup = false;
let redName = 'ermm uhhh umm', blueName = 'Season in the sun';
let tempMapID = 0;
let currentPicker = 'red';
setCookie("mapPickedBy", "blue");
let enableAutoPick = false;
let selectedMaps = [];

socket.onmessage = async event => {
	let data = JSON.parse(event.data);

	if (!hasSetup) setupBeatmaps();

	if (redName !== data.tourney.manager.teamName.left && data.tourney.manager.teamName.left) { redName = data.tourney.manager.teamName.left || 'Player 1'; }
	if (blueName !== data.tourney.manager.teamName.right && data.tourney.manager.teamName.right) { blueName = data.tourney.manager.teamName.right || 'Player 2'; }

	if (tempMapID !== data.menu.bm.id && data.menu.bm.id != 0) {
		if (tempMapID == 0) tempMapID = data.menu.bm.id;
		else {
			tempMapID = data.menu.bm.id;
			let pickedMap = Array.from(beatmaps).find(b => b.beatmapID == tempMapID);
			if (pickedMap && enableAutoPick && !selectedMaps.includes(tempMapID)) pickMap(Array.from(beatmaps).find(b => b.beatmapID == tempMapID), currentPicker == 'red' ? redName : blueName, currentPicker);
		}
	}
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


		this.top = document.createElement('div');
		this.top.id = `${this.layerName}TOP`;
		this.top.setAttribute('class', 'mapTop');
		this.top.appendChild(this.title);
		this.top.appendChild(this.artist);

		this.bottom = document.createElement('div');
		this.bottom.id = `${this.layerName}BOTTOM`;
		this.bottom.setAttribute('class', 'mapBottom');
		this.bottom.appendChild(this.diff);
		this.bottom.appendChild(this.modIcon);
		this.bottom.style.color = `var(--accent-dark`;

		this.clicker.setAttribute('class', 'clicker');
		this.mapContainer.appendChild(this.image);
		this.mapContainer.appendChild(this.top);
		this.mapContainer.appendChild(this.bottom);
		clickerObj.appendChild(this.mapContainer);
		// clickerObj.appendChild(this.pickedStatus);
		clickerObj.appendChild(this.blinkOverlay);
	}
}

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

	bm.top.style.backgroundColor = `var(--${color})`;
	bm.bottom.style.color = `var(--${color})`;
	bm.image.style.borderColor = `var(--${color}-darker)`;
	bm.mapContainer.style.boxShadow = `0px 6px 0px var(--${color}-darker)`;
	bm.blinkOverlay.style.animation = 'blinker 1s cubic-bezier(0.36, 0.06, 0.01, 0.57) 300ms 6, slowPulse 5000ms ease-in-out 6000ms 8';
}

const banMap = (bm, playerName, color) => {
	if (bm.mods.includes('TB')) return;
	selectedMaps.push(bm.beatmapID);

	bm.top.style.backgroundColor = `var(--${color}-dark)`;
	bm.bottom.style.color = `var(--${color}-dark)`;
	bm.image.style.borderColor = `var(--${color}-dark)`;
	bm.mapContainer.style.boxShadow = `0px 6px 0px var(--${color}-dark)`;
	bm.blinkOverlay.style.animation = 'none';
}

const resetMap = bm => {
	selectedMaps = selectedMaps.filter(e => e != bm.beatmapID);
	bm.top.style.backgroundColor = `var(--accent)`;
	bm.bottom.style.color = `var(--accent-dark)`;
	bm.image.style.borderColor = `var(--accent-dark)`;
	bm.mapContainer.style.boxShadow = `0px 6px 0px var(--accent-dark)`;
	bm.blinkOverlay.style.animation = 'none';
}

const switchPick = color => {

	if (!color) {
		currentPicker = currentPicker === 'red' ? 'blue' : 'red';
	} else {
		currentPicker = color === 'red' ? 'blue' : 'red';
	}

	setCookie("mapPickedBy", currentPicker === 'red' ? 'blue' : 'red')

	if (currentPicker === 'red') {
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
