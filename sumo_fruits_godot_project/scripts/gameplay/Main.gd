extends Node2D

const FRUIT_SCENE := preload("res://scenes/SumoFruit.tscn")
const HAZARD_SCENE := preload("res://scenes/ArenaHazard.tscn")
const SALT_ZONE_SCRIPT := preload("res://scripts/gameplay/SaltZone.gd")
const FRUIT_DATA := [
	preload("res://data/fruits/tier_01.tres"), preload("res://data/fruits/tier_02.tres"),
	preload("res://data/fruits/tier_03.tres"), preload("res://data/fruits/tier_04.tres"),
	preload("res://data/fruits/tier_05.tres"), preload("res://data/fruits/tier_06.tres"),
	preload("res://data/fruits/tier_07.tres"), preload("res://data/fruits/tier_08.tres"),
	preload("res://data/fruits/tier_09.tres"), preload("res://data/fruits/tier_10.tres"),
	preload("res://data/fruits/tier_11.tres")
]

const RIVAL_PROFILES := {
	"TENGU_ORANGE": {"name":"Tengu Orange", "title":"Wind God of the Dohyo", "crest":"T", "color":"#E67E22", "radius":36.0, "mass":8.5, "move":"OSHIDASHI_PUSH", "interval":2, "score":600},
	"CHERRY_SLAPPER": {"name":"Cherry Slapper", "title":"Twin-Stem Tsuppari Virtuoso", "crest":"C", "color":"#C0392B", "radius":32.0, "mass":6.0, "move":"TSUPPARI_SLAP", "interval":2, "score":700},
	"COCONUT_TANK": {"name":"Coconut Tank", "title":"Unyielding Shell Rikishi", "crest":"K", "color":"#795548", "radius":46.0, "mass":14.0, "move":"OSHIDASHI_PUSH", "interval":2, "score":900},
	"DRAGONFRUIT_YOKOZUNA": {"name":"Dragonfruit Yokozuna", "title":"Grand Champion of the Celestial Bowl", "crest":"D", "color":"#8E44AD", "radius":52.0, "mass":16.0, "move":"OSHIDASHI_PUSH", "interval":2, "score":1200}
}
const CAREER_STAGES := [
	{"name":"Maegashira Bout", "rank":"Rank 1: Maegashira", "rival":"TENGU_ORANGE", "arena":"CIRCULAR", "wasabi":false, "chili":false, "fragile":false},
	{"name":"Komusubi Bout", "rank":"Rank 2: Komusubi", "rival":"CHERRY_SLAPPER", "arena":"ELLIPTICAL", "wasabi":false, "chili":false, "fragile":false},
	{"name":"Sekiwake Bout", "rank":"Rank 3: Sekiwake", "rival":"COCONUT_TANK", "arena":"CIRCULAR", "wasabi":true, "chili":false, "fragile":false},
	{"name":"Yokozuna Championship", "rank":"Rank 4: Yokozuna", "rival":"DRAGONFRUIT_YOKOZUNA", "arena":"CIRCULAR", "wasabi":false, "chili":true, "fragile":true}
]
const CHALLENGES := ["WOBBLE_SEA", "BROKEN_TAWARA", "ONE_BEAUTIFUL_SHOT"]

@onready var bowl: BowlArena = $BowlArena
@onready var merge_manager: MergeClashManager = $MergeClashManager
@onready var launcher: SlingshotLauncher = $SlingshotLauncher
@onready var effects: EffectsLayer = $EffectsLayer
@onready var camera: Camera2D = $Camera2D

var hazards: Array[ArenaHazard] = []
var salt_zones: Array[SaltZone] = []
var score: int = 0
var lives: int = 3
var best_tier: int = 1
var total_shots: int = 0
var game_over: bool = false
var game_over_reason: String = ""
var game_paused: bool = false
var game_mode: String = "CLASSIC"
var challenge_index: int = 0
var career_stage: int = 0
var career_unlocked: int = 0

var upcoming_tiers: Array[int] = [1, 2]
var combo_count: int = 0
var combo_multiplier: float = 1.0
var combo_timer: float = 0.0
var crowd_hype: float = 0.0
var shot_hype: float = 0.0
var festival_ready_shots: int = 0
var festival_active_this_shot: bool = false
var salt_charges: int = 1
var salt_launch_count: int = 0
var hazard_spawn_timer: float = 3.5
var rival_spawn_timer: float = 16.0
var overflow_timer: float = 0.0
var is_overflowing: bool = false
var bank_shot_detected: bool = false
var shot_initial_merge_done: bool = false

var tuning := {"slope":0.55, "escape":220.0, "clash":0.5, "shockwave":380.0, "bale_health":3, "restitution":0.78, "rim_damping":0.65}
var active_call: Dictionary = {}
var call_queue: Array[Dictionary] = []
var ribbons: Array[Dictionary] = []

var score_label: Label
var lives_label: Label
var next_label: Label
var mode_label: Label
var combo_label: Label
var rival_label: Label
var overflow_label: Label
var salt_button: Button
var hype_bar: ProgressBar
var occupancy_bar: ProgressBar
var callout_panel: ColorRect
var callout_jp: Label
var callout_main: Label
var callout_sub: Label
var ribbon_box: VBoxContainer
var game_over_panel: ColorRect
var game_over_title_label: Label
var final_score_label: Label
var roster_panel: ColorRect
var tuner_panel: ColorRect
var tuner_sliders: Dictionary = {}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	randomize()
	merge_manager.fusion_committed.connect(_on_fusion_committed)
	merge_manager.clash_started.connect(_on_clash_started)
	merge_manager.clash_pulse.connect(_on_clash_pulse)
	launcher.fruit_launched.connect(_on_fruit_launched)
	launcher.configure(bowl)
	bowl.fruit_ringed_out.connect(_on_fruit_ringed_out)
	bowl.bale_damaged.connect(_on_bale_damaged)
	bowl.bale_broken.connect(_on_bale_broken)
	bowl.rim_saved.connect(_on_rim_saved)
	_create_interface()
	_start_mode("CLASSIC")
	queue_redraw()

