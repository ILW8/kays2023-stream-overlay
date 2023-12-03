let comingup, stage_data, players;
let concurrentMatches = [];

let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

let time = document.getElementById('time');
let timer = document.getElementById('timer');

let red_name = document.getElementById('red-name');
let blue_name = document.getElementById('blue-name');
let vs = document.getElementById('vs');

let altMatchTemplate = document.getElementById('altMatchTemplate');
let controlsPanel = document.getElementById('controls');

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let tempMapName;
let nameBlue;
let nameRed;
let tempTime;


setInterval(() => {
    if (comingup && tempTime !== comingup.time) {
        tempTime = comingup.time;
        let matchTimeLocal = new Date(tempTime);
        let offset = matchTimeLocal.getTimezoneOffset();
        let matchTimeUTC = new Date(matchTimeLocal.getTime() + offset * 60000);
        console.log(matchTimeUTC);
        time.innerHTML = matchTimeUTC.toTimeString().split(' ')[0].substring(0, 5);
    }
}, 1000);


function setup() {
    if (comingup) {
        if (comingup.showcase) {
            red_name.innerHTML = comingup.showcase || 'Stage Name';
            vs.innerHTML = 'mappool';
            blue_name.innerHTML = 'showcase';
            blue_name.style.textTransform = 'none';
            blue_name.style.fontStyle = 'italic';
            blue_name.style.fontWeight = '500';
        } else {
            red_name.innerHTML = comingup?.red_team || 'Red Team';
            blue_name.innerHTML = comingup?.blue_team || 'Blue Team';
        }
    }

    let timer_end = comingup?.time;
    let timer_int = setInterval(() => {
        if (timer_end < Date.now()) {
            if (timer) timer.innerHTML = '00:00';
            clearInterval(timer_int);
            return;
        }
        let remaining = Math.floor((timer_end - Date.now()) / 1000);
        let minutes = Math.floor(remaining / 60)
        let seconds = Math.floor(remaining - minutes * 60);
        let text = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timer && remaining > 0) timer.innerHTML = text;
    }, 1000);
}

function switchMatch(matchIndex) {
    console.log(`switching to new match: ${matchIndex}`);
    comingup = concurrentMatches[matchIndex];
}


(async () => {
    $.ajaxSetup({cache: false});
    let temp_coming_up = await $.getJSON('../_data/coming_up.json');

    let current = new Date(Date.now());  // i swear this looks odd -- it's 5am i dont care
    let lastEarliest = new Date(Date.UTC(2099, 0));
	let latestMatch = null;
	let latestDate = new Date(0);

    if (temp_coming_up && Array.isArray(temp_coming_up)) {
        // find the closest match to current time if coming_up.json is an array
        for (const match of temp_coming_up) {
            let matchDate = new Date(match.time);
            if (matchDate < lastEarliest && matchDate > current) {
                lastEarliest = matchDate;
                comingup = match;
            }

			if (matchDate > latestDate) {
				latestDate = matchDate;
				latestMatch = match;
			}
        }

		if (!comingup) {
			comingup = latestMatch;
		}
        concurrentMatches = temp_coming_up.filter((match) => match.time === lastEarliest.getTime());
    } else {
        comingup = temp_coming_up;
    }

    if (concurrentMatches.length > 1) {
        console.log(`there exists concurrent matches: ${JSON.stringify(concurrentMatches)}`);

        for (const match of concurrentMatches) {
            let clone = altMatchTemplate.content.cloneNode(true);
            let buttonNode = clone.querySelector('div');
            buttonNode.textContent = `${match.red_team} vs ${match.blue_team}`;
            buttonNode.onclick = function() { comingup = match; setup()};
            controlsPanel.appendChild(clone);
        }
    }
    setup();

})();
