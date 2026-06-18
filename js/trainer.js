
const img_path = "./img/";
const img_ext = ".png";
const sounds_path = "./sounds/";
const sounds_ext = ".m4a";

var numAssetsToLoad = 0;
var imgs = {};
const makeAnimationFrames = count => Array.from({length: count}, (_, i) => String(i));
const nylocas_animation_frames = makeAnimationFrames(12);
const nylocas_death_animation_frames = {
    hagios: makeAnimationFrames(26),
    ischyros: makeAnimationFrames(42),
    toxobolos: makeAnimationFrames(26)
};
const nylocas_death_duration_cycles = Math.max(
        ...Object.values(nylocas_death_animation_frames).map(frames => frames.length));
const nylocas_death_sound_cycle = Math.floor(nylocas_death_duration_cycles / 4);
const img_ = {
    tile_board: "",
    acid_splat: "",
    magic_projectile: ["0","1","2","3","4","5","6","7","8","9","10"],
    nylocas: {
        hagios: nylocas_animation_frames,
        ischyros: nylocas_animation_frames,
        toxobolos: nylocas_animation_frames
    },
    nylocas_death: nylocas_death_animation_frames,
    whip: {idle: "", attack: ["0","1","2","3","4","5","6","7","8","9"]},
    scythe: {idle: "", attack: ["0","1","2","3","4","5","6","7","8","9"]},
    birds: ["0","1","2","3","4","5"],
    hitsplat: {25:""},
    verzik: {idle: ["0","1","2","3","4","5","6","7"],
            attack: ["0","1","2","3","4","5","6","7","8","9"]},
    bomb: {f:  ["0","1","2","3","4","5"],
           e:  ["0","1","2","3","4","5","6","7","8"]},
    x: {red: ["0","1","2","3","4"], yellow: ["0","1","2","3","4"]}
};
var sounds = {};
var audio_buffers = {};
const sounds_ = {
    scythe: "",
    whip: "",
    verzik_range: "",
    verzik_bounce: "",
    verzik_hit: "",
    crab_spawn: "crab_spawn.wav",
    nylocas_death: "nylocas_death.wav",
    magic_spark: "magic_spark_581.wav"
};

const cycle_length = 100; // .1 seconds per animation cycle, 10 fps
const cycles_per_tick = 6;
const tick_length = cycle_length * cycles_per_tick;
const initial_verzik_attack_cycle = 2;
const visual_metronome_danger_phase = 2;
const poison_pool_duration_ticks = 12;
const nylocas_special_duration_ticks = 12;
const board_width = 15;  // # game tiles wide
const board_height = 11; // # game tiles high
const nylocas_special_spawns = [
    {key: "hagios", x: board_width / 2, y: 1, size: 2},
    {key: "ischyros", x: 1, y: board_height / 2, size: 2},
    {key: "toxobolos", x: board_width - 1, y: board_height / 2, size: 2}
];

const tile_marker_json = '{"none":[],"1":[[7,2],[4,5],[10,5],[7,8]],"2":[[6,2],[8,2],[4,4],[4,6],[10,4],[10,6],[6,8],[8,8]],"3":[[5,2],[6,2],[7,2],[8,2],[9,2],[4,3],[4,4],[4,5],[4,6],[4,7],[10,3],[10,4],[10,5],[10,6],[10,7],[5,8],[6,8],[7,8],[8,8],[9,8]]}';
const tile_marker_arr = JSON.parse(tile_marker_json);

const tile_size_max = 110;
var tile_size = tile_size_max;
var tile_stroke = tile_size / 25;
var draw_scale = 1; //scale by which everything is drawn

const whip = {
    NAME: 'whip',
    CD: 4
};

const scythe = {
    NAME: 'scythe',
    CD: 5
};

const weapons = {
    "SCYTHE": scythe,
    "WHIP": whip
};
function angleToward(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}
const spawn_locations = {
    nw: {x: 3, y: 2},
    sw: {x: 3, y: 8},
    se: {x: 11, y: 8},
    ne: {x: 11, y: 2}
};
spawn_locations.nw.angle = angleToward(spawn_locations.nw, spawn_locations.se);
spawn_locations.sw.angle = angleToward(spawn_locations.sw, spawn_locations.ne);
spawn_locations.se.angle = angleToward(spawn_locations.se, spawn_locations.nw);
spawn_locations.ne.angle = angleToward(spawn_locations.ne, spawn_locations.sw);
const legacy_spawn_locations = {
    left: "nw",
    right: "se"
};

var booleans = {
    "show-verzik-tiles": true,
    "show-melee-tiles": false,
    "show-tile-indicators": true,
    "show-path-tiles": false,
    "show-xp-drops": true,
    "weapon-cooldown-metronome": false
};

var values = {
    "weapon-select": "SCYTHE",
    "spawn-location": "nw",
    "tile-marker-type": "3",
    "color-tile-marker": "#ffffff",
    "color-verzik-marker": "#000000",
    "color-melee-marker": "#ff0000",
    "color-tile-indicator": "#ff8000",
    "color-path-tile": "#ff8000",
    "color-marker-draw": "#ffff00"
};

var ping = 50;
var volume = 15;
const general_preferences_storage_key = "verzik-general-preferences-v1";
const metronome_storage_key = "verzik-game-tick-metronome-v1";
var metronome_enabled = localStorage.getItem(metronome_storage_key) === "true";
var metronome_audio_context = null;
var metronome_scheduler_timer = null;
var metronome_next_tock_time = 0;
var metronome_scheduled_oscillators = [];
const metronome_schedule_interval_ms = 1000;
const metronome_schedule_ahead_seconds = 12;
const metronome_cleanup_padding_seconds = .2;
const visual_metronome_storage_key = "verzik-visual-metronome-v1";
const saved_visual_metronome = localStorage.getItem(visual_metronome_storage_key);
var visual_metronome_enabled = saved_visual_metronome === null ? true : saved_visual_metronome === "true";
const visual_danger_tick_storage_key = "verzik-visual-danger-tick-v2";
const saved_visual_danger_tick = Number(localStorage.getItem(visual_danger_tick_storage_key));
var visual_danger_tick = [1, 2, 3, 4].includes(saved_visual_danger_tick) ? saved_visual_danger_tick : 2;
const unlimited_hp_storage_key = "verzik-unlimited-hp-v2";
const unlimited_player_hp_storage_key = "verzik-unlimited-player-hp-v1";
const unlimited_verzik_hp_storage_key = "verzik-unlimited-verzik-hp-v1";
var unlimited_player_hp_enabled = localStorage.getItem(unlimited_player_hp_storage_key) === "true";
var unlimited_verzik_hp_enabled = localStorage.getItem(unlimited_verzik_hp_storage_key) === "true";
const hmt_acid_pools_storage_key = "verzik-hmt-acid-pools-v1";
const saved_hmt_acid_pools = localStorage.getItem(hmt_acid_pools_storage_key);
var hmt_acid_pools_enabled = saved_hmt_acid_pools === null ? true : saved_hmt_acid_pools === "true";
const true_tile_enabled_storage_key = "verzik-show-true-tile-v1";
const true_tile_color_storage_key = "verzik-true-tile-color-v1";
const saved_true_tile_enabled = localStorage.getItem(true_tile_enabled_storage_key);
var true_tile_enabled = saved_true_tile_enabled === null ? true : saved_true_tile_enabled === "true";
var true_tile_color = localStorage.getItem(true_tile_color_storage_key) || "#006371";

function loadGeneralPreferences() {
    try {
        let saved = JSON.parse(localStorage.getItem(general_preferences_storage_key));
        if (!saved || typeof saved !== "object") return;

        for (let id of Object.keys(booleans)) {
            if (typeof saved.booleans?.[id] === "boolean") booleans[id] = saved.booleans[id];
        }

        if (["SCYTHE", "WHIP"].includes(saved.values?.["weapon-select"])) {
            values["weapon-select"] = saved.values["weapon-select"];
        }
        let saved_spawn_location = saved.values?.["spawn-location"];
        if (legacy_spawn_locations[saved_spawn_location]) {
            saved_spawn_location = legacy_spawn_locations[saved_spawn_location];
        }
        if (Object.keys(spawn_locations).includes(saved_spawn_location)) {
            values["spawn-location"] = saved_spawn_location;
        }
        if (["none", "1", "2", "3"].includes(saved.values?.["tile-marker-type"])) {
            values["tile-marker-type"] = saved.values["tile-marker-type"];
        }
        for (let id of [
            "color-tile-marker",
            "color-verzik-marker",
            "color-melee-marker",
            "color-tile-indicator",
            "color-path-tile",
            "color-marker-draw"
        ]) {
            if (/^#[0-9a-f]{6}$/i.test(saved.values?.[id])) {
                values[id] = saved.values[id].toLowerCase();
            }
        }

        let saved_ping = Number(saved.ping);
        let saved_volume = Number(saved.volume);
        if (saved_ping >= 10 && saved_ping <= 350) ping = saved_ping;
        if (saved_volume >= 0 && saved_volume <= 100) volume = saved_volume;
    } catch (error) {
        console.warn("Could not load general preferences.", error);
    }
}

function saveGeneralPreferences() {
    try {
        localStorage.setItem(general_preferences_storage_key, JSON.stringify({
            booleans: booleans,
            values: values,
            ping: Number(ping),
            volume: Number(volume)
        }));
    } catch (error) {
        console.warn("Could not save general preferences.", error);
    }
}

loadGeneralPreferences();

var canvas = $("tile-board");
var ctxt = canvas.getContext("2d");
var static_layer_canvas = document.createElement("canvas");
var static_layer_context = static_layer_canvas.getContext("2d");
var static_layer_dirty = true;
var scaled_image_cache = new WeakMap();
var scaled_sprite_cache = {};
const custom_tile_marker_storage_key = "verzik-custom-tile-markers-v1";
const custom_tile_marker_initialized_key = "verzik-custom-tile-markers-initialized-v1";
const ground_marker_preset_storage_key = "verzik-ground-marker-preset-v1";
const default_custom_tile_marker_color = "#ffff00";
const hmt_boak_tile_markers = {
    "11,3": {"color":"#ffff00","label":"2"},
    "10,4": {"color":"#00c853","label":"1"},
    "11,2": {"color":"#ffff00","label":"1"},
    "11,4": {"color":"#ffff00","label":"3"},
    "10,3": {"color":"#ffff00","label":"4"},
    "11,6": {"color":"#00c853","label":"2"},
    "12,8": {"color":"#00c853","label":"3"},
    "11,8": {"color":"#00c853","label":"7"},
    "7,8": {"color":"#ffff00","label":""},
    "10,9": {"color":"#00c853","label":"4"},
    "8,8": {"color":"#00c853","label":"5"},
    "10,10": {"color":"#00c853","label":"6"},
    "7,5": {"color":"#ff0000","label":"x"},
    "3,2": {"color":"#ffff00","label":"1"},
    "6,2": {"color":"#ff0000","label":"1"},
    "4,5": {"color":"#ff0000","label":"2"},
    "3,3": {"color":"#ffff00","label":"2"},
    "5,2": {"color":"#ff0000","label":"4"},
    "3,0": {"color":"#ff0000","label":"5"},
    "3,4": {"color":"#ff0000","label":"3"},
    "4,3": {"color":"#ffff00","label":"3"},
    "4,4": {"color":"#ffff00","label":"4"}
};
const reg_tob_boak_tile_markers = {
    "10,5": {"color":"#ffff00","label":"1"},
    "11,6": {"color":"#ffff00","label":"2, 5"},
    "9,8": {"color":"#ffff00","label":"3"},
    "7,9": {"color":"#ffff00","label":"4"},
    "6,2": {"color":"#ffff00","label":"1"},
    "4,5": {"color":"#ffff00","label":"2"},
    "3,4": {"color":"#ffff00","label":"3"},
    "5,2": {"color":"#ffff00","label":"4"},
    "3,0": {"color":"#ffff00","label":"5"}
};
const saved_ground_marker_preset = localStorage.getItem(ground_marker_preset_storage_key);
var ground_marker_preset = ["none", "hmt-boak", "reg-tob-boak", "custom"].includes(saved_ground_marker_preset)
    ? saved_ground_marker_preset
    : "hmt-boak";