func _process(delta: float) -> void:
	_update_callouts(delta)
	_update_ribbons(delta)
	_update_camera()
	if game_paused or game_over:
		_update_hud()
		return
	if combo_timer > 0.0:
		combo_timer -= delta
		if combo_timer <= 0.0:
			combo_count = 0
			combo_multiplier = 1.0
	_update_hazards(delta)
	_update_look_targets()
	_check_capacity(delta)
	_check_challenge_success()
	_update_hud()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("salt_burst"):
		throw_salt(bowl.get_bowl_center())
	elif event.is_action_pressed("pause"):
		_toggle_pause()
	elif event.is_action_pressed("restart"):
		_restart_game()

func _draw() -> void:
	draw_rect(Rect2(0, 0, 900, 1000), Color("181512"))
	for x in range(0, 901, 40):
		draw_line(Vector2(x, 0), Vector2(x, 1000), Color("221d18"), 1.0)
	for y in range(0, 1001, 40):
		draw_line(Vector2(0, y), Vector2(900, y), Color("221d18"), 1.0)
	draw_string(ThemeDB.fallback_font, Vector2(200, 55), "SUMO FRUITS", HORIZONTAL_ALIGNMENT_CENTER, 500, 39, Color("ffd27a"))
	draw_string(ThemeDB.fallback_font, Vector2(275, 82), "THE BUMPER BOWL", HORIZONTAL_ALIGNMENT_CENTER, 350, 17, Color("e8b15d"))

func _start_mode(mode: String) -> void:
	game_mode = mode
	_clear_match()
	if mode == "CAREER":
		var stage: Dictionary = CAREER_STAGES[career_stage]
		bowl.set_mode(stage.arena)
		if stage.fragile:
			bowl.bale_max_health = 2
			bowl.reset_bales()
		if stage.wasabi:
			_spawn_hazard("WASABI", bowl.global_position + Vector2(-105, 25))
		if stage.chili:
			_spawn_hazard("CHILI", bowl.global_position + Vector2(105, 25))
		_spawn_rival(RIVAL_PROFILES[stage.rival], true)
		trigger_referee("本場所", "BANZUKE BOUT", stage.name, Color("ffd700"), 4, 2.4, "HAKKEYOI")
	elif mode == "CHALLENGE":
		_setup_challenge(CHALLENGES[challenge_index])
	else:
		bowl.set_mode("CIRCULAR")
		trigger_referee("初日", "CLASSIC BOWL", "Traditional Dohyo Bout", Color("2ecc71"), 1, 2.0, "HAKKEYOI")
	upcoming_tiers = [_roll_launch_tier(), _roll_launch_tier()]
	_spawn_next_fruit()
	_update_hud()

func _clear_match() -> void:
	get_tree().paused = false
	game_paused = false
	for fruit in get_tree().get_nodes_in_group("fruits"):
		fruit.queue_free()
	for hazard in hazards:
		if is_instance_valid(hazard): hazard.queue_free()
	for zone in salt_zones:
		if is_instance_valid(zone): zone.queue_free()
	hazards.clear(); salt_zones.clear(); bowl.active_fruits.clear(); merge_manager.clear(); bowl.bale_max_health = int(tuning.bale_health); bowl.reset_bales()
	launcher.clear_fruit(); launcher.enabled = true
	score = 0; lives = 3; best_tier = 1; total_shots = 0; game_over = false; game_over_reason = ""
	combo_count = 0; combo_multiplier = 1.0; combo_timer = 0.0; crowd_hype = 0.0; shot_hype = 0.0
	festival_ready_shots = 0; festival_active_this_shot = false; salt_charges = 1; salt_launch_count = 0
	hazard_spawn_timer = 3.5; rival_spawn_timer = 16.0; overflow_timer = 0.0; is_overflowing = false
	active_call.clear(); call_queue.clear(); ribbons.clear(); _refresh_ribbons()
	game_over_panel.visible = false

func _setup_challenge(challenge: String) -> void:
	if challenge == "WOBBLE_SEA":
		bowl.set_mode("WOBBLE")
		_spawn_hazard("CHILI", bowl.global_position + Vector2(0, -80))
		trigger_referee("巡業", "WOBBLE SEA", "Reach Melon while the Dohyo tilts", Color("9b59b6"), 3, 2.6, "SHOBU")
	elif challenge == "BROKEN_TAWARA":
		bowl.set_mode("CIRCULAR"); bowl.break_bales([0, 4, 8, 12])
		_spawn_hazard("WASABI", bowl.global_position + Vector2(-90, 0))
		_spawn_hazard("CHILI", bowl.global_position + Vector2(90, 0))
		trigger_referee("巡業", "BROKEN TAWARA", "Survive 12 shots and score 3,000", Color("e74c3c"), 3, 2.6, "SHOBU")
	else:
		bowl.set_mode("CIRCULAR"); bowl.break_bales([2])
		trigger_referee("妙技", "ONE BEAUTIFUL SHOT", "Fuse two Peaches and eject the Beetle", Color("3498db"), 3, 2.6, "SHOBU")
		var left := _create_fruit(5, bowl.global_position + Vector2(-120, 0), false)
		var right := _create_fruit(5, bowl.global_position + Vector2(120, 0), false)
		left.linear_velocity = Vector2(30, 0); right.linear_velocity = Vector2(-30, 0)
		_spawn_hazard("BUG", bowl.global_position)

func _roll_launch_tier() -> int:
	var roll := randf()
	return 1 if roll < 0.55 else 2 if roll < 0.85 else 3

func _spawn_next_fruit() -> void:
	if game_over or is_instance_valid(launcher.loaded_fruit): return
	var tier := upcoming_tiers[0]
	upcoming_tiers = [upcoming_tiers[1], _roll_launch_tier()]
	launcher.load_fruit(_create_fruit(tier, launcher.global_position, true))

func _create_fruit(tier: int, spawn_position: Vector2, awaiting_entry: bool, team: String = "PLAYER") -> SumoFruit:
	var fruit := FRUIT_SCENE.instantiate() as SumoFruit
	fruit.data = (FRUIT_DATA[tier - 1] as FruitData).duplicate_for_runtime()
	fruit.data.restitution = float(tuning.restitution)
	fruit.position = spawn_position; fruit.entry_pending = awaiting_entry; fruit.team = team
	fruit.state = SumoFruit.State.AIMING if awaiting_entry else SumoFruit.State.IN_RING
	fruit.collision_mask = 5
	add_child(fruit); bowl.register_fruit(fruit)
	fruit.contact_occurred.connect(merge_manager.handle_contact)
	return fruit

