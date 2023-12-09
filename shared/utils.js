const obsGetCurrentScene = window.obsstudio?.getCurrentScene ?? (() => {
});
const obsGetScenes = window.obsstudio?.getScenes ?? (() => {
});
const obsSetCurrentScene = window.obsstudio?.setCurrentScene ?? (() => {
});


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