var custom_tile_markers = loadCustomTileMarkers();
var context_menu_tile = null;
const last_used_color_storage_key = "verzik-last-used-color-v1";
const preset_colors = [
    "#ff0000", "#ff8000", "#ffff00", "#00c853", "#00ffff",
    "#0066ff", "#8000ff", "#ff00aa", "#ffffff", "#000000"
];
var last_used_color = localStorage.getItem(last_used_color_storage_key) || "#ffff00";
var active_color_input = null;
var active_color_previous = null;
var marker_json_mode = "export";


/// variables that are reset with reset();

var click_x;
var poison_pools;
var nylocas_special_ticks_remaining;
var nylocas_special_death_start_tick;
var nylocas_special_death_sound_played;

var first_click;
var first_attack;
var attacks_used;

var damage_taken;
var damage_dealt;

var attack_ticks;
var stalled_ticks;

var dead;
var victorious;

var cycles; //count .1 second intervals
var ticks;  //count ticks
var paused;
var tick_timer;
var last_cycle_timestamp;
var last_frame_timestamp;
var cycle_accumulator;
const max_cycles_per_frame = cycles_per_tick;

var p1;
var verzik;

var recent_click;

function $(id) {
    return document.getElementById(id);
}

function getCustomTileMarkerKey(x, y) {
    return `${x},${y}`;
}

function loadCustomTileMarkers() {
    try {
        let raw = localStorage.getItem(custom_tile_marker_storage_key);
        if (raw !== null) {
            localStorage.setItem(custom_tile_marker_initialized_key, "true");
            let saved = JSON.parse(raw);
            return saved && typeof saved === "object" ? saved : {};
        }
        if (localStorage.getItem(custom_tile_marker_initialized_key) === "true") {
            return {};
        }

        let defaults = cloneTileMarkers(hmt_boak_tile_markers);
        localStorage.setItem(custom_tile_marker_storage_key, JSON.stringify(defaults));
        localStorage.setItem(custom_tile_marker_initialized_key, "true");
        return defaults;
    } catch (error) {
        console.warn("Could not load custom tile markers.", error);
        return cloneTileMarkers(hmt_boak_tile_markers);
    }
}

function cloneTileMarkers(markers) {
    return JSON.parse(JSON.stringify(markers));
}

function saveCustomTileMarkers() {
    try {
        localStorage.setItem(custom_tile_marker_storage_key, JSON.stringify(custom_tile_markers));
        localStorage.setItem(custom_tile_marker_initialized_key, "true");
    } catch (error) {
        console.warn("Could not save custom tile markers.", error);
    }
    markStaticLayerDirty();
}

function setGroundMarkerPreset(preset) {
    ground_marker_preset = preset;
    localStorage.setItem(ground_marker_preset_storage_key, ground_marker_preset);
    let select = $("ground-marker-preset");
    if (select) select.value = ground_marker_preset;
}

function updateGroundMarkerPreset() {
    setGroundMarkerPreset($("ground-marker-preset").value);
    if (ground_marker_preset === "hmt-boak") {
        custom_tile_markers = cloneTileMarkers(hmt_boak_tile_markers);
    } else if (ground_marker_preset === "reg-tob-boak") {
        custom_tile_markers = cloneTileMarkers(reg_tob_boak_tile_markers);
    } else {
        custom_tile_markers = {};
    }
    saveCustomTileMarkers();
    hideTileContextMenu();
    draw();
    canvas.focus();
}

function markGroundMarkersAsCustom() {
    setGroundMarkerPreset("custom");
}

function getGroundMarkerExportJson() {
    let preset_names = {
        "hmt-boak": "HMT BOAK tiles",
        "reg-tob-boak": "reg TOB BOAK tiles"
    };
    return JSON.stringify({
        format: "verzik-ground-markers",
        version: 1,
        name: preset_names[ground_marker_preset] || "Custom ground markers",
        markers: custom_tile_markers
    }, null, 2);
}

function validateImportedGroundMarkers(data) {
    let markers = data && data.format === "verzik-ground-markers" ? data.markers : data;
    if (!markers || typeof markers !== "object" || Array.isArray(markers)) {
        throw new Error("JSON must contain a markers object.");
    }

    let validated = {};
    for (let key of Object.keys(markers)) {
        let match = /^(\d+),(\d+)$/.exec(key);
        if (!match) throw new Error(`Invalid tile coordinate: ${key}`);
        let x = Number(match[1]);
        let y = Number(match[2]);
        if (x < 0 || x >= board_width || y < 0 || y >= board_height) {
            throw new Error(`Tile ${key} is outside the board.`);
        }

        let marker = markers[key];
        if (!marker || typeof marker !== "object" || Array.isArray(marker)) {
            throw new Error(`Invalid marker data for tile ${key}.`);
        }
        let color = typeof marker.color === "string" ? marker.color.toLowerCase() : "";
        if (!/^#[0-9a-f]{6}$/.test(color)) {
            throw new Error(`Invalid color for tile ${key}.`);
        }
        let label = marker.label === undefined || marker.label === null ? "" : String(marker.label);
        validated[key] = {color: color, label: label.trim().slice(0, 40)};
    }
    return validated;
}

function setMarkerJsonStatus(message, is_error = false) {
    let status = $("marker-json-status");
    status.textContent = message;
    status.classList.toggle("error", is_error);
}

function openMarkerJsonPanel(mode) {
    marker_json_mode = mode;
    $("marker-json-title").textContent = mode === "export"
        ? "Export ground markers"
        : "Import ground markers";
    $("marker-json-help").textContent = mode === "export"
        ? "Copy this JSON or download it to share the current ground markers."
        : "Paste shared ground-marker JSON below, or choose a JSON file.";
    $("marker-json-text").value = mode === "export" ? getGroundMarkerExportJson() : "";
    $("choose-marker-json-file").style.display = mode === "import" ? "inline-block" : "none";
    $("copy-marker-json").style.display = mode === "export" ? "inline-block" : "none";
    $("download-marker-json").style.display = mode === "export" ? "inline-block" : "none";
    $("apply-marker-json").style.display = mode === "import" ? "inline-block" : "none";
    setMarkerJsonStatus("");
    $("marker-json-panel").classList.add("visible");
    $("marker-json-text").focus();
}

function closeMarkerJsonPanel() {
    $("marker-json-panel").classList.remove("visible");
    canvas.focus();
}

function importGroundMarkerJson(text) {
    let parsed;
    try {
        parsed = JSON.parse(text);
        custom_tile_markers = validateImportedGroundMarkers(parsed);
    } catch (error) {
        setMarkerJsonStatus(error.message || "Could not import this JSON.", true);
        return false;
    }

    markGroundMarkersAsCustom();
    saveCustomTileMarkers();
    draw();
    setMarkerJsonStatus(`Loaded ${Object.keys(custom_tile_markers).length} ground markers.`);
    return true;
}

function rememberPreviousColor(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    last_used_color = color.toLowerCase();
    localStorage.setItem(last_used_color_storage_key, last_used_color);
    updateLastColorSwatch();
}

function updateLastColorSwatch() {
    let swatch = $("last-color-swatch");
    if (swatch) {
        swatch.style.backgroundColor = last_used_color;
        swatch.title = `Last used color: ${last_used_color}`;
    }
}

function applyPaletteColor(color) {
    if (!active_color_input) return;
    let previous_color = active_color_previous || active_color_input.value;
    active_color_input.value = color;
    rememberPreviousColor(previous_color);
    active_color_previous = color;
    active_color_input.dispatchEvent(new Event("input", {bubbles: true}));
    active_color_input.dispatchEvent(new Event("change", {bubbles: true}));
    hideColorPresetMenu();
}

function showColorPresetMenu(input, client_x, client_y) {
    active_color_input = input;
    active_color_previous = input.value;
    updateLastColorSwatch();

    let menu = $("color-preset-menu");
    menu.classList.add("visible");
    let left = Math.min(client_x, window.innerWidth - menu.offsetWidth - 8);
    let top = Math.min(client_y, window.innerHeight - menu.offsetHeight - 8);
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
}

function hideColorPresetMenu() {
    let menu = $("color-preset-menu");
    if (menu) menu.classList.remove("visible");
}

function initializeColorPresetMenu() {
    let swatch_container = $("color-preset-swatches");
    for (let color of preset_colors) {
        let swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "color-swatch";
        swatch.style.backgroundColor = color;
        swatch.title = color;
        swatch.setAttribute("aria-label", `Use ${color}`);
        swatch.addEventListener("click", () => applyPaletteColor(color));
        swatch_container.appendChild(swatch);
    }

    $("last-color-swatch").addEventListener("click", () => applyPaletteColor(last_used_color));
    $("open-color-wheel").addEventListener("click", function () {
        let input = active_color_input;
        hideColorPresetMenu();
        if (!input) return;
        if (typeof input.showPicker === "function") {
            input.showPicker();
        } else {
            input.click();
        }
    });

    for (let input of document.querySelectorAll('input[type="color"]')) {
        input.addEventListener("input", function () {
            if (active_color_input !== this || this.value === active_color_previous) return;
            rememberPreviousColor(active_color_previous || this.value);
            active_color_previous = this.value;
        });
        if (input.id === "tile-marker-color-picker") continue;
        input.addEventListener("click", function (event) {
            event.preventDefault();
            let rect = this.getBoundingClientRect();
            showColorPresetMenu(this, rect.left, rect.bottom + 4);
        });
    }
    updateLastColorSwatch();
}

function getMetronomeAudioContext() {
    if (!metronome_audio_context) {
        let AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) metronome_audio_context = new AudioContextClass();
    }
    return metronome_audio_context;
}

function playSound(name, volume_divisor = 300) {
    let audio_context = getMetronomeAudioContext();
    let buffer = audio_buffers[name];
    if (!audio_context || !buffer || volume <= 0) return null;

    if (audio_context.state === "suspended") audio_context.resume();

    let source = audio_context.createBufferSource();
    let gain = audio_context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(Math.min(1, Math.max(0, volume / volume_divisor)), audio_context.currentTime);
    source.connect(gain);
    gain.connect(audio_context.destination);
    source.start();
    return source;
}

function scheduleMetronomeTock(time) {
    let audio_context = getMetronomeAudioContext();
    if (!audio_context || audio_context.state !== "running") return;

    let oscillator = audio_context.createOscillator();
    let gain = audio_context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(180, time);
    oscillator.frequency.exponentialRampToValueAtTime(95, time + .045);
    gain.gain.setValueAtTime(Math.max(.0001, (volume / 100) * .28), time);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .06);

    oscillator.connect(gain);
    gain.connect(audio_context.destination);
    oscillator.start(time);
    oscillator.stop(time + .065);
    metronome_scheduled_oscillators.push(oscillator);
    setTimeout(() => {
        metronome_scheduled_oscillators = metronome_scheduled_oscillators.filter(node => node !== oscillator);
    }, Math.max(0, (time - audio_context.currentTime + metronome_cleanup_padding_seconds) * 1000));
}