func _on_fruit_launched(_fruit: SumoFruit) -> void:
	total_shots += 1; shot_hype = 0.0; bank_shot_detected = false; shot_initial_merge_done = false
	if salt_charges == 0:
		salt_launch_count += 1
		if salt_launch_count >= 6:
			salt_charges = 1; salt_launch_count = 0; add_ribbon("Salt Ready!", "Kiyome-no-Shio replenished", Color("4b69fd")); Sound.play_flourish()
	festival_active_this_shot = festival_ready_shots > 0
	if festival_ready_shots > 0:
		festival_ready_shots -= 1; add_ribbon("Festival Shot!", "2x merge score activated", Color("ffd700")); Sound.play_flourish()
	for hazard in hazards:
		if is_instance_valid(hazard) and hazard.kind == "RIVAL": hazard.on_player_launch()
	Sound.play_launch(_fruit.mass); Juice.add_trauma(0.08)
	trigger_referee("発気揚々", "HAKKEYOI!", "Tachiai charge!", Color("2ecc71"), 1, 1.8, "HAKKEYOI")
	get_tree().create_timer(0.55).timeout.connect(_spawn_next_fruit)

func _on_fusion_committed(a: SumoFruit, b: SumoFruit, tier: int, position: Vector2, velocity: Vector2, base_points: int) -> void:
	call_deferred("_finish_fusion", a, b, tier, position, velocity, base_points)

func _finish_fusion(a: SumoFruit, b: SumoFruit, tier: int, position: Vector2, velocity: Vector2, base_points: int) -> void:
	if not is_instance_valid(a) or not is_instance_valid(b): return
	bank_shot_detected = bank_shot_detected or a.banked_this_shot or b.banked_this_shot
	bowl.unregister_fruit(a); bowl.unregister_fruit(b); a.queue_free(); b.queue_free()
	var merged := _create_fruit(tier, position, false); merged.linear_velocity = velocity; merged.trigger_squash(190.0 + tier * 18.0, Vector2.UP)
	combo_count += 1
	var multipliers := [1.0, 1.0, 1.5, 2.0, 2.5, 3.0]
	combo_multiplier = multipliers[mini(combo_count, 5)]; combo_timer = 2.5
	var final_multiplier := minf(6.0, combo_multiplier * (2.0 if festival_active_this_shot else 1.0))
	score += int(round(base_points * final_multiplier)); best_tier = maxi(best_tier, tier); add_hype(12.0)
	if bank_shot_detected and not shot_initial_merge_done:
		add_ribbon("Bank Shot Fusion!", "Rebounded off Tawara into pristine fusion", Color("3498db")); Sound.play_hyoshigi(1.4)
	shot_initial_merge_done = true
	if combo_count >= 2: add_ribbon("%dx Fusion Chain!" % combo_count, "Chain multiplier %.1fx" % final_multiplier, Color("f39c12"))
	if tier >= 10:
		trigger_referee("横綱昇進", "YOKOZUNA ASCENSION!", "Supreme Pineapple Deity!", Color("ffd700"), 4, 3.0, "YOKOZUNA")
		add_ribbon("Yokozuna Divine", "Grand Champion of the Celestial Bowl", Color("ffd700"), 3.5)
		effects.spawn_confetti(position, 80); Sound.play_yokozuna()
		for hazard in hazards:
			if is_instance_valid(hazard) and not hazard.ring_out:
				hazard.cleansing = true; hazard.linear_velocity = bowl.global_position.direction_to(hazard.global_position) * 380.0
				if hazard.kind == "RIVAL": hazard.cancel_next_attack = true
	elif tier >= 7:
		trigger_referee("大関誕生", "OZEKI PROMOTION!", "%s dominates the ring" % (FRUIT_DATA[tier-1] as FruitData).display_name, Color("e74c3c"), 2, 2.1)
	else:
		Sound.play_fusion(tier)
	_apply_shockwave(position, 240.0 + 12.0 * tier, float(tuning.shockwave), merged)
	effects.spawn_particles(position, merged.data.color, 24); effects.spawn_ripple(position, 240.0 + 12.0 * tier); Juice.add_trauma(0.25)

func _apply_shockwave(origin: Vector2, blast_radius: float, impulse_strength: float, excluded: SumoFruit) -> void:
	for fruit in bowl.active_fruits:
		if not is_instance_valid(fruit) or fruit == excluded or fruit.state in [SumoFruit.State.RING_OUT, SumoFruit.State.MERGING]: continue
		var distance := origin.distance_to(fruit.global_position)
		if distance > 0.0 and distance < blast_radius:
			var impulse := origin.direction_to(fruit.global_position) * impulse_strength * (1.0 - distance / blast_radius) * (1.0 - fruit.data.knockback_resistance)
			if not merge_manager.add_deferred_impulse(fruit, impulse): fruit.apply_central_impulse(impulse)
			if fruit.visual_root.has_method("trigger_ripple"): fruit.visual_root.trigger_ripple()
	for hazard in hazards:
		if is_instance_valid(hazard) and not hazard.ring_out:
			var distance := origin.distance_to(hazard.global_position)
			if distance > 0.0 and distance < blast_radius:
				hazard.apply_central_impulse(origin.direction_to(hazard.global_position) * impulse_strength * (1.0-distance/blast_radius) * (1.0-hazard.resistance))

func _on_clash_started(position: Vector2, _tier: int) -> void:
	Sound.play_clash(); Juice.hit_stop(0.06); Juice.add_trauma(0.18); effects.spawn_particles(position, Color.WHITE, 16)

func _on_clash_pulse(position: Vector2, tier: int) -> void:
	if Time.get_ticks_msec() % 4 == 0: Sound.play_bump(110.0, tier * 2.0)
	effects.spawn_particles(position, Color(1,1,1,0.55), 2)

func _on_fruit_ringed_out(fruit: SumoFruit) -> void:
	if fruit.team == "RIVAL":
		_handle_rival_defeat("Rival Rikishi")
		return
	lives = maxi(0, lives - 1); Sound.play_ring_out(); Juice.add_trauma(0.3); effects.spawn_particles(fruit.global_position, fruit.data.color, 20, "SPLASH")
	add_ribbon("Ring-Out!", "%s fell from the Dohyo" % fruit.data.display_name, Color("e74c3c"))
	if lives <= 0: _end_game("All 3 wrestlers were pushed out of the Dohyo!")

