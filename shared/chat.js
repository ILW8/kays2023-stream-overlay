let chatLen = 0;

let chat = document.getElementById('chat');
let stopwatch = document.getElementById("stopwatch");
let stopwatchPie = document.getElementById("stopwatch-pie");
let stopwatchHideTimeout = 0;
let banchoTimer = document.getElementById('banchoTimer');
let banchoTimer_time = new CountUp('banchoTimer', 0, 0, 0, 0, {useEasing: false, suffix: 's'});
let currentRefereeName = "";
let forceRepaintChat = false;

function updateCurrentRef(event) {
    currentRefereeName = event.target.value;
    forceRepaintChat = true;

    // propagate to gameplay window
    setCookie('currentRefereeName', currentRefereeName);
}

setInterval(() => {
    let newRefereeName = getCookie('currentRefereeName');
    if (newRefereeName !== currentRefereeName) {
        currentRefereeName = newRefereeName;
        forceRepaintChat = true;
    }
}, 1000);

function updateChat(data) {
    const currentChatLen = data.tourney.manager.chat?.length;
    let lastMessage = {chatName: "", chatText: ""};
    if (chatLen !== currentChatLen || forceRepaintChat) {
        console.log("chat updated!!!");
        if (chatLen === 0 || (chatLen > 0 && chatLen > currentChatLen) || forceRepaintChat) {
            chat.innerHTML = '';
            chatLen = 0;
        }
        forceRepaintChat = false;

        for (let i = chatLen; i < currentChatLen; i++) {
            let text = data.tourney.manager.chat[i].messageBody;

            if (data.tourney.manager.chat[i].name == 'BanchoBot' && text.startsWith('Match history')) {
                continue;
            }

            let chatParent = document.createElement('div');
            chatParent.setAttribute('class', 'chat');

            let chatTime = document.createElement('div');
            chatTime.setAttribute('class', 'chatTime');

            let team = data.tourney.manager.chat[i].team;
            if (data.tourney.manager.chat[i].name === currentRefereeName) {
                team = 'bot';  // "bot" only means we highlight the user in yellow...
            }
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
            if (!text.toLowerCase().startsWith('!mp')) {
                chat.append(chatParent);
            }

            lastMessage.chatName = chatName.innerText;
            lastMessage.chatText = chatText.innerText;
        }

        chatLen = currentChatLen;
        chat.scrollTop = chat.scrollHeight;

        if (lastMessage.chatText.startsWith("!mp timer")) {
            do {
                var timerLength = lastMessage.chatText.split(" ")[2];
                if (timerLength !== undefined) {
                    const timerLengthStr = timerLength;
                    timerLength = parseInt(timerLength);
                    console.log("yep, got it: " + timerLength);
                    if (isNaN(timerLength)) {
                        console.log(timerLengthStr);
                        if (timerLengthStr === 'abort') {
                            stopwatch.style.opacity = '0';
                            banchoTimer.style.opacity = '0';
                        }
                        continue;
                    }
                } else {
                    console.log("using default 30s timer");
                    timerLength = 30;
                }

                clearTimeout(stopwatchHideTimeout);
                stopwatch.style.opacity = '1';
                banchoTimer.style.opacity = '1';
                stopwatchPie.classList.add("stopwatch-animate-skip");
                stopwatchPie.style.strokeDashoffset = '0';
                stopwatchPie.getBoundingClientRect();  // force CSS flush
                stopwatchPie.classList.remove("stopwatch-animate-skip");
                stopwatchPie.style.transition = `stroke-dashoffset ${timerLength}s linear`;
                stopwatchPie.style.strokeDashoffset = '100';

                banchoTimer_time.reset();
                banchoTimer_time = new CountUp('banchoTimer', timerLength, 0, 0, timerLength, {
                    useEasing: false,
                    suffix: 's'
                });
                banchoTimer_time.start();

                stopwatchHideTimeout = setTimeout(() => {
                    stopwatch.style.opacity = '0';
                    banchoTimer.style.opacity = '0';
                }, timerLength * 1000);
            } while (false)
        }

        if (lastMessage.chatText.startsWith("!mp start")) {
            stopwatch.style.opacity = '0';
            banchoTimer.style.opacity = '0';
        }
    }
}