function getSecondsUntilNextGameTick() {
    let elapsed_since_cycle = Math.max(0, performance.now() - last_cycle_timestamp);
    let milliseconds_until_next_cycle = Math.max(0, cycle_length - elapsed_since_cycle);
    let cycles_until_tick = (cycles_per_tick - cycles) % cycles_per_tick;
    if (cycles_until_tick === 0) cycles_until_tick = cycles_per_tick;
    return (milliseconds_until_next_cycle + (cycles_until_tick - 1) * cycle_length) / 1000;
}

function scheduleMetronomeLookahead() {
    if (!metronome_enabled || paused || !first_click || volume <= 0) return;
    let audio_context = getMetronomeAudioContext();
    if (!audio_context || audio_context.state !== "running") return;

    let now = audio_context.currentTime;
    if (!metronome_next_tock_time) metronome_next_tock_time = now + .03;
    while (metronome_next_tock_time < now + metronome_schedule_ahead_seconds) {
        scheduleMetronomeTock(metronome_next_tock_time);
        metronome_next_tock_time += tick_length / 1000;
    }
}

function startMetronomeScheduler(first_tock_delay_seconds = .03) {
    if (!metronome_enabled || metronome_scheduler_timer) return;
    let audio_context = getMetronomeAudioContext();
    if (!audio_context) return;
    if (audio_context.state === "suspended") audio_context.resume();
    metronome_next_tock_time = audio_context.currentTime + Math.max(.03, first_tock_delay_seconds);
    scheduleMetronomeLookahead();
    metronome_scheduler_timer = setInterval(scheduleMetronomeLookahead, metronome_schedule_interval_ms);
}

function stopMetronomeScheduler() {
    clearInterval(metronome_scheduler_timer);
    metronome_scheduler_timer = null;
    metronome_next_tock_time = 0;
    for (let oscillator of metronome_scheduled_oscillators) {
        try {
            oscillator.stop();
        } catch (error) {
            // The node may already have stopped naturally.
        }
    }
    metronome_scheduled_oscillators = [];
}

function syncMetronomeScheduler(first_tock_delay_seconds = getSecondsUntilNextGameTick()) {
    if (metronome_enabled && !paused && first_click) {
        startMetronomeScheduler(first_tock_delay_seconds);
    } else {
        stopMetronomeScheduler();
    }
}

function playWebSwooshSound() {
    if (volume <= 0) return;
    let audio_context = getMetronomeAudioContext();
    if (!audio_context || audio_context.state !== "running") return;

    let now = audio_context.currentTime;
    let duration = .48;
    let sample_count = Math.floor(audio_context.sampleRate * duration);
    let buffer = audio_context.createBuffer(1, sample_count, audio_context.sampleRate);
    let samples = buffer.getChannelData(0);
    for (let i = 0; i < sample_count; i++) {
        let progress = i / sample_count;
        samples[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * progress);
    }

    let noise = audio_context.createBufferSource();
    let filter = audio_context.createBiquadFilter();
    let gain = audio_context.createGain();
    let snap = audio_context.createOscillator();
    let snap_gain = audio_context.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.Q.value = 1.35;
    filter.frequency.setValueAtTime(2700, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, (volume / 100) * .58), now + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);

    snap.type = "sawtooth";
    snap.frequency.setValueAtTime(720, now);
    snap.frequency.exponentialRampToValueAtTime(115, now + .16);
    snap_gain.gain.setValueAtTime(Math.max(.0001, (volume / 100) * .4), now);
    snap_gain.gain.exponentialRampToValueAtTime(.0001, now + .18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audio_context.destination);
    snap.connect(snap_gain);
    snap_gain.connect(audio_context.destination);
    noise.start(now);
    noise.stop(now + duration);
    snap.start(now);
    snap.stop(now + .18);
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Returns the number of tile movements between this point and p
     *
     * @param {Point} p is a Point, or any object with an x and y field
     * @returns {Number}
     */
    dist(p) {
        if (p === null) return null;
        return Math.max(Math.abs(this.x - p.x), Math.abs(this.y - p.y));
    }

    /**
     * Returns the biased distance between this point and point p.
     *
     * For distances with the same number of tile movements, this function
     * always returns a lesser value for left(westward) distances than for
     * right(eastward) distances, and a lesser value for right distances than
     * for up or down distances.  This is to mimic the pathing in osrs.
     *
     * @param {Point} p is a Point, or any object with an x and y field
     * @returns {Number}
     */
    distBiased(p) {
        let dist = this.dist(p);
        let diagonal = dist - Math.abs(Math.abs(this.x - p.x) - Math.abs(this.y - p.y));
        let west_east = p.x - this.x;
        return dist + diagonal * .414 //add .414 * amount of diagonal movement
                + (west_east < 0 ? .02 : -.01) * west_east; //subtract .02 if movement is going west and .01 if movement is going east
    }
}

class Player  {
    constructor(pos) {
        this.position = new Point(pos.x, pos.y); //default start
        this.prev_pos = new Point(pos.x, pos.y);
        this.size = 1;
        this.target_tile = null;        //the tile on which to draw a tile indicator, the next target_tile_server
        this.target_tile_server = null; //target_tile as seen by the 'server', delayed by ping
        this.path_tiles = [];           //array of tiles in path to target_tile_server
        this.attack_target = null;      //the npc being targetted for attack
        this.focus_angle = null;        //the center point of the player's focus
        this.anim_angle = 0;            //the direction in which the player is facing
        this.anim_pos = new Point(pos.x, pos.y);
        this.weapon = weapons[values["weapon-select"]];
        this.img = new Image();
        this.animation_frames = [];
        this.max_hp = 99;
        this.hp = 99;
        this.hp_bar = new HpBar(this);
        this.max_str = 99;
        this.str = 118;
        this.attack_cd = 0;             //attack cool-down timer in ticks
        this.attack_audio = null;
        this.xp_drop = null;
        this.stun_timer = 0;
        this.stun_birds = null;
    }

    //center of animation in terms of tile
    getAnimCenter() {
        return new Point((this.anim_pos.x + .5), (this.anim_pos.y + .5));
    }

    //center in terms of pixel
    getCenterPixel() {
        return new Point((this.position.x + .5) * tile_size, (this.position.y + .5) * tile_size);
    }

    /**
     * Calculates the target tile from the given click_target
     *
     * @param click_target can be either an NPC or a Point
     * @returns {Point} target_tile
     */
    calcTargetTile(click_target) {
        let target_tile = null;
        if (click_target.isNpc) {
            let tiles = click_target.getTilesInAttackableRange(1);
            let min = 999;
            for (let tile of tiles) {
                let dist = this.position.distBiased(tile);
                if (dist < min) {
                    min = dist;
                    target_tile = tile;
                }
            }
        } else { //click_target is not an NPC, so is a Point
            target_tile = new Point(click_target.x, click_target.y);
        }
        return target_tile;
    }

    setTargetTile(click_target) {
        this.target_tile = this.calcTargetTile(click_target);
    }

    tick() {

        if (this.stun_timer) {
            this.stun_timer--;
            //save prev position
            this.prev_pos = new Point(this.position.x, this.position.y);
            if (this.attack_cd) {
                this.attack_cd -= 1;
            }
            if (this.stun_timer === 0) this.stun_birds = null;
        } else {
            if (recent_click) {
                this.attack_target = recent_click.isNpc ? recent_click : null;
                this.target_tile_server = this.calcTargetTile(recent_click);
                this.path_tiles = generate_path(this.position, this.target_tile_server);
                recent_click = null;
            }

            //save prev position
            this.prev_pos = new Point(this.position.x, this.position.y);

            //change player position
            //delete this.path_tiles entry
            if (this.target_tile_server) {
                if (this.path_tiles.length > 1) this.path_tiles.shift();
                this.position = this.path_tiles.shift(); //remove first path tile and set this.pos to it
            }
            //update this.target_tile/_server
            if (this.position.dist(this.target_tile_server) === 0) {
                this.target_tile_server = null;
                //only clear target_tile if you're already standing there,
                //and there's no target_tile_server
                if (this.position.dist(this.target_tile) === 0) {
                    this.target_tile = null;
                }
            }
            if (this.attack_cd) {
                this.attack_cd -= 1;
            }
            //check if can attack
            if (this.canAttack()) {
                this.performAttack();
            }
        }
    }

    canAttack() {
        return this.attack_target && !this.target_tile_server && this.attack_cd === 0;
    }

    performAttack() {
        attacks_used += 1;
        
        if (this.weapon === weapons.SCYTHE) {
            attack_ticks += this.weapon.CD * 16/15;
        } else if (this.weapon === weapons.WHIP) {
            attack_ticks += this.weapon.CD;
        }

        this.attack_cd += this.weapon.CD;
        this.animation_frames = [...imgs[this.weapon.NAME].attack];

        this.attack_audio = playSound(this.weapon.NAME);
        let dmg = this.damageDealt();
        this.attack_target.hit(dmg);
        damage_dealt += dmg;
        this.xp_drop = {
            damage: dmg,
            start_tick: ticks
        };
    }
    
    damageDealt() {
        let max_hit = 48 * (this.str / this.max_str) * (99/118) ; // temp
        let damage = 0;
        let whip_accuracy = .5512;
        let scy_accuracy = .5878;
        if (this.weapon === weapons.SCYTHE) {
            if (scy_accuracy > Math.random()) {
                damage += Math.floor(Math.random() * (max_hit+1));
            }
            if (scy_accuracy > Math.random()) {
                damage += Math.floor(Math.random() * (Math.floor(max_hit/2)+1));
            }
            if (scy_accuracy > Math.random()) {
                damage += Math.floor(Math.random() * (Math.floor(max_hit/4)+1));
            }
        } else if (this.weapon === weapons.WHIP) {
            if (whip_accuracy > Math.random()) {
                damage += Math.floor(Math.random() * (max_hit+1));
            }
        }
        return damage;
    }

    hit(dmg) {
        damage_taken += dmg;
        if (!unlimited_player_hp_enabled) this.hp -= dmg;
        this.hp_bar.display();
        this.hitsplat = new HitSplat(dmg);
        setTimeout(()=>{
            this.hitsplat = null;
        }, 2 * tick_length);
        if (this.hp <= 0) death();
    }

    stun(t) {
        this.stun_timer = t;
        this.stun_birds = new StunBirds();

        this.target_tile = null;
        this.target_tile_server = null;
        this.path_tiles = [];
        this.attack_target = null;
        this.focus_angle = null;
        this.anim_angle = Math.atan2(this.position.y-(this.prev_pos.y),this.position.x-(this.prev_pos.x));
    }