func _on_bale_damaged(_index: int, _health: int, position: Vector2) -> void:
	Sound.play_bump(150, 4); effects.spawn_particles(position, Color("d4ac0d"), 8, "DUST")

func _on_bale_broken(_index: int, position: Vector2) -> void:
	trigger_referee("俵割れ", "TAWARA BREACH!", "Straw bale shattered!", Color("e67e22"), 2, 2.0)
	add_ribbon("Tawara Breach!", "A rim guard shattered open", Color("e67e22")); effects.spawn_particles(position, Color("d4ac0d"), 18, "DUST")

func _on_rim_saved(fruit: SumoFruit) -> void:
	add_ribbon("Not Today!", "Saved from the Tawara brink", Color("2ecc71")); Sound.play_rim_save(); fruit.look_target = bowl.global_position

func _spawn_hazard(forced_kind: String = "", forced_position: Vector2 = Vector2.INF) -> ArenaHazard:
	var kind := forced_kind
	if kind.is_empty():
		var roll := randf(); kind = "ICE" if roll < 0.28 else "BUG" if roll < 0.52 else "WASABI" if roll < 0.76 else "CHILI"
	var hazard := HAZARD_SCENE.instantiate() as ArenaHazard
	hazard.configure(kind, bowl)
	hazard.global_position = forced_position if forced_position != Vector2.INF else _safe_hazard_position(hazard.body_radius)
	add_child(hazard); hazards.append(hazard)
	hazard.defeated.connect(_on_hazard_defeated); hazard.special_contact.connect(_on_hazard_special); hazard.rival_action.connect(_on_rival_action)
	if kind == "WASABI": add_ribbon("Wasabi Appeared!", "Hit it 3x, push it out, or use Salt", Color("2ecc71"), 3.0)
	effects.spawn_particles(hazard.global_position, _hazard_color(kind), 12)
	return hazard

func _spawn_rival(profile: Dictionary, career: bool = false) -> ArenaHazard:
	var rival := HAZARD_SCENE.instantiate() as ArenaHazard
	var configured := profile.duplicate(); configured.score = int(profile.score) if profile.has("score") else (800 if career else 600)
	rival.configure("RIVAL", bowl, configured); rival.global_position = bowl.global_position + Vector2(0, -bowl.radius * 0.55)
	add_child(rival); hazards.append(rival)
	rival.defeated.connect(_on_hazard_defeated); rival.special_contact.connect(_on_hazard_special); rival.rival_action.connect(_on_rival_action)
	effects.spawn_particles(rival.global_position, Color(str(profile.color)), 25)
	return rival

func _safe_hazard_position(body_radius: float) -> Vector2:
	for _attempt in range(8):
		var candidate := bowl.global_position + Vector2.from_angle(randf_range(0, TAU)) * randf_range(30.0, bowl.radius * 0.62)
		var safe := true
		for fruit in bowl.active_fruits:
			if is_instance_valid(fruit) and candidate.distance_to(fruit.global_position) < body_radius + fruit.data.radius + 16.0: safe = false; break
		if safe: return candidate
	return bowl.global_position

func _update_hazards(delta: float) -> void:
	for index in range(hazards.size()-1, -1, -1):
		var hazard := hazards[index]
		if not is_instance_valid(hazard): hazards.remove_at(index); continue
		if hazard.kind == "WASABI" and not hazard.ring_out:
			for fruit in bowl.active_fruits:
				if is_instance_valid(fruit) and fruit.data and fruit.global_position.distance_to(hazard.global_position) < fruit.data.radius * 0.7 + hazard.body_radius: fruit.linear_velocity *= maxf(0.0, 1.0 - 2.8 * delta)
	if total_shots >= 3:
		hazard_spawn_timer -= delta
		if hazard_spawn_timer <= 0.0 and _active_hazard_count() < 4:
			hazard_spawn_timer = randf_range(7.0, 12.0); _spawn_hazard()
	if game_mode == "CLASSIC" and total_shots >= 5 and not _has_rival():
		rival_spawn_timer -= delta
		if rival_spawn_timer <= 0.0:
			rival_spawn_timer = randf_range(24.0, 32.0); _spawn_rival(RIVAL_PROFILES.TENGU_ORANGE); trigger_referee("宿敵参上", "RIVAL CHALLENGER!", "Beware the Oshidashi rush", Color("9b59b6"), 2, 2.2, "HAKKEYOI")

func _active_hazard_count() -> int:
	var count := 0
	for hazard in hazards:
		if is_instance_valid(hazard) and not hazard.ring_out and hazard.kind != "RIVAL": count += 1
	return count

func _has_rival() -> bool:
	for hazard in hazards:
		if is_instance_valid(hazard) and hazard.kind == "RIVAL" and not hazard.ring_out: return true
	return false

func _on_hazard_special(kind: String, position: Vector2) -> void:
	if kind == "WASABI_HIT": Sound.play_wasabi(); effects.spawn_particles(position, Color("2ecc71"), 10)
	elif kind == "CHILI_BOOST": Sound.play_chili(); effects.spawn_particles(position, Color("e74c3c"), 16, "FLAME"); Juice.add_trauma(0.18)
	else: Sound.play_bump(90, 4)

func _on_rival_action(kind: String, position: Vector2) -> void:
	if kind == "SLAP": Sound.play_clash(); Juice.add_trauma(0.18)
	elif kind == "RUSH": effects.spawn_particles(position, Color("e67e22"), 1)

func _on_hazard_defeated(hazard: ArenaHazard, reason: String) -> void:
	if reason == "CONSUMED": return
	var multiplier := minf(6.0, combo_multiplier * (2.0 if festival_active_this_shot else 1.0))
	if reason == "PURIFIED": score += int(round(hazard.score_value * 0.25))
	else: score += int(round(hazard.score_value * multiplier))
	if hazard.kind == "RIVAL": _handle_rival_defeat(hazard.display_name)
	else:
		add_hype(12.0 if reason == "SQUASHED" else 8.0); Sound.play_hazard_clear(); effects.spawn_particles(hazard.global_position, _hazard_color(hazard.kind), 22)
		add_ribbon("Wasabi Squashed!" if reason == "SQUASHED" else "Hazard Cleared!", "%s defeated" % hazard.display_name, _hazard_color(hazard.kind))
		if reason == "RING_OUT" and salt_charges == 0:
			salt_launch_count += 1
			if salt_launch_count >= 6: salt_charges = 1; salt_launch_count = 0; add_ribbon("Salt Ready!", "Ring-out replenished Kiyome-no-Shio", Color("4b69fd"))

