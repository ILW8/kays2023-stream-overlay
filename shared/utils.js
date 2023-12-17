const obsGetCurrentScene = window.obsstudio?.getCurrentScene ?? (() => {
});
const obsGetScenes = window.obsstudio?.getScenes ?? (() => {
});
const obsSetCurrentScene = window.obsstudio?.setCurrentScene ?? (() => {
});


function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setCookie(cname, cvalue) {
    const d = new Date();
    d.setTime(d.getTime() + (24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}


/**
 * @typedef  {{
 *     tourney: {
 *         manager: {
 *             bools: {
 *                 scoreVisible: boolean,
 *                 starsVisible: boolean
 *             },
 *             bestOF: number,
 *             stars: {
 *                 left:number,
 *                 right:number,
 *             },
 *             teamName: {
 *                 left:string,
 *                 right:string,
 *             },
 *             ipcState: number,
 *             ipcClients: [{gameplay: { accuracy: number }}],
 *             chat: [{messageBody: string, team: string}],
 *         }
 *     },
 *     menu: {
 *         bm:{
 *             md5: string,
 *             path: {
 *                 full:string,
 *             },
 *             metadata:{
 *                artist:string,
 *                title:string,
 *                mapper:string,
 *                },
 *            stats:{
 *                    fullSR:number,
 *                    SR:number,
 *                    AR:number,
 *                    CS:number,
 *                    OD:number,
 *                    HP:number,
 *                    BPM:{
 *                        min:number,
 *                        max:number,
 *                    },
 *                    memoryAR:number,
 *                    memoryCS:number,
 *                    memoryOD:number,
 *                    memoryHP:number,
 *                },
 *            time:{
 *                firstObj:number,
 *                current:number,
 *                full:number,
 *                mp3:number,
 *            }
 *            },
 *      pp:{
 *                strains:[number],
 *            }
 *        }
 *    }
 * } GosuData
 */