    animate() {
        //update image
        this.img = this.getImg();

        let focus_point;
        //set focus_point
        if (this.attack_target) { //if there's an attack target, point character towards it
            focus_point = this.attack_target.getAnimCenter(); //tile center
        } else if (this.position.dist(this.prev_pos)) { //if moving, point character in that direction
            focus_point = new Point(
                    this.position.x + .5,
                    this.position.y + .5);
        } else { //else, no target, not moving
            focus_point = null;
        }
        if (focus_point) {
            //animate movement position
            this.anim_pos = new Point(
                    this.prev_pos.x + (this.position.x - this.prev_pos.x) * ((cycles +1)/cycles_per_tick),
                    this.prev_pos.y + (this.position.y - this.prev_pos.y) * ((cycles +1)/cycles_per_tick));
            //animate rotational movement
            //if animated position is not the same as focus_point, rotate player towards focus_point
            if (this.anim_pos.x+.5!==focus_point.x||this.anim_pos.y+.5!==focus_point.y) {
                this.focus_angle = Math.atan2(focus_point.y-(this.anim_pos.y+.5),focus_point.x-(this.anim_pos.x+.5));
                let angleDif = getAngleDifference(this.anim_angle, this.focus_angle);
                //set anim_angle closer to focus_angle
                if (angleDif > 0) {
                    this.anim_angle += Math.min(Math.PI / 3.8, angleDif);
                    if (this.anim_angle > Math.PI) this.anim_angle -= 2 * Math.PI;
                } else if (angleDif < 0) {
                    this.anim_angle -= Math.min(Math.PI / 3.8, -angleDif);
                    if (this.anim_angle < -Math.PI) this.anim_angle += 2 * Math.PI;
                }
            }
        }
    }

    getImg() {
        let anim_frame = this.animation_frames.shift();
        if (!anim_frame) anim_frame = imgs[this.weapon.NAME].idle;
        return anim_frame;
    }

    draw(context) {
        context.save();
        try {
            context.translate((this.anim_pos.x +.5)*tile_size,(this.anim_pos.y +.5)*tile_size);
            context.rotate(this.anim_angle);
            drawImgCentered(context, this.img);
            context.rotate(-this.anim_angle);
            if (this.stun_timer) this.stun_birds.drawInPlace(context);
            if (this.hp_bar.show) this.hp_bar.drawInPlace(context);
            if (this.hitsplat) this.hitsplat.drawInPlace(context);
            this.drawXpDrop(context);
            this.drawWeaponCooldown(context);
        } finally {
            context.restore();
        }
    }

    drawXpDrop(context) {
        if (!booleans["show-xp-drops"] || !this.xp_drop) return;

        let age = ticks - this.xp_drop.start_tick + cycles / cycles_per_tick;
        if (age >= 3) {
            this.xp_drop = null;
            return;
        }

        context.save();
        context.globalAlpha = Math.max(0, 1 - age / 3);
        context.font = `bold ${Math.max(16, Math.round(tile_size * .34))}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineWidth = Math.max(2, Math.round(draw_scale * 3));
        context.strokeStyle = "#000000";
        context.fillStyle = "#ffffff";
        let vertical_offset = -age * tile_size;
        context.strokeText(String(this.xp_drop.damage), 0, vertical_offset);
        context.fillText(String(this.xp_drop.damage), 0, vertical_offset);
        context.restore();
    }

    drawWeaponCooldown(context) {
        if (!booleans["weapon-cooldown-metronome"] || this.attack_cd <= 0) return;

        context.save();
        context.font = `bold ${Math.max(16, Math.round(tile_size * .32))}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineWidth = Math.max(2, Math.round(draw_scale * 3));
        context.strokeStyle = "#000000";
        context.fillStyle = "#ffff00";
        let vertical_offset = tile_size * .24;
        context.strokeText(String(this.attack_cd), 0, vertical_offset);
        context.fillText(String(this.attack_cd), 0, vertical_offset);
        context.restore();
    }

}

class HpBar {
    constructor(owner) {
        this.owner = owner;
        this.show = 0;
    }
    
    display() {
        this.show += 1;
        setTimeout(()=>{
            this.hide();
        }, 9.5 * tick_length);
    }
    
    hide() {
        this.show -= 1;
    }

    drawInPlace(context) {
        let w = 30;
        let h = 5;
        let xpos = Math.round(-w/2);
        let ypos = Math.round(-tile_size * this.owner.size/3 - h/2);
        context.fillStyle = "#ff0000";  //red bar
        context.fillRect(xpos, ypos, w, h);
        if (this.owner.hp <= 0) return;
        let hp_fraction = Math.round(Math.max(1, w * Math.min(1, (this.owner.hp/this.owner.max_hp))));
        context.fillStyle = "#00ff00";  //green bar
        context.fillRect(xpos, ypos, hp_fraction, h);
    }
}

class HitSplat {
    constructor(dmg) {
        this.img = imgs.hitsplat[dmg];
    }

    drawInPlace(context) {
        drawImgCentered(context, this.img);
    }
}

class StunBirds {
    constructor() {
        this.img = new Image();
        this.animation_frames = [...imgs.birds];
    }

    getImg() {
        let anim_frame = this.animation_frames.shift();
        if (!anim_frame) {
            this.animation_frames = [...imgs.birds];
            anim_frame = this.animation_frames.shift();
        }
        return anim_frame;
    }

    drawInPlace(context) {
        this.img = this.getImg();
        drawImgCentered(context, this.img);
    }
}

class ClickX {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.img = new Image();
        this.animation_frames = [];
    }
    
    click(click_target, click_event) {
        let color = click_target.isNpc ? "red" : "yellow";
        let click_pos = getCanvasPointFromEvent(click_event);
        this.x = click_pos.x;
        this.y = click_pos.y;
        this.animation_frames = [...imgs.x[color]];
    }

    getImg() {
        let anim_frame = this.animation_frames.shift();
        if (!anim_frame) {
            return null;
        }
        return anim_frame;
    }

    draw(context) {
        this.img = this.getImg();
        context.translate(this.x,this.y);
        drawImgCentered(context, this.img, false);
        context.translate(-this.x,-this.y);
    }
}

class NPC {
    constructor(pos, size) {
        this.pos = new Point(pos.x, pos.y);
        this.size = size;   //size x size tiles
        this.isNpc = true;

        this.attack_target = null;  //the player being targetted for attack
        this.target_loc = null;     //the location of the attack_target when targetted
        this.range_att = false;     //true if attack_target will receive a range attack
        this.bounce_att = false;    //true if attack_target will receive a bounce attack
        this.focus_angle = null;    //the center point of the npc's focus
        this.angle = 0;             //the direction in which the npc is facing
        this.prev_angle = 0;
        this.attack_speed = 4;
        this.img;
        this.animation_frames = [];
        this.max_hp = 750;
        this.hp = 750;
        this.hp_bar = new HpBar(this);
        this.attack_cycle = 4;      //attack cycle counter in ticks
        this.attack_audio = null;
        this.normal_autos_since_magic = 0;
        this.range_attack_type = "basic";
        this.crab_special_eligible = true;
        this.blue_specials_since_crab = 0;
    }

    target(player) {
        this.attack_target = player;
    }

    //center in terms of tiles
    getAnimCenter() {
        return new Point(this.pos.x + this.size/2, this.pos.y + this.size/2);
    }

    //center in terms of pixel
    getCenterPixel() {
        return new Point((this.pos.x + this.size/2) * tile_size, (this.pos.y + this.size/2) * tile_size);
    }

    tick() {
        this.attackCycle();
    }

    attackCycle() {
        switch (this.attack_cycle--) {
            case 3:
                if (this.range_att) {
                    this.range_bomb = this.range_attack_type === "special"
                        ? new MagicProjectile(this, this.attack_target)
                        : new RangeBomb(this, this.attack_target, this.target_loc);
                }
                break;
            case 2:
                if (this.range_att) {
                    this.range_bomb.detonate();
                }
                break;
            case 1:
                this.target_loc = this.attack_target.position;
                this.bounce_att = this.checkInBounceRange(this.target_loc); //bounce attack if in melee range
                this.range_att = !this.bounce_att;  //range attack if outside of bounce range
                break;
            case 0:
                this.performAttack();
        }
    }

    performAttack() {
        //start tracking efficiency at first attack from verzik
        if (!first_attack) {
            first_attack = true;
            attack_ticks = 0;
            stalled_ticks = ticks;
        }
        
        this.attack_cycle += this.attack_speed;
        if (this.crab_special_eligible && Math.random() < .25) {
            this.crabAttack();
            return;
        }
        if (this.bounce_att) {  //bounce attack if in melee range
            this.bounceAttack(this.attack_target);
        } else {                //range attack if outside of bounce range
            this.rangeAttack(this.attack_target);
        }
    }

    checkInBounceRange(p) {
        let tiles = this.getTilesInAttackRange(1);
        let returnBool = false;

        for (let tile of tiles) {
            if (tile.dist(p) === 0) {
                returnBool = true;
                break;
            }
        }

        return returnBool;
    }

    bounceAttack(attack_target) {
        let bounce_tile = null;
        let tiles = this.getTilesAtRange(4);
        let min = 999;
        for (let tile of tiles) {
            let dist = attack_target.position.distBiased(tile);
            if (dist < min) {
                min = dist;
                bounce_tile = tile;
            }
        }

        attack_target.position = bounce_tile;

//        attack_target.hit(25);
        attack_target.stun(8);

        this.animation_frames = [...imgs.verzik.attack]; //TODO add bounce anim
        this.attack_audio = playSound("verzik_bounce");
    }

    rangeAttack(attack_target) {
        if (this.normal_autos_since_magic === 4) {
            this.range_attack_type = "special";
            this.normal_autos_since_magic = 0;
            playSound("magic_spark", 100);
            if (!this.crab_special_eligible) {
                this.blue_specials_since_crab += 1;
                if (this.blue_specials_since_crab >= 4) {
                    this.crab_special_eligible = true;
                }
            }
        } else {
            this.range_attack_type = "basic";
            this.normal_autos_since_magic += 1;
        }
        this.animation_frames = [...imgs.verzik.attack];
        this.attack_audio = playSound("verzik_range");
    }

    crabAttack() {
        // Crab replaces this attack without changing the four-auto magic count.
        this.crab_special_eligible = false;
        this.blue_specials_since_crab = 0;
        nylocas_special_ticks_remaining = nylocas_special_duration_ticks;
        nylocas_special_death_start_tick = null;
        nylocas_special_death_sound_played = false;
        this.range_att = false;
        this.range_bomb = null;
        this.animation_frames = [...imgs.verzik.attack];
        playSound("crab_spawn", 200);
    }

    hit(dmg) {
        if (!unlimited_verzik_hp_enabled) this.hp -= dmg;
        this.hp_bar.display();
        playSound("verzik_hit");
        if (this.hp <= 0) victory();
    }

    animate() {
        //update image
        this.img = this.getImg();

        //set focus_point :: assuming there's always an attack_target
        let focus_point = this.attack_target.getAnimCenter();

        //set this.angle :: assuming npc doesn't move
        let cp = this.getAnimCenter();
        this.focus_angle = Math.atan2(focus_point.y - (cp.y), focus_point.x - (cp.x));
        this.angle = this.focus_angle;

        if (this.range_bomb) this.range_bomb.animate();
    }

    getImg() {
        let anim_frame = this.animation_frames.shift();
        if (!anim_frame) {
            this.animation_frames = [...imgs.verzik.idle];
            anim_frame = this.animation_frames.shift();
        }
        return anim_frame;
    }

    draw(context) {
        let center = this.getCenterPixel();
        context.beginPath();
        context.arc(center.x, center.y, tile_size*this.size/2, 0, 2 * Math.PI);
        context.fillStyle = '#00000040';
        context.fill();
        context.beginPath();
        context.arc(center.x, center.y, .9*tile_size*this.size/2, 0, 2 * Math.PI);
        context.fillStyle = '#00000010';
        context.fill();

        let cp = this.getCenterPixel();
        context.translate(cp.x, cp.y);
        context.rotate(this.angle);
        drawImgCentered(context, this.img);
        context.rotate(-this.angle);
        if (this.hp_bar.show) this.hp_bar.drawInPlace(context);
        context.translate(-cp.x, -cp.y);

        if (this.range_bomb && !(this.range_bomb instanceof MagicProjectile)) {
            this.range_bomb.draw(context);
        }
    }