func _handle_rival_defeat(rival_name: String) -> void:
	add_hype(25); trigger_referee("金星", "KINBOSHI!", "Rival Yorikiri defeat!", Color("ffd700"), 3, 2.8, "KINBOSHI")
	add_ribbon("Kinboshi Victory!", "%s defeated" % rival_name, Color("ffd700"), 3.0); effects.spawn_confetti(bowl.global_position, 45); Sound.play_flourish()
	if game_mode == "CAREER":
		career_unlocked = maxi(career_unlocked, career_stage + 1)
		if career_stage + 1 < CAREER_STAGES.size():
			add_ribbon("Stage Cleared!", "Next Banzuke bout unlocked", Color("2ecc71"), 3.2)
			career_stage += 1
		else: add_ribbon("Yokozuna Beaten!", "You are the Grand Champion", Color("ffd700"), 4.0)

func throw_salt(position: Vector2) -> bool:
	if salt_charges <= 0 or game_over or game_paused: return false
	salt_charges = 0; salt_launch_count = 0
	for old_zone in salt_zones:
		if is_instance_valid(old_zone): old_zone.queue_free()
	salt_zones.clear()
	var zone := SALT_ZONE_SCRIPT.new() as SaltZone; zone.position = position; add_child(zone); salt_zones.append(zone); zone.expired.connect(_on_salt_expired)
	for hazard in hazards:
		if is_instance_valid(hazard) and not hazard.ring_out and hazard.kind not in ["CHILI", "RIVAL"] and hazard.global_position.distance_to(position) < zone.zone_radius + hazard.body_radius:
			hazard.purify()
	effects.spawn_salt(position, zone.zone_radius); Sound.play_salt(); trigger_referee("清め", "KIYOME-NO-SHIO", "Sacred Salt Zone Purified!", Color("4b69fd"), 1, 2.0, "KIYOME"); add_ribbon("Sacred Salt", "Dohyo purified", Color("4b69fd")); return true

func _on_salt_expired(zone: SaltZone) -> void: salt_zones.erase(zone)

func add_hype(amount: float) -> void:
	if festival_ready_shots > 0: return
	var allowed := minf(amount, maxf(0.0, 30.0 - shot_hype)); shot_hype += allowed; crowd_hype = minf(100.0, crowd_hype + allowed)
	if crowd_hype >= 100.0:
		festival_ready_shots = 3; crowd_hype = 0.0; trigger_referee("大入り", "FESTIVAL READY!", "Next 3 shots score 2x", Color("ffd700"), 4, 3.0, "FEVER"); effects.spawn_confetti(bowl.global_position, 60); Sound.play_flourish()

func _check_capacity(delta: float) -> void:
	var occupancy := bowl.get_occupancy_ratio(hazards)
	var protruding := false
	for fruit in bowl.active_fruits:
		if is_instance_valid(fruit) and fruit.data and not fruit.entry_pending and bowl.get_metrics(fruit.global_position, fruit.data.radius).d_surface < -2.0: protruding = true; break
	if occupancy > 1.0 and protruding:
		is_overflowing = true; overflow_timer += delta
		if overflow_timer >= 2.0: _end_game("Dohyo capacity exceeded! The bowl overflowed!")
	else:
		is_overflowing = false; overflow_timer = maxf(0.0, overflow_timer - delta * 2.0)

func _check_challenge_success() -> void:
	if game_mode != "CHALLENGE" or game_over: return
	var challenge: String = str(CHALLENGES[challenge_index])
	var success: bool = (challenge == "WOBBLE_SEA" and best_tier >= 7) or (challenge == "BROKEN_TAWARA" and total_shots >= 12 and score >= 3000) or (challenge == "ONE_BEAUTIFUL_SHOT" and best_tier >= 6 and not _has_kind("BUG"))
	if success:
		trigger_referee("達成", "CHALLENGE CLEARED!", challenge.replace("_", " "), Color("ffd700"), 5, 4.0, "KINBOSHI")
		add_ribbon("Festival Victory!", "Challenge objective complete", Color("ffd700"), 4.0)
		effects.spawn_confetti(bowl.global_position, 80)
		game_over = true
		game_over_reason = "Challenge complete!"
		launcher.enabled = false
		_show_game_over("CHALLENGE CLEARED", game_over_reason)
	if challenge == "ONE_BEAUTIFUL_SHOT" and total_shots >= 2 and not success: _end_game("The two-shot challenge was not completed.")

func _has_kind(kind: String) -> bool:
	for hazard in hazards:
		if is_instance_valid(hazard) and hazard.kind == kind and not hazard.ring_out: return true
	return false

func _update_look_targets() -> void:
	for fruit in bowl.active_fruits:
		if not is_instance_valid(fruit): continue
		fruit.look_target = Vector2.INF; var closest := 220.0
		for hazard in hazards:
			if is_instance_valid(hazard) and not hazard.ring_out:
				var distance := fruit.global_position.distance_to(hazard.global_position)
				if distance < closest: closest = distance; fruit.look_target = hazard.global_position

func _end_game(reason: String) -> void:
	if game_over: return
	game_over = true; game_over_reason = reason; launcher.enabled = false; Sound.play_taiko(1.4); trigger_referee("勝負あり", "SHOBU ARI!", reason, Color("e74c3c"), 5, 3.5, "SHOBU")
	_show_game_over("MATCH OVER", reason)

func _show_game_over(title: String, reason: String) -> void:
	game_over_title_label.text = title
	final_score_label.text = "FINAL SCORE  %d\nHIGHEST TIER  %d\n%s" % [score, best_tier, reason]
	game_over_panel.visible = true

func _restart_game() -> void: _start_mode(game_mode)

