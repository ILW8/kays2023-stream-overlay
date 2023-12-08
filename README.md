# Kay and YokesPai's Scramble 2023 stream overlay

## OBS Setup

scene collection provided [here](KAYS2023.json), make sure to check everything is correct (especially audio devices)

### GAMEPLAY SCENE  
| source            | url/path                                             | width | height | x         | y         |
|-------------------|------------------------------------------------------|-------|--------|-----------|-----------|
| vc_overlay*       | url from discord                                     | 500   | 50     | 16        | 909       |
| name_overlays**   | http://localhost:24050/kays2023-stream-overlay/names/?id=0&flashBackground=false&color=red&placeholder=Waiting%20for%20P1%2E%2E%2E ***                                         | 638   | 360    | see below | see below |
| osu clients**     |                                                      | 638   | 360    | see below | see below |
| gameplay_overlay  | http://localhost:24050/kays2023-stream-overlay/main/ | 1920  | 1080   | 0         | 0         |

<sup>*url from discord, replace custom css with [vc.css](vc.css)</sup><br>
<sup>**placement according to the following table:</sup>
| client | x    | y    |
|--------|------|------|
| 0      | 314  | 176  |
| 1      | 314  | 536  |
| 2      | 968  | 176  |
| 3      | 968  | 536  |

<sup>***base url for names: http://localhost:24050/kays2023-stream-overlay/names?id=0&flashBackground=false&color=red&placeholder=Waiting%20for%20P1%2E%2E%2E; edit `id`, `color`, and `placeholder` accordingly.

### MAPPOOL SCENE
| source           | url/path                                                | width | height | x  | y    |
|------------------|---------------------------------------------------------|-------|--------|----|------|
| vc_overlay       |                                                         | 480   | 100    | 16 | 1014 |
| mappool_overlay* | http://localhost:24050/kays2023-stream-overlay/mappool/ | 2220  | 700    | 0  | 220  |

### Interacting with the mappool
- Left click: left (red) team pick
- Right click: right (blue) team pick
- Ctrl+Click: ban
- Shift+Click: clear

<sup>*"control panel" featuring autopick function is off the screen, use the interact menu to activate</sup>

### INTRO SCENE
| source           | url/path                                                | width | height | x | y   |
|------------------|---------------------------------------------------------|-------|--------|---|-----|
| intro_overlay*    | http://localhost:24050/kays2023-stream-overlay/intro/   | 1920  | 1080   | 0 | 0   |

<sup>*data pulled from `_data/coming_up.json`, requires exchanging between matches</sup>

### WINNER SCENE
| source           | url/path                                                | width | height | x | y   |
|------------------|---------------------------------------------------------|-------|--------|---|-----|
| winner_overlay   | http://localhost:24050/kays2023-stream-overlay/winner/  | 1920  | 1080   | 0 | 0   |

Intro and winner scenes can also have the vc overlay on either bottom corner, doesn't matter

Add a `300ms` `linear horizontal` **luma wipe** transition between the scenes with `0.05` smoothness

## Other

### `_data` folder

- `beatmaps.json` - beatmap list, exchanged each round
- `coming_up.json` - time and team names for a match, exchanged every match, used for intro screen