    /**
     * Tests a point, p, to see if it's within the click area of this npc.
     *
     * It is within the click area iff it's within a circle with diameter of
     * this.size which is centered at getCenterPixel().
     *
     * @param {Point} p the Point to test
     * @returns {boolean} true iff p is within size/2 units of getCenterPixel()
     */
    circleCollision(p) {
        let center = this.getCenterPixel();
        return (this.size * tile_size / 2) > Math.sqrt((p.x - center.x) * (p.x - center.x) + (p.y-center.y) * (p.y-center.y));
    }

    /**
     * Returns an array of Points that are exactly r tiles away from NPC
     *
     * @param {int} r the attack range of this NPC
     * @returns {Array|NPC.getTilesInAttackRange.tiles}
     */
    getTilesAtRange(r) {
        let tiles = [];
        for (let x = -r; x < this.size + r; x++) {
            for (let y = -r; y < this.size + r; y++) {
                if (x === -r || x === this.size+r-1|| y === -r || y === this.size+r-1) {
                    tiles.push(new Point(this.pos.x + x, this.pos.y + y));
                }
            }
        }
        return tiles;
    }

    /**
     * Returns an array of Points within this NPC's attack range
     *
     * @param {int} r the attack range of this NPC
     * @returns {Array|NPC.getTilesInAttackRange.tiles}
     */
    getTilesInAttackRange(r) {
        let tiles = [];
        for (let x = -r; x < this.size + r; x++) {
            for (let y = -r; y < this.size + r; y++) {
                if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) {
                    tiles.push(new Point(this.pos.x + x, this.pos.y + y));
                }
            }
        }
        return tiles;
    }

    /**
     * Returns an array of Points from which this NPC is attackable
     *
     * @param {int} r the attack range of the attacker
     * @returns {Array|NPC.getTilesInAttackableRange.tiles}
     */
    getTilesInAttackableRange(r) {
        let tiles = [];
        for (let x = -r; x < this.size + r; x++) {
            for (let y = -r; y < this.size + r; y++) {
                if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) {
                    if (r === 1) {
                        if((x === -1 && (y === -1 || y === this.size)) || (x === this.size && (y === -1 || y === this.size))) {
                            continue; //don't add tile if it's on the corner
                        }
                    }
                    tiles.push(new Point(this.pos.x + x, this.pos.y + y));
                }
            }
        }
        return tiles;
    }
}

class RangeBomb {
    constructor(npc, player, location) {
        this.npc = npc;
        this.npc_center = npc.getAnimCenter();
        this.player = player;
        this.target_tile = location;
        this.img = null;
        this.angle = Math.atan2(this.target_tile.y+.5-(this.npc_center.y),this.target_tile.x+.5-(this.npc_center.x));
        this.location = null;
        this.animation_frames = [...imgs.bomb.f];
    }

    detonate() {
        this.detonated = true;
        this.animation_frames = [...imgs.bomb.e];
        addPoisonPool(this.target_tile);
        if (this.player.prev_pos.dist(this.target_tile) === 0) {
            this.player.hit(25);
        }
    }

    animate() {
        this.img = this.getImg();
        if (this.detonated) {
            this.anim_pos = {x: this.target_tile.x+.5, y: this.target_tile.y+.5};
        } else {
            this.anim_pos = new Point(
                    this.npc_center.x + (this.target_tile.x+.5 - this.npc_center.x) * (1/3 + (cycles * (19/30))/cycles_per_tick),
                    this.npc_center.y + (this.target_tile.y+.5 - this.npc_center.y) * (1/3 + (cycles * (19/30))/cycles_per_tick));
        }
    }

    getImg() {
        let anim_frame = this.animation_frames.shift();
        if (!anim_frame) {
            return null;
        }
        return anim_frame;
    }

    draw(context) {
        let cp = new Point(this.anim_pos.x * tile_size, this.anim_pos.y * tile_size);
        context.translate(cp.x, cp.y);
        context.rotate(this.angle);
        drawImgCentered(context, this.img);
        context.rotate(-this.angle);
        context.translate(-cp.x, -cp.y);
    }
}

class MagicProjectile {
    constructor(npc, player) {
        this.npc_center = npc.getAnimCenter();
        this.player = player;
        this.anim_pos = new Point(this.npc_center.x, this.npc_center.y);
        this.detonated = false;
        this.animation_step = 0;
        this.impact_step = -1;
    }

    detonate() {
        this.detonated = true;
        this.impact_step = -1;
    }

    animate() {
        this.animation_step += 1;
        if (this.detonated) {
            this.impact_step += 1;
            this.anim_pos = this.player.getAnimCenter();
            return;
        }

        let target = this.player.getAnimCenter();
        let progress = 1/3 + (cycles * (19/30))/cycles_per_tick;
        this.anim_pos = new Point(
                this.npc_center.x + (target.x - this.npc_center.x) * progress,
                this.npc_center.y + (target.y - this.npc_center.y) * progress);
    }

    draw(context) {
        if (this.detonated && this.impact_step >= imgs.magic_projectile.length) return;

        let center = new Point(this.anim_pos.x * tile_size, this.anim_pos.y * tile_size);
        let frame_index = this.detonated
            ? Math.max(0, this.impact_step)
            : this.animation_step % 6;
        let image = imgs.magic_projectile[frame_index];
        let pulse = this.detonated ? 1 : 1 + Math.sin(this.animation_step * .9) * .08;
        let size = tile_size * (this.detonated ? 1.25 : .88) * pulse;

        context.save();
        context.drawImage(image, center.x - size / 2, center.y - size / 2, size, size);
        context.restore();
    }
}

class PoisonPool {
    constructor(tile) {
        this.tile = new Point(tile.x, tile.y);
        this.ticks_remaining = poison_pool_duration_ticks;
    }

    tick() {
        this.ticks_remaining -= 1;
        return this.ticks_remaining > 0;
    }

    draw(context) {
        if (!imgs.acid_splat) return;

        let size = tile_size;
        let sprite = getScaledSprite("acid_splat", imgs.acid_splat, size, size);
        let center_x = (this.tile.x + .5) * tile_size;
        let center_y = (this.tile.y + .5) * tile_size;

        context.save();
        context.drawImage(
                sprite,
                center_x - size / 2,
                center_y - size / 2,
                size,
                size);
        context.restore();
    }
}

function addPoisonPool(tile) {
    if (!hmt_acid_pools_enabled) return;

    let existing = poison_pools.find(pool => pool.tile.dist(tile) === 0);
    if (existing) {
        existing.ticks_remaining = poison_pool_duration_ticks;
    } else {
        poison_pools.push(new PoisonPool(tile));
    }
}

function tickPoisonPools() {
    poison_pools = poison_pools.filter(pool => pool.tick());
}

function damagePlayerInPoisonPool() {
    if (poison_pools.some(pool => pool.tile.dist(p1.position) === 0)) {
        p1.hit(5);
    }
}

function drawPoisonPools() {
    for (let pool of poison_pools) pool.draw(ctxt);
}

function tickNylocasSpecial() {
    if (nylocas_special_ticks_remaining > 0) {
        nylocas_special_ticks_remaining -= 1;
        if (nylocas_special_ticks_remaining === 0) {
            nylocas_special_death_start_tick = ticks;
            nylocas_special_death_sound_played = false;
        }
    } else if (nylocas_special_death_start_tick !== null) {
        let elapsed_cycles = (ticks - nylocas_special_death_start_tick) * cycles_per_tick;
        if (!nylocas_special_death_sound_played && elapsed_cycles >= nylocas_death_sound_cycle) {
            playSound("nylocas_death", 100);
            nylocas_special_death_sound_played = true;
        }
        if (elapsed_cycles >= nylocas_death_duration_cycles) nylocas_special_death_start_tick = null;
    }
}

function getNylocasSpecialAngle(spawn) {
    let center_x = board_width / 2;
    let center_y = board_height / 2;
    return Math.atan2(center_y - spawn.y, center_x - spawn.x) - Math.PI / 2;
}

function getNylocasSpecialAnimationState() {
    if (nylocas_special_ticks_remaining > 0) {
        return {
            frames_by_key: imgs.nylocas,
            elapsed_cycles: (nylocas_special_duration_ticks - nylocas_special_ticks_remaining) * cycles_per_tick + cycles,
            loop: true
        };
    }
    if (nylocas_special_death_start_tick !== null) {
        let elapsed_cycles = (ticks - nylocas_special_death_start_tick) * cycles_per_tick + cycles;
        if (elapsed_cycles >= nylocas_death_duration_cycles) return null;
        return {
            frames_by_key: imgs.nylocas_death,
            elapsed_cycles,
            loop: false
        };
    }
    return null;
}

function drawNylocasSpecial() {
    let state = getNylocasSpecialAnimationState();
    if (!state || !state.frames_by_key) return;

    for (let spawn of nylocas_special_spawns) {
        let frames = state.frames_by_key[spawn.key];
        if (!frames || !frames.length) continue;

        if (!state.loop && state.elapsed_cycles >= frames.length) continue;
        let frame_index = state.loop ? state.elapsed_cycles % frames.length : state.elapsed_cycles;
        let frame = frames[frame_index];
        if (!frame) continue;

        let size = tile_size * spawn.size;
        let aspect_ratio = frame.width / frame.height;
        let draw_width = aspect_ratio >= 1 ? size : size * aspect_ratio;
        let draw_height = aspect_ratio >= 1 ? size / aspect_ratio : size;
        let scaled_sprite = getScaledSprite(`nylocas_${spawn.key}_${frame_index}`, frame, draw_width, draw_height);

        ctxt.save();
        ctxt.translate(spawn.x * tile_size, spawn.y * tile_size);
        ctxt.rotate(getNylocasSpecialAngle(spawn));
        ctxt.drawImage(scaled_sprite, -draw_width / 2, -draw_height / 2, draw_width, draw_height);
        ctxt.restore();
    }
}

function getVisualMetronomePhase() {
    return ticks === 0 ? 1 : ((ticks - 1) % 4) + 1;
}

function getVisualMetronomeTick() {
    let phase = getVisualMetronomePhase();
    return ((phase - visual_metronome_danger_phase + visual_danger_tick + 3) % 4) + 1;
}

function drawVisualMetronome() {
    if (!visual_metronome_enabled || !verzik) return;

    let tick = getVisualMetronomeTick();
    let center = verzik.getCenterPixel();
    let radius = Math.max(22, tile_size * .36);
    let color = getVisualMetronomePhase() === visual_metronome_danger_phase ? "#e32222" : "#18a83a";

    ctxt.save();
    ctxt.fillStyle = color;
    ctxt.strokeStyle = "#000000";
    ctxt.lineWidth = Math.max(3, radius * .08);
    ctxt.font = `bold ${Math.round(radius * 1.15)}px Arial`;
    ctxt.textAlign = "center";
    ctxt.textBaseline = "middle";
    ctxt.strokeText(String(tick), center.x, center.y + radius * .03);
    ctxt.fillText(String(tick), center.x, center.y + radius * .03);
    ctxt.restore();
}