func _toggle_pause() -> void:
	if game_over: return
	game_paused = not game_paused; get_tree().paused = game_paused; launcher.enabled = not game_paused; add_ribbon("Paused" if game_paused else "Resume", "The bout is waiting" if game_paused else "Hakkeyoi!", Color("bde7ff"), 1.2)

func _cycle_mode() -> void:
	if game_mode == "CLASSIC": _start_mode("CAREER")
	elif game_mode == "CAREER": challenge_index = 0; _start_mode("CHALLENGE")
	elif challenge_index < CHALLENGES.size()-1: challenge_index += 1; _start_mode("CHALLENGE")
	else: _start_mode("CLASSIC")

func _cycle_arena() -> void:
	var modes := ["CIRCULAR", "ELLIPTICAL", "WOBBLE"]; bowl.set_mode(modes[(modes.find(bowl.arena_mode)+1)%modes.size()]); Sound.play_hyoshigi(1.2); _update_hud()

func trigger_referee(jp: String, main_text: String, sub_text: String, color: Color, priority: int = 1, duration: float = 2.0, sound_kind: String = "") -> void:
	var call := {"jp":jp, "main":main_text, "sub":sub_text, "color":color, "priority":priority, "duration":duration, "max_duration":duration}
	if active_call.is_empty() or priority >= int(active_call.priority):
		active_call = call; call_queue = call_queue.filter(func(item): return int(item.priority) >= priority); _show_callout()
	elif priority >= 2 and call_queue.size() < 2: call_queue.append(call)
	match sound_kind:
		"HAKKEYOI": Sound.play_hyoshigi()
		"SHOBU": Sound.play_taiko(1.4)
		"YOKOZUNA", "KINBOSHI", "FEVER": Sound.play_flourish()
		"KIYOME": Sound.play_salt()

func _update_callouts(delta: float) -> void:
	if active_call.is_empty(): return
	active_call.duration -= delta
	if active_call.duration <= 0.0:
		active_call = call_queue.pop_front() if not call_queue.is_empty() else {}
		_show_callout()

func _show_callout() -> void:
	callout_panel.visible = not active_call.is_empty()
	if active_call.is_empty(): return
	callout_panel.color = Color(active_call.color, 0.90); callout_jp.text = active_call.jp; callout_main.text = active_call.main; callout_sub.text = active_call.sub

func add_ribbon(title: String, subtitle: String, color: Color = Color("f1c40f"), duration: float = 2.4) -> void:
	for ribbon in ribbons:
		if ribbon.title == title: return
	ribbons.append({"title":title, "subtitle":subtitle, "color":color, "duration":duration})
	if ribbons.size() > 3: ribbons.pop_front()
	_refresh_ribbons()

func _update_ribbons(delta: float) -> void:
	var changed := false
	for index in range(ribbons.size()-1,-1,-1):
		ribbons[index].duration -= delta
		if ribbons[index].duration <= 0.0: ribbons.remove_at(index); changed = true
	if changed: _refresh_ribbons()

func _refresh_ribbons() -> void:
	for child in ribbon_box.get_children(): child.queue_free()
	for ribbon in ribbons:
		var label := _make_label("%s\n%s" % [ribbon.title, ribbon.subtitle], 14, ribbon.color); label.custom_minimum_size = Vector2(270, 48); label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; ribbon_box.add_child(label)

func _update_camera() -> void:
	var shake := Juice.trauma * Juice.trauma * 16.0; camera.position = Vector2(450,500) + Vector2(randf_range(-shake,shake),randf_range(-shake,shake))

func _hazard_color(kind: String) -> Color:
	return Color("3498db") if kind == "ICE" else Color("2ecc71") if kind == "WASABI" else Color("e74c3c") if kind == "CHILI" else Color("9b59b6") if kind == "RIVAL" else Color("d35400")

func _update_hud() -> void:
	if not score_label: return
	score_label.text = "SCORE  %07d" % score; lives_label.text = "LIVES  " + "●".repeat(lives) + "○".repeat(3-lives)
	next_label.text = "NEXT  %s  •  %s" % [(FRUIT_DATA[upcoming_tiers[0]-1] as FruitData).display_name, (FRUIT_DATA[upcoming_tiers[1]-1] as FruitData).display_name]
	mode_label.text = "%s  •  %s" % [game_mode if game_mode != "CHALLENGE" else CHALLENGES[challenge_index].replace("_"," "), bowl.arena_mode]
	combo_label.visible = combo_count >= 2; combo_label.text = "%dx COMBO  •  %.1fx PTS" % [combo_count, combo_multiplier]
	hype_bar.value = crowd_hype; occupancy_bar.value = minf(150.0, bowl.get_occupancy_ratio(hazards)*100.0)
	salt_button.text = "SALT [S]  %s" % ("READY" if salt_charges > 0 else "%d/6" % salt_launch_count); salt_button.disabled = salt_charges <= 0
	rival_label.visible = _has_rival(); rival_label.text = "RIVAL INTENT: " + _rival_intent_text() if _has_rival() else ""
	overflow_label.visible = is_overflowing; overflow_label.text = "CAPACITY OVERFLOW! %.1fs" % maxf(0.0, 2.0-overflow_timer)

func _rival_intent_text() -> String:
	for hazard in hazards:
		if is_instance_valid(hazard) and hazard.kind == "RIVAL" and not hazard.ring_out: return "%s IN %d SHOT(S)" % [str(hazard.profile.get("move","PUSH")).replace("_"," "), hazard.shots_until_attack]
	return ""

func _make_label(text_value: String, size: int, color: Color) -> Label:
	var label := Label.new(); label.text = text_value; label.add_theme_font_size_override("font_size",size); label.add_theme_color_override("font_color",color); label.add_theme_color_override("font_shadow_color",Color(0,0,0,0.8)); label.add_theme_constant_override("shadow_offset_x",2); label.add_theme_constant_override("shadow_offset_y",2); return label

func _make_button(text_value: String, position: Vector2, size: Vector2, callback: Callable) -> Button:
	var button := Button.new(); button.text = text_value; button.position = position; button.size = size; button.add_theme_font_size_override("font_size",13); button.pressed.connect(callback); return button

func _create_interface() -> void:
	var layer := CanvasLayer.new(); layer.process_mode = Node.PROCESS_MODE_ALWAYS; add_child(layer)
	score_label=_make_label("",23,Color("ffe3a3")); score_label.position=Vector2(22,94); score_label.size=Vector2(280,36); layer.add_child(score_label)
	lives_label=_make_label("",19,Color("ff8d70")); lives_label.position=Vector2(650,96); lives_label.size=Vector2(225,34); lives_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; layer.add_child(lives_label)
	hype_bar=ProgressBar.new(); hype_bar.position=Vector2(330,98); hype_bar.size=Vector2(240,18); hype_bar.max_value=100; hype_bar.show_percentage=false; layer.add_child(hype_bar)
	occupancy_bar=ProgressBar.new(); occupancy_bar.position=Vector2(330,121); occupancy_bar.size=Vector2(240,11); occupancy_bar.max_value=150; occupancy_bar.show_percentage=false; layer.add_child(occupancy_bar)
	next_label=_make_label("",15,Color("bde7ff")); next_label.position=Vector2(22,136); next_label.size=Vector2(300,28); layer.add_child(next_label)
	mode_label=_make_label("",14,Color("e8b15d")); mode_label.position=Vector2(590,136); mode_label.size=Vector2(285,28); mode_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; layer.add_child(mode_label)
	salt_button=_make_button("SALT",Vector2(20,166),Vector2(125,34),func(): throw_salt(bowl.get_bowl_center())); layer.add_child(salt_button)
	layer.add_child(_make_button("MODE",Vector2(151,166),Vector2(90,34),_cycle_mode)); layer.add_child(_make_button("ARENA",Vector2(247,166),Vector2(90,34),_cycle_arena))
	layer.add_child(_make_button("ROSTER",Vector2(343,166),Vector2(95,34),func(): roster_panel.visible=true)); layer.add_child(_make_button("TUNER",Vector2(444,166),Vector2(90,34),func(): tuner_panel.visible=true))
	layer.add_child(_make_button("SOUND",Vector2(540,166),Vector2(90,34),func(): Sound.toggle_mute())); layer.add_child(_make_button("PAUSE [P]",Vector2(636,166),Vector2(105,34),_toggle_pause)); layer.add_child(_make_button("RESTART",Vector2(747,166),Vector2(128,34),_restart_game))
	combo_label=_make_label("",17,Color("ffd700")); combo_label.position=Vector2(300,205); combo_label.size=Vector2(300,28); combo_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; layer.add_child(combo_label)
	rival_label=_make_label("",14,Color("f39c12")); rival_label.position=Vector2(250,232); rival_label.size=Vector2(400,26); rival_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; layer.add_child(rival_label)
	overflow_label=_make_label("",20,Color.WHITE); overflow_label.position=Vector2(250,260); overflow_label.size=Vector2(400,32); overflow_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; layer.add_child(overflow_label)
	ribbon_box=VBoxContainer.new(); ribbon_box.position=Vector2(610,270); ribbon_box.size=Vector2(270,180); layer.add_child(ribbon_box)
	_create_callout(layer); _create_game_over(layer); _create_roster(layer); _create_tuner(layer)
	var hint:=_make_label("PULL & RELEASE • MATCH WEIGHTS • [S] SALT • [P] PAUSE",14,Color("cbb9a4")); hint.position=Vector2(160,965); hint.size=Vector2(580,25); hint.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; layer.add_child(hint)

func _create_callout(layer: CanvasLayer) -> void:
	callout_panel=ColorRect.new(); callout_panel.position=Vector2(245,300); callout_panel.size=Vector2(410,115); callout_panel.visible=false; layer.add_child(callout_panel)
	callout_jp=_make_label("",23,Color.WHITE); callout_jp.position=Vector2(12,7); callout_jp.size=Vector2(386,28); callout_jp.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; callout_panel.add_child(callout_jp)
	callout_main=_make_label("",24,Color.WHITE); callout_main.position=Vector2(12,36); callout_main.size=Vector2(386,34); callout_main.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; callout_panel.add_child(callout_main)
	callout_sub=_make_label("",13,Color.WHITE); callout_sub.position=Vector2(12,75); callout_sub.size=Vector2(386,25); callout_sub.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; callout_panel.add_child(callout_sub)

func _create_game_over(layer: CanvasLayer) -> void:
	game_over_panel=ColorRect.new(); game_over_panel.color=Color(0.06,0.035,0.025,0.96); game_over_panel.position=Vector2(165,340); game_over_panel.size=Vector2(570,320); game_over_panel.visible=false; layer.add_child(game_over_panel)
	game_over_title_label=_make_label("MATCH OVER",44,Color("ffca69")); game_over_title_label.position=Vector2(25,30); game_over_title_label.size=Vector2(520,60); game_over_title_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; game_over_panel.add_child(game_over_title_label)
	final_score_label=_make_label("",21,Color.WHITE); final_score_label.position=Vector2(25,105); final_score_label.size=Vector2(520,95); final_score_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; game_over_panel.add_child(final_score_label)
	var restart:=_make_button("RETURN TO THE DOHYO",Vector2(130,230),Vector2(310,55),_restart_game); game_over_panel.add_child(restart)

func _create_roster(layer: CanvasLayer) -> void:
	roster_panel=ColorRect.new(); roster_panel.color=Color(0.06,0.04,0.03,0.97); roster_panel.position=Vector2(170,235); roster_panel.size=Vector2(560,620); roster_panel.visible=false; layer.add_child(roster_panel)
	var title:=_make_label("THE 11 SUMO FRUIT RANKS",27,Color("ffd27a")); title.position=Vector2(20,20); title.size=Vector2(520,42); title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; roster_panel.add_child(title)
	for index in range(FRUIT_DATA.size()):
		var data:=FRUIT_DATA[index] as FruitData; var label:=_make_label("%02d  %-22s  R%3d  M%5.1f" % [data.tier,data.display_name,int(data.radius),data.mass],16,data.color); label.position=Vector2(55,75+index*41); label.size=Vector2(450,31); roster_panel.add_child(label)
	roster_panel.add_child(_make_button("CLOSE",Vector2(205,555),Vector2(150,42),func():roster_panel.visible=false))