function getAngleDifference(startAngle, targetAngle) {
    let pi = Math.PI;
    let a = targetAngle - startAngle;

    a += a>pi ? -2*pi : a<-pi ? 2*pi : 0;

    return Math.round(a*1000)/1000;
}

/**
 * Resizes the tile board based on the size of the browser window.
 *
 * Called whenever the browser window is resized.
 *
 * Changes tile_size, tile_stroke, canvas.width, and canvas.height
 */
function resize() {
    let viewport_width = .96 * window.innerWidth;
    let canvas_top = canvas.getBoundingClientRect().top || 0;
    let controls = document.querySelector(".game-controls");
    let controls_height = controls ? controls.offsetHeight : 0;
    let viewport_height = Math.max(
            tile_size_max * 3,
            window.innerHeight - canvas_top - controls_height - 14);

    draw_scale = Math.min(
            Math.min(1, viewport_width / (tile_size_max * board_width)),
            Math.min(1, viewport_height / (tile_size_max * board_height)));

    tile_size = tile_size_max * draw_scale;
    tile_stroke = tile_size / 25;

    canvas.width = board_width * tile_size;
    canvas.height = board_height * tile_size;
    clearScaledRenderCaches();
    markStaticLayerDirty();
    hideTileContextMenu();

    if (paused || dead || victorious) draw();
}

function clickedOnNpc(x, y) {
    let npc = null;
    if (verzik.circleCollision({x:x,y:y})) {
        npc = verzik;
    }
    return npc;
}

function getCanvasPointFromEvent(event) {
    let rect = canvas.getBoundingClientRect();
    let pixel_x = event.clientX - rect.left;
    let pixel_y = event.clientY - rect.top;
    return {x: pixel_x, y: pixel_y};
}

function getClickTarget(event) {
    let coord = getCanvasPointFromEvent(event);
    let tile_x = Math.floor(coord.x / tile_size);
    let tile_y = Math.floor(coord.y / tile_size);
    let npc = clickedOnNpc(coord.x, coord.y);
    return npc ? npc : {x: tile_x, y: tile_y};
}

canvas.addEventListener('mousedown', function (event) {
    if (event.button !== 0) return;
    if (numAssetsToLoad > 0) return;
    let audio_context = getMetronomeAudioContext();
    if (audio_context && audio_context.state === "suspended") audio_context.resume();
    if (!first_click) {
        first_click = true;
        syncMetronomeScheduler();
    }

    let click_target = getClickTarget(event);
    click_x.click(click_target, event);
        
    if (!p1.stun_timer) {
        p1.setTargetTile(click_target);

        setTimeout(() => {
            recent_click = click_target;
        }, ping);
    }
});

canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    if (numAssetsToLoad > 0) return;

    let coord = getCanvasPointFromEvent(event);
    let tile_x = Math.floor(coord.x / tile_size);
    let tile_y = Math.floor(coord.y / tile_size);
    if (tile_x < 0 || tile_x >= board_width || tile_y < 0 || tile_y >= board_height) return;

    showTileContextMenu(tile_x, tile_y, event.clientX, event.clientY);
});

document.addEventListener('mousedown', function (event) {
    let menu = $("tile-context-menu");
    if (menu && !menu.contains(event.target)) hideTileContextMenu();
    let color_menu = $("color-preset-menu");
    if (color_menu && !color_menu.contains(event.target) && event.target.type !== "color") {
        hideColorPresetMenu();
    }
});

document.addEventListener('keydown', function (event) {
    if (event.key === "Escape") {
        hideTileContextMenu();
        hideColorPresetMenu();
        closeMarkerJsonPanel();
    }
});

function showTileContextMenu(tile_x, tile_y, client_x, client_y) {
    context_menu_tile = {x: tile_x, y: tile_y};
    let marker = custom_tile_markers[getCustomTileMarkerKey(tile_x, tile_y)];
    let menu = $("tile-context-menu");
    $("add-tile-marker").style.display = marker ? "none" : "block";
    $("label-tile-marker").style.display = marker ? "block" : "none";
    $("custom-marker-color-action").style.display = marker ? "block" : "none";
    $("remove-tile-marker").style.display = marker ? "block" : "none";
    $("label-tile-marker").textContent = marker && marker.label ? "Edit text label" : "Add text label";

    menu.classList.add("visible");
    let left = Math.min(client_x, window.innerWidth - menu.offsetWidth - 8);
    let top = Math.min(client_y, window.innerHeight - menu.offsetHeight - 8);
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
}

function hideTileContextMenu() {
    let menu = $("tile-context-menu");
    if (menu) menu.classList.remove("visible");
}

function getSelectedCustomTileMarker() {
    if (!context_menu_tile) return null;
    return custom_tile_markers[getCustomTileMarkerKey(context_menu_tile.x, context_menu_tile.y)] || null;
}

function refreshAfterMarkerChange() {
    markGroundMarkersAsCustom();
    saveCustomTileMarkers();
    hideTileContextMenu();
    draw();
    canvas.focus();
}

$("add-tile-marker").addEventListener("click", function () {
    if (!context_menu_tile) return;
    custom_tile_markers[getCustomTileMarkerKey(context_menu_tile.x, context_menu_tile.y)] = {
        color: values["color-marker-draw"] || default_custom_tile_marker_color,
        label: ""
    };
    refreshAfterMarkerChange();
});

$("label-tile-marker").addEventListener("click", function () {
    let marker = getSelectedCustomTileMarker();
    if (!marker) return;
    let label = window.prompt("Tile label:", marker.label || "");
    if (label === null) return;
    marker.label = label.trim().slice(0, 40);
    refreshAfterMarkerChange();
});

$("custom-marker-color-action").addEventListener("click", function () {
    let marker = getSelectedCustomTileMarker();
    if (!marker) return;
    let picker = $("tile-marker-color-picker");
    picker.value = marker.color || default_custom_tile_marker_color;
    let menu = $("tile-context-menu");
    let rect = menu.getBoundingClientRect();
    hideTileContextMenu();
    showColorPresetMenu(picker, rect.left, rect.top);
});

$("tile-marker-color-picker").addEventListener("input", function () {
    let marker = getSelectedCustomTileMarker();
    if (!marker) return;
    marker.color = this.value;
    markGroundMarkersAsCustom();
    saveCustomTileMarkers();
    draw();
});

$("tile-marker-color-picker").addEventListener("change", function () {
    canvas.focus();
});

$("remove-tile-marker").addEventListener("click", function () {
    if (!context_menu_tile) return;
    delete custom_tile_markers[getCustomTileMarkerKey(context_menu_tile.x, context_menu_tile.y)];
    refreshAfterMarkerChange();
});

$("import-ground-markers").addEventListener("click", () => openMarkerJsonPanel("import"));
$("export-ground-markers").addEventListener("click", () => openMarkerJsonPanel("export"));
$("close-marker-json").addEventListener("click", closeMarkerJsonPanel);
$("apply-marker-json").addEventListener("click", function () {
    importGroundMarkerJson($("marker-json-text").value);
});
$("choose-marker-json-file").addEventListener("click", function () {
    $("ground-marker-file-input").click();
});
$("ground-marker-file-input").addEventListener("change", function () {
    let file = this.files && this.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function () {
        $("marker-json-text").value = String(reader.result || "");
        setMarkerJsonStatus(`Loaded ${file.name}. Click Load JSON to apply it.`);
    };
    reader.onerror = function () {
        setMarkerJsonStatus("Could not read that file.", true);
    };
    reader.readAsText(file);
    this.value = "";
});
$("copy-marker-json").addEventListener("click", async function () {
    let text = $("marker-json-text").value;
    try {
        await navigator.clipboard.writeText(text);
        setMarkerJsonStatus("JSON copied to the clipboard.");
    } catch (error) {
        $("marker-json-text").select();
        setMarkerJsonStatus("Clipboard access was blocked. Press Ctrl+C to copy the selected JSON.", true);
    }
});
$("download-marker-json").addEventListener("click", function () {
    let blob = new Blob([$("marker-json-text").value], {type: "application/json"});
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.href = url;
    link.download = "verzik-ground-markers.json";
    link.click();
    URL.revokeObjectURL(url);
    setMarkerJsonStatus("JSON file downloaded.");
});
$("marker-json-panel").addEventListener("mousedown", function (event) {
    if (event.target === this) closeMarkerJsonPanel();
});

function openResetSettingsPanel() {
    $("reset-settings-panel").classList.add("visible");
    $("cancel-reset-settings").focus();
}

function closeResetSettingsPanel() {
    $("reset-settings-panel").classList.remove("visible");
    $("reset-default-settings").focus();
}

function restoreDefaultSettings() {
    let trainer_storage_keys = [
        general_preferences_storage_key,
        metronome_storage_key,
        visual_metronome_storage_key,
        visual_danger_tick_storage_key,
        unlimited_hp_storage_key,
        unlimited_player_hp_storage_key,
        unlimited_verzik_hp_storage_key,
        hmt_acid_pools_storage_key,
        true_tile_enabled_storage_key,
        true_tile_color_storage_key,
        custom_tile_marker_storage_key,
        custom_tile_marker_initialized_key,
        ground_marker_preset_storage_key,
        last_used_color_storage_key
    ];
    for (let key of trainer_storage_keys) localStorage.removeItem(key);
    window.location.reload();
}

$("reset-default-settings").addEventListener("click", openResetSettingsPanel);
$("cancel-reset-settings").addEventListener("click", closeResetSettingsPanel);
$("confirm-reset-settings").addEventListener("click", restoreDefaultSettings);
$("reset-settings-panel").addEventListener("mousedown", function (event) {
    if (event.target === this) closeResetSettingsPanel();
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && $("reset-settings-panel").classList.contains("visible")) {
        closeResetSettingsPanel();
    }
});

canvas.addEventListener('keydown', function (event) {
    if (numAssetsToLoad > 0) return;
    event.stopPropagation();
});

canvas.addEventListener('keypress', function (event) {
    if (numAssetsToLoad > 0) return;
    event.stopPropagation();
});

function generate_path(from, to) {
    let current = new Point(from.x, from.y);
    let path_tiles = [];
    while (current.dist(to) > 1) { //while dist from 'current' to 'to' is > 1
        let vector = new Point(to.x - current.x, to.y - current.y);
        if (Math.abs(vector.x) === Math.abs(vector.y)) { //diagonal
            current.x += (current.x < to.x ? 1 : -1);
            current.y += (current.y < to.y ? 1 : -1);
        } else if (Math.abs(vector.x) > Math.abs(vector.y)) { //left-right
            current.x += (current.x < to.x ? 1 : -1);
        } else { //up-down
            current.y += (current.y < to.y ? 1 : -1);
        }
        path_tiles.push(new Point(current.x, current.y));
    }
    path_tiles.push(to);
    return path_tiles;
}

function tickPlayers() {
    p1.tick();
}

function tickNPCs() {
    verzik.tick();
}

function startGameLoop() {
    stopGameLoop();
    last_frame_timestamp = performance.now();
    last_cycle_timestamp = last_frame_timestamp;
    cycle_accumulator = 0;
    tick_timer = requestAnimationFrame(gameLoopFrame);
}

function stopGameLoop() {
    if (tick_timer !== null && tick_timer !== undefined) {
        cancelAnimationFrame(tick_timer);
        tick_timer = null;
    }
}

function gameLoopFrame(timestamp) {
    tick_timer = requestAnimationFrame(gameLoopFrame);

    if (numAssetsToLoad > 0 || paused) {
        last_frame_timestamp = timestamp;
        return;
    }

    let delta = timestamp - (last_frame_timestamp || timestamp);
    last_frame_timestamp = timestamp;
    cycle_accumulator += Math.min(delta, cycle_length * max_cycles_per_frame);

    let did_update = false;
    while (cycle_accumulator >= cycle_length) {
        cycle_accumulator -= cycle_length;
        runGameCycle(timestamp - cycle_accumulator);
        did_update = true;
    }

    if (did_update) draw();
}

function runGameCycle(cycle_timestamp) {
    last_cycle_timestamp = cycle_timestamp;
    cycles = (cycles + 1) % cycles_per_tick;
    //game tick every .6 sec, but only after some initial interaction
    if(!cycles && first_click) {
        syncMetronomeScheduler();
        gameTick();
    }
    animatePlayers();
    animateNPCs();
}

function gameTick() {
    ticks += 1;
    tickPoisonPools();
    tickNylocasSpecial();
    tickPlayers();
    damagePlayerInPoisonPool();
    tickNPCs();
}

function getAttackEfficiency() {
    return Math.min(100, Math.floor(1000*attack_ticks/(ticks-stalled_ticks))/10);
}

function animateNPCs() {
    verzik.animate();
}

function animatePlayers() {
    p1.animate();
}

function draw() {
    drawStaticLayer();
    drawPoisonPools();
    drawFloorMarkers();
    drawTrueTile();
    drawTargetTile();
    drawPlayers();
    drawNPCs();
    drawMagicProjectile();
    drawVisualMetronome();
    drawClickX();
    drawNylocasSpecial();
    if (dead || victorious) {
        drawEndStats();
    }
//    drawTestTiles();
}

function drawTestTiles() {
    let s = tile_size;
    let st = tile_stroke;
    ctxt.fillStyle = "#00ff0050";
    strokeRect(p1.prev_pos.x*s,p1.prev_pos.y*s,s,s,st);
    ctxt.fillStyle = "#80ff0050";
    strokeRect(p1.anim_pos.x*s,p1.anim_pos.y*s,s,s,st);
    ctxt.fillStyle = "#ffff0050";
    strokeRect(p1.position.x*s,p1.position.y*s,s,s,st);
    ctxt.fillStyle = "#ff800050";
//    strokeRect(.x*s,.y*s,s,s,st);
    ctxt.fillStyle = "#ff000050";
    if (p1.focus_point) strokeRect((p1.focus_point.x-.5)*s,(p1.focus_point.y-.5)*s,s,s,st);
}

/**
 * Draw a rectangle with specified stroke.
 *
 * @param {type} x pos
 * @param {type} y pos
 * @param {type} w witdh
 * @param {type} h height
 * @param {type} s stroke thickness
 */
function strokeRect(x, y, w, h, s) {
    ctxt.fillRect(x, y, w, s);
    ctxt.fillRect(x, y, s, h);
    ctxt.fillRect(x, y + h - s, w, s);
    ctxt.fillRect(x + w - s, y, s, h);
}

function clearScaledRenderCaches() {
    scaled_image_cache = new WeakMap();
    scaled_sprite_cache = {};
}

function makeScaledCanvas(img, width, height) {
    if (!img || !img.width || !img.height || width <= 0 || height <= 0) return img;

    let canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    let context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "low";
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
}

function getScaledImage(img) {
    if (!img || !img.width || !img.height || draw_scale === 1) return img;

    let width = Math.max(1, Math.round(img.width * draw_scale));
    let height = Math.max(1, Math.round(img.height * draw_scale));
    let cached = scaled_image_cache.get(img);
    if (cached && cached.width === width && cached.height === height) return cached;

    let scaled = makeScaledCanvas(img, width, height);
    scaled_image_cache.set(img, scaled);
    return scaled;
}

function getScaledSprite(name, img, width, height) {
    let rounded_width = Math.max(1, Math.round(width));
    let rounded_height = Math.max(1, Math.round(height));
    let cached = scaled_sprite_cache[name];
    if (cached && cached.width === rounded_width && cached.height === rounded_height) return cached;

    let scaled = makeScaledCanvas(img, rounded_width, rounded_height);
    scaled_sprite_cache[name] = scaled;
    return scaled;
}

function roundedRectPath(context, x, y, w, h, r) {
    let radius = Math.min(r, w / 2, h / 2);
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
}

function drawTileBoard() {
    drawStaticLayer();
}

function markStaticLayerDirty() {
    static_layer_dirty = true;
}

function drawStaticLayer() {
    updateStaticLayer();
    ctxt.drawImage(static_layer_canvas, 0, 0);
}

function updateStaticLayer() {
    if (static_layer_canvas.width !== canvas.width || static_layer_canvas.height !== canvas.height) {
        static_layer_canvas.width = canvas.width;
        static_layer_canvas.height = canvas.height;
        static_layer_dirty = true;
    }
    if (!static_layer_dirty || numAssetsToLoad > 0) return;

    let visible_context = ctxt;
    ctxt = static_layer_context;
    ctxt.clearRect(0, 0, static_layer_canvas.width, static_layer_canvas.height);
    drawFloorBase();
    ctxt = visible_context;
    static_layer_dirty = false;
}

function drawFloorBase() {
    ctxt.drawImage(imgs.tile_board, 0, 0,
                   imgs.tile_board.width * draw_scale, imgs.tile_board.height * draw_scale);
}

function drawFloorMarkers() {
    drawTileMarkers();
    drawCustomTileMarkers();
    drawVerzikTiles();
    drawMeleeTiles();
}

function drawCustomTileMarkers() {
    let marker_stroke = Math.max(2, Math.round(3 * draw_scale));
    for (let key in custom_tile_markers) {
        let coords = key.split(",").map(Number);
        let marker = custom_tile_markers[key];
        if (coords.length !== 2 || coords.some(Number.isNaN) || !marker) continue;

        let x = coords[0] * tile_size;
        let y = coords[1] * tile_size;
        ctxt.fillStyle = marker.color || default_custom_tile_marker_color;
        strokeRect(x, y, tile_size, tile_size, marker_stroke);

        if (marker.label) {
            let font_size = Math.max(10, Math.round(tile_size * .2));
            ctxt.save();
            ctxt.font = `bold ${font_size}px Arial`;
            ctxt.textAlign = "center";
            ctxt.textBaseline = "middle";
            ctxt.lineWidth = Math.max(2, Math.round(font_size / 6));
            ctxt.strokeStyle = "#000000";
            ctxt.fillStyle = marker.color || default_custom_tile_marker_color;
            ctxt.strokeText(marker.label, x + tile_size / 2, y + tile_size / 2, tile_size * .9);
            ctxt.fillText(marker.label, x + tile_size / 2, y + tile_size / 2, tile_size * .9);
            ctxt.restore();
        }
    }
}

function drawTrueTile() {
    if (!true_tile_enabled || !p1) return;

    let x = p1.position.x * tile_size;
    let y = p1.position.y * tile_size;
    let marker_stroke = Math.max(2, Math.round(3 * draw_scale));
    ctxt.fillStyle = true_tile_color + "55";
    ctxt.fillRect(x, y, tile_size, tile_size);
    ctxt.fillStyle = true_tile_color;
    strokeRect(x, y, tile_size, tile_size, marker_stroke);
}

/**
 * Draws the tile markers around where Verzik sits based on the tile_marker_type
 * selected in the options.
 */
function drawTileMarkers() {
    if (values["tile-marker-type"] === "none") return;
    s = tile_size;
    st = tile_stroke;
    ctxt.fillStyle = values["color-tile-marker"];
    for (let p of tile_marker_arr[values["tile-marker-type"]]) {
        strokeRect(p[0] * s, p[1] * s, s, s, st);
    }
    ctxt.fillStyle = values["color-tile-marker"] + "20";
    for (let p of tile_marker_arr[values["tile-marker-type"]]) {
        ctxt.fillRect(p[0] * s, p[1] * s, s, s);
    }
}

/**
 * NPC Indicator for Verzik
 */
function drawVerzikTiles() {
    if (!booleans["show-verzik-tiles"] || !verzik) return;
    s = tile_size;
    st = tile_stroke;
    //draw box stroke
    ctxt.fillStyle = values["color-verzik-marker"];
    strokeRect(verzik.pos.x * s, verzik.pos.y * s, verzik.size * s, verzik.size * s, st);
    //draw box highlight
    ctxt.fillStyle = values["color-verzik-marker"] + "20";
    ctxt.fillRect(verzik.pos.x * s, verzik.pos.y * s, verzik.size * s, verzik.size * s);
}

/**
 * Draws a highlight around the melee range of Verzik
 */
function drawMeleeTiles() {
    if (!booleans["show-melee-tiles"] || !verzik) return;
    s = tile_size;
    st = tile_stroke;
    //draw box stroke
    ctxt.fillStyle = values["color-melee-marker"];
    strokeRect((verzik.pos.x-1) * s,  (verzik.pos.y-1) * s,  (verzik.size+2) * s,      (verzik.size+2) * s,      st);
    strokeRect(verzik.pos.x * s - st, verzik.pos.y * s - st, verzik.size * s + 2 * st, verzik.size * s + 2 * st, st);
    //draw box highlight
    ctxt.fillStyle = values["color-melee-marker"] + "20";
    ctxt.fillRect((verzik.pos.x-1) * s,           (verzik.pos.y-1) * s,           (verzik.size+2) * s, s                    );
    ctxt.fillRect((verzik.pos.x-1) * s,           verzik.pos.y * s,               s,                   (verzik.size+1) * s  );
    ctxt.fillRect(verzik.pos.x * s,               (verzik.pos.y+verzik.size) * s, (verzik.size+1) * s, s                    );
    ctxt.fillRect((verzik.pos.x+verzik.size) * s, verzik.pos.y * s,               s,                   verzik.size * s      );
}

/**
 * Draws the client side target_tile
 */
function drawTargetTile() {
    if (!booleans["show-tile-indicators"]) return;
    if (p1.target_tile) {
        //draw tile outline 100% opacity
        ctxt.fillStyle = values["color-tile-indicator"];
        strokeRect(p1.target_tile.x * tile_size, p1.target_tile.y * tile_size,
                tile_size, tile_size, tile_stroke);
        //draw tile fill 0x20/0xff opacity
        ctxt.fillStyle = values["color-tile-indicator"] + "20";
        ctxt.fillRect(p1.target_tile.x * tile_size, p1.target_tile.y * tile_size,
                tile_size, tile_size);
        //draw path tiles
        if(booleans["show-path-tiles"]) {
            ctxt.fillStyle = values["color-path-tile"] + "14";
            for (let i = 0; i < p1.path_tiles.length; i++) {
                if (!(i % 2 || i === p1.path_tiles.length - 1)) continue; //skip draw unless i is odd or equal to array length
                let p = p1.path_tiles[i];
                ctxt.fillRect(p.x * tile_size, p.y * tile_size, tile_size, tile_size);
            }
        }
    }
}

function drawPlayers() {
    p1.draw(ctxt);
}

function drawNPCs() {
    verzik.draw(ctxt);
}

function drawMagicProjectile() {
    if (verzik.range_bomb instanceof MagicProjectile) {
        verzik.range_bomb.draw(ctxt);
    }
}

function drawClickX() {
    click_x.draw(ctxt);
}

function death() {
    dead = true;
    stopGameLoop();
    stopMetronomeScheduler();
    setTimeout(() => {
        drawTileBoard();
        drawPlayers();
        drawNPCs();
        drawEndStats();
    }, tick_length);
}