func _create_tuner(layer: CanvasLayer) -> void:
	tuner_panel=ColorRect.new(); tuner_panel.color=Color(0.06,0.04,0.03,0.98); tuner_panel.position=Vector2(150,210); tuner_panel.size=Vector2(600,700); tuner_panel.visible=false; layer.add_child(tuner_panel)
	var title:=_make_label("PHYSICS PARAMETER TUNER",27,Color("f1c40f")); title.position=Vector2(25,20); title.size=Vector2(550,45); title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; tuner_panel.add_child(title)
	_add_tuner_slider("Bowl slope", "slope", 0.1, 1.2, 0.01, 0)
	_add_tuner_slider("Escape speed", "escape", 80, 450, 5, 1)
	_add_tuner_slider("Clash duration", "clash", 0.15, 1.0, 0.05, 2)
	_add_tuner_slider("Shockwave impulse", "shockwave", 100, 900, 10, 3)
	_add_tuner_slider("Fruit restitution", "restitution", 0.2, 1.0, 0.01, 4)
	_add_tuner_slider("Rim damping", "rim_damping", 0.2, 1.0, 0.01, 5)
	var preset_label:=_make_label("PRESETS",13,Color("a89886")); preset_label.position=Vector2(45,543); preset_label.size=Vector2(100,24); tuner_panel.add_child(preset_label)
	tuner_panel.add_child(_make_button("HONBASHO",Vector2(45,568),Vector2(120,36),func():_apply_tuning_preset("STANDARD")))
	tuner_panel.add_child(_make_button("PINBALL",Vector2(175,568),Vector2(120,36),func():_apply_tuning_preset("BOUNCY")))
	tuner_panel.add_child(_make_button("HEAVY",Vector2(305,568),Vector2(120,36),func():_apply_tuning_preset("HEAVY")))
	tuner_panel.add_child(_make_button("CHAOS",Vector2(435,568),Vector2(120,36),func():_apply_tuning_preset("CHAOS")))
	tuner_panel.add_child(_make_button("COPY CONSTANTS",Vector2(45,625),Vector2(165,42),_copy_tuning_constants))
	tuner_panel.add_child(_make_button("RESET",Vector2(220,625),Vector2(150,42),_reset_tuning))
	tuner_panel.add_child(_make_button("CLOSE",Vector2(380,625),Vector2(175,42),func():tuner_panel.visible=false))

func _add_tuner_slider(title: String, key: String, minimum: float, maximum: float, step: float, index: int) -> void:
	var label:=_make_label("%s: %s" % [title,str(tuning[key])],15,Color("e0d4c5")); label.position=Vector2(45,85+index*74); label.size=Vector2(510,26); tuner_panel.add_child(label)
	var slider:=HSlider.new(); slider.position=Vector2(48,116+index*74); slider.size=Vector2(505,24); slider.min_value=minimum; slider.max_value=maximum; slider.step=step; slider.value=float(tuning[key]); slider.value_changed.connect(_on_tuner_changed.bind(key,label)); tuner_panel.add_child(slider)
	tuner_sliders[key] = {"slider": slider, "label": label, "title": title}

func _on_tuner_changed(value: float, key: String, label: Label) -> void:
	tuning[key]=value; label.text="%s: %.2f" % [key.replace("_"," ").capitalize(),value]; _apply_tuning()

func _reset_tuning() -> void:
	_set_tuning_values({"slope":0.55,"escape":220.0,"clash":0.5,"shockwave":380.0,"bale_health":3,"restitution":0.78,"rim_damping":0.65})
	bowl.set_mode("CIRCULAR")
	add_ribbon("Tuning Reset", "Default dohyo physics restored", Color("f1c40f"))

func _apply_tuning_preset(preset: String) -> void:
	if preset == "BOUNCY":
		_set_tuning_values({"slope":0.40,"escape":280.0,"clash":0.35,"shockwave":450.0,"restitution":0.90,"rim_damping":0.35}); bowl.set_mode("ELLIPTICAL")
	elif preset == "HEAVY":
		_set_tuning_values({"slope":0.80,"escape":300.0,"clash":0.60,"shockwave":500.0,"restitution":0.55,"rim_damping":0.85}); bowl.set_mode("CIRCULAR")
	elif preset == "CHAOS":
		_set_tuning_values({"slope":0.50,"escape":190.0,"clash":0.30,"shockwave":400.0,"restitution":0.85,"rim_damping":0.50}); bowl.set_mode("WOBBLE")
	else:
		_set_tuning_values({"slope":0.55,"escape":220.0,"clash":0.5,"shockwave":380.0,"restitution":0.78,"rim_damping":0.65}); bowl.set_mode("CIRCULAR")
	add_ribbon("Physics Preset", "%s tuning applied" % preset.capitalize(), Color("f1c40f"))

func _set_tuning_values(values: Dictionary) -> void:
	for key in values:
		tuning[key] = values[key]
		if tuner_sliders.has(key):
			var entry: Dictionary = tuner_sliders[key]
			(entry.slider as HSlider).set_value_no_signal(float(values[key]))
			(entry.label as Label).text = "%s: %.2f" % [str(entry.title), float(values[key])]
	_apply_tuning()
	_update_hud()

func _copy_tuning_constants() -> void:
	var constants := "# Godot 4 Physics Parameters (Tuned in Sumo Fruits)\nconst ARENA_MODE: String = \"%s\"\nconst SLOPE_K: float = %.2f\nconst ESCAPE_SPEED_THRESHOLD: float = %.1f\nconst RIM_DAMPING: float = %.2f\nconst CLASH_DURATION: float = %.2f\nconst SHOCKWAVE_IMPULSE: float = %.1f\nconst FRUIT_RESTITUTION: float = %.2f\n" % [bowl.arena_mode, tuning.slope, tuning.escape, tuning.rim_damping, tuning.clash, tuning.shockwave, tuning.restitution]
	DisplayServer.clipboard_set(constants)
	add_ribbon("Constants Copied", "Godot tuning copied to clipboard", Color("2ecc71"))

func _apply_tuning() -> void:
	bowl.set_tuning(float(tuning.slope),float(tuning.escape),float(tuning.rim_damping),int(tuning.bale_health)); merge_manager.clash_duration=float(tuning.clash)
	for fruit in bowl.active_fruits:
		if is_instance_valid(fruit) and fruit.data: fruit.data.restitution=float(tuning.restitution); if fruit.physics_material_override: fruit.physics_material_override.bounce=float(tuning.restitution)