function victory() {
    victorious = true;
    stopGameLoop();
    stopMetronomeScheduler();
    setTimeout(() => {
        drawTileBoard();
        drawPlayers();
        drawNPCs();
        drawEndStats();
    }, tick_length);
}

function drawEndStats() {
    let w = canvas.width;
    let h = canvas.height;
    let card_width = Math.min(w * .58, tile_size * 5.2);
    let card_height = Math.max(tile_size * 1.45, 136 * draw_scale);
    let card_x = (w - card_width) / 2;
    let card_y = (h - card_height) / 2;
    let radius = Math.max(10, 18 * draw_scale);
    let label_font_size = Math.max(13, Math.round(17 * draw_scale));
    let value_font_size = Math.max(15, Math.round(21 * draw_scale));
    let rows = [
        ["Damage taken", String(damage_taken)],
        ["Attack efficiency", `${getAttackEfficiency()}%`]
    ];

    ctxt.save();
    ctxt.fillStyle = "#000000c7";
    ctxt.fillRect(0, 0, w, h);

    ctxt.beginPath();
    roundedRectPath(ctxt, card_x, card_y, card_width, card_height, radius);
    ctxt.fillStyle = "#171615f2";
    ctxt.fill();
    ctxt.lineWidth = Math.max(1, 2 * draw_scale);
    ctxt.strokeStyle = "#58524b";
    ctxt.stroke();

    ctxt.fillStyle = "#a73b32";
    ctxt.fillRect(card_x, card_y, card_width, Math.max(4, 6 * draw_scale));

    let left = card_x + card_width * .12;
    let right = card_x + card_width * .88;
    let row_gap = card_height / 3;
    let first_y = card_y + row_gap * 1.25;

    ctxt.textBaseline = "middle";
    for (let i = 0; i < rows.length; i++) {
        let y = first_y + i * row_gap;
        ctxt.font = `700 ${label_font_size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctxt.textAlign = "left";
        ctxt.fillStyle = "#aaa39b";
        ctxt.fillText(rows[i][0], left, y);

        ctxt.font = `800 ${value_font_size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctxt.textAlign = "right";
        ctxt.fillStyle = "#f2efea";
        ctxt.fillText(rows[i][1], right, y);
    }
    ctxt.restore();
}

function drawImgCentered(context, img, scale = true) {
    if (!img) return;

    if (scale) {
        let scaled_img = getScaledImage(img);
        context.drawImage(scaled_img, -scaled_img.width / 2, -scaled_img.height / 2);
        return;
    }

    context.drawImage(img, -img.width / 2, -img.height / 2);
}

function updateBoolean(id) {
    booleans[id] = $(id).checked;
    saveGeneralPreferences();
    if (["show-verzik-tiles", "show-melee-tiles"].includes(id)) markStaticLayerDirty();
    if (paused) draw();
}

function updateValue(id) {
    values[id] = $(id).value;
    saveGeneralPreferences();
    if ([
        "tile-marker-type",
        "color-tile-marker",
        "color-verzik-marker",
        "color-melee-marker"
    ].includes(id)) markStaticLayerDirty();
    if (paused) draw();
}

function updateWeaponSelect(id) {
    values[id] = $(id).value;
    saveGeneralPreferences();
    if (p1) p1.weapon = weapons[values[id]];
    if (paused) draw();
}

function updateSpawnLocation() {
    values["spawn-location"] = $("spawn-location").value;
    saveGeneralPreferences();
    reset();
}

function updatePing() {
    ping = $("ping-select").value;
    $("ping-display").innerHTML = ping + " ms";
    saveGeneralPreferences();
}

function updateVolume() {
    volume = $("volume-select").value;

    $("volume-display").innerHTML = volume + "%";
    saveGeneralPreferences();
    if (metronome_scheduler_timer) {
        stopMetronomeScheduler();
        startMetronomeScheduler(getSecondsUntilNextGameTick());
    }
}

function updateMetronome() {
    metronome_enabled = $("metronome-enabled").checked;
    localStorage.setItem(metronome_storage_key, metronome_enabled);
    if (metronome_enabled) {
        let audio_context = getMetronomeAudioContext();
        if (audio_context && audio_context.state === "suspended") audio_context.resume();
    }
    syncMetronomeScheduler();
}

function updateVisualMetronome() {
    visual_metronome_enabled = $("visual-metronome-enabled").checked;
    localStorage.setItem(visual_metronome_storage_key, visual_metronome_enabled);
    draw();
}

function updateVisualDangerTick() {
    visual_danger_tick = Number($("visual-danger-tick").value);
    localStorage.setItem(visual_danger_tick_storage_key, visual_danger_tick);
    draw();
}

function updateUnlimitedHp() {
    unlimited_player_hp_enabled = $("unlimited-player-hp-enabled").checked;
    unlimited_verzik_hp_enabled = $("unlimited-verzik-hp-enabled").checked;
    localStorage.setItem(unlimited_player_hp_storage_key, unlimited_player_hp_enabled);
    localStorage.setItem(unlimited_verzik_hp_storage_key, unlimited_verzik_hp_enabled);
    if (unlimited_player_hp_enabled && p1) p1.hp = p1.max_hp;
    if (unlimited_verzik_hp_enabled && verzik) verzik.hp = verzik.max_hp;
    if (paused) draw();
}

function updateHmtAcidPools() {
    hmt_acid_pools_enabled = $("hmt-acid-pools-enabled").checked;
    localStorage.setItem(hmt_acid_pools_storage_key, hmt_acid_pools_enabled);
    if (!hmt_acid_pools_enabled) {
        poison_pools = [];
        draw();
    }
}

function updateTrueTile() {
    true_tile_enabled = $("show-true-tile").checked;
    true_tile_color = $("color-true-tile").value;
    localStorage.setItem(true_tile_enabled_storage_key, true_tile_enabled);
    localStorage.setItem(true_tile_color_storage_key, true_tile_color);
    draw();
}

function initFormData() {
    $("weapon-select").value = values["weapon-select"];
    $("spawn-location").value = values["spawn-location"];
    $("tile-marker-type").value = values["tile-marker-type"];
    $("ground-marker-preset").value = ground_marker_preset;
    $("show-verzik-tiles").checked = booleans["show-verzik-tiles"];
    $("show-melee-tiles").checked = booleans["show-melee-tiles"];
    $("show-tile-indicators").checked = booleans["show-tile-indicators"];
    $("show-path-tiles").checked = booleans["show-path-tiles"];
    $("show-xp-drops").checked = booleans["show-xp-drops"];
    $("weapon-cooldown-metronome").checked = booleans["weapon-cooldown-metronome"];
    $("metronome-enabled").checked = metronome_enabled;
    $("visual-metronome-enabled").checked = visual_metronome_enabled;
    $("visual-danger-tick").value = String(visual_danger_tick);
    $("unlimited-player-hp-enabled").checked = unlimited_player_hp_enabled;
    $("unlimited-verzik-hp-enabled").checked = unlimited_verzik_hp_enabled;
    $("hmt-acid-pools-enabled").checked = hmt_acid_pools_enabled;
    $("show-true-tile").checked = true_tile_enabled;
    $("color-true-tile").value = true_tile_color;
    $("color-tile-indicator").value = values["color-tile-indicator"];
    $("color-path-tile").value = values["color-path-tile"];
    $("color-verzik-marker").value = values["color-verzik-marker"];
    $("color-melee-marker").value = values["color-melee-marker"];
    $("color-tile-marker").value = values["color-tile-marker"];
    $("color-marker-draw").value = values["color-marker-draw"];
    $("ping-select").value = String(ping);
    $("ping-display").innerHTML = ping + " ms";
    $("volume-select").value = String(volume);
    $("volume-display").innerHTML = volume + "%";
}

function reset() {
    stopMetronomeScheduler();
    first_click = false;
    first_attack = false;
    
    attacks_used = 0;
    
    damage_taken = 0;
    damage_dealt = 0;

    attack_ticks = 4;
    stalled_ticks = 0;

    dead = false;
    victorious = false;

    let spawn_location = spawn_locations[values["spawn-location"]] || spawn_locations.nw;
    p1 = new Player(spawn_location);
    p1.anim_angle = spawn_location.angle;
    verzik = new NPC({x:6, y:4}, 3);
    verzik.target(p1);
    verzik.attack_cycle = initial_verzik_attack_cycle;
    poison_pools = [];
    nylocas_special_ticks_remaining = 0;
    nylocas_special_death_start_tick = null;
    nylocas_special_death_sound_played = false;

    recent_click = null;
    
    cycles = 0;
    ticks = 0;
    last_cycle_timestamp = performance.now();
    last_frame_timestamp = last_cycle_timestamp;
    cycle_accumulator = 0;
    paused = false;
    
    startGameLoop();
}

function init() {
    click_x = new ClickX();
    initializeColorPresetMenu();
    
    initFormData();

    numAssetsToLoad = getNumOfAssets(img_) + getNumOfAssets(sounds_);
    preloadImages(img_, imgs, img_path, img_ext);
    preloadAudio(sounds_, sounds, sounds_path, sounds_ext);
    
    reset();
}

function getNumOfAssets(obj_src) {
    let num = 0;
    for (let i in obj_src) {
        if (typeof obj_src[i] === "string") { //static image
            num++;
        } else if (Array.isArray(obj_src[i])) { //animation frames
            num += obj_src[i].length;
        } else { //object with more categories of image
            num += getNumOfAssets(obj_src[i]);
        }
    }
    return num;
}

function preloadImages(obj_src, obj_img, prefix, ext) {
    for (let i in obj_src) {
        let src = null;
        if (typeof obj_src[i] === "string") { //static image
            src = `${prefix}${i}${ext}`;
            obj_img[i] = new Image();
            obj_img[i].onload = ()=>{numAssetsToLoad -= 1;};
            obj_img[i].src = src;
        } else if (Array.isArray(obj_src[i])) { //animation frames
            obj_img[i] = [];
            for (let frame of obj_src[i]) {
                src = `${prefix}${i}_${frame}${ext}`;
                obj_img[i][frame] = new Image();
                obj_img[i][frame].onload = ()=>{numAssetsToLoad -= 1;};
                obj_img[i][frame].src = src;
            }
        } else { //object with more categories of image
            obj_img[i] = {};
            preloadImages(obj_src[i], obj_img[i], `${prefix}${i}_`, ext);
        }
    }
}

function preloadAudio(obj_src, obj_sound, prefix, ext) {
    for (let i in obj_src) {
        if (typeof obj_src[i] === "string") {
            let src = obj_src[i] ? `${prefix}${obj_src[i]}` : `${prefix}${i}${ext}`;
            let audio_context = getMetronomeAudioContext();
            if (!audio_context || !window.fetch) {
                numAssetsToLoad -= 1;
                continue;
            }

            fetch(src)
                .then(response => response.arrayBuffer())
                .then(data => audio_context.decodeAudioData(data))
                .then(buffer => {
                    obj_sound[i] = buffer;
                    audio_buffers[i] = buffer;
                })
                .catch(error => {
                    console.warn(`Could not preload sound ${src}.`, error);
                })
                .finally(() => {
                    numAssetsToLoad -= 1;
                });
        }
    }
}

function bootTrainer() {
    init();
    resize();
    window.addEventListener("load", resize, {once: true});
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootTrainer, {once: true});
} else {
    bootTrainer();
}
