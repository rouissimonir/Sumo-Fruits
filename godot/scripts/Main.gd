class_name Main
extends Node2D

enum GameMode { CLASSIC, CAREER, FESTIVAL }
enum ShotState { IDLE, AIMING, LAUNCHED, CHAIN_RESOLVING, RIVAL_ACTION, SETTLING }

@onready var arena: BowlArena = $BowlArena
@onready var launcher: SlingshotLauncher = $SlingshotLauncher
@onready var merge_manager: MergeClashManager = $MergeClashManager
@onready var camera: Camera2D = $Camera2D
@onready var hud: HUD = $HUD

var fruit_scene: PackedScene = preload("res://scenes/SumoFruit.tscn")
var hazard_scene: PackedScene = preload("res://scenes/Hazard.tscn")
var rival_scene: PackedScene = preload("res://scenes/RivalSumo.tscn")
var salt_scene: PackedScene = preload("res://scripts/gameplay/SaltPurification.gd")

var career_manager: CareerManager = CareerManager.new()
var technique_manager: TechniqueRibbonManager = TechniqueRibbonManager.new()

var game_mode: GameMode = GameMode.CAREER
var shot_state: ShotState = ShotState.IDLE
var active_rival: RivalSumo = null

var score: int = 0
var lives: int = 3
var launches: int = 0
var salt_charges: int = 1
var hype: float = 0.0
var fever_mode: bool = false
var hazard_timer: float = 10.0

# Shot tracking
var shot_fusions_count: int = 0
var bank_shot_detected: bool = false
var shot_settling_timer: float = 0.0

# Overflow grace period
var overflow_timer: float = 0.0
var is_overflowing: bool = false

func _ready() -> void:
	Juice.register_camera(camera)
	Sound.play_hyoshigi()

	launcher.fruit_launched.connect(_on_fruit_launched)
	merge_manager.fusion_committed.connect(_on_fusion_committed)
	arena.fruit_ring_out.connect(_on_fruit_ring_out)
	arena.tawara_breached.connect(_on_tawara_breached)
	arena.bale_hit.connect(_on_bale_hit)
	arena.occupancy_changed.connect(_on_occupancy_changed)

	hud.salt_requested.connect(_on_salt_requested)
	hud.restart_requested.connect(_on_restart_requested)
	hud.next_stage_requested.connect(_on_next_stage_requested)
	hud.mode_changed.connect(_on_mode_cycled)

	_start_current_bout()

func _start_current_bout() -> void:
	_cleanup_board()
	lives = 3
	launches = 0
	salt_charges = 1
	hype = 0.0
	fever_mode = false
	overflow_timer = 0.0
	is_overflowing = false
	shot_state = ShotState.IDLE

	hud.hide_panels()
	hud.update_score(score)
	hud.update_lives(lives)
	hud.update_salt(salt_charges)
	launcher.set_process_unhandled_input(true)

	if game_mode == GameMode.CAREER:
		var stage = career_manager.get_current_stage()
		arena.setup_arena(stage.arena_mode)
		hud.set_mode_info(stage.rank_title, stage.name)
		_spawn_rival(stage.rival_id)
		Juice.request_banner("はっけよい！", stage.name.to_upper() + " BEGINS!", Color("#FFD700"))
		if stage.has_wasabi:
			_spawn_hazard(Hazard.Kind.WASABI)
		if stage.has_chili:
			_spawn_hazard(Hazard.Kind.CHILI)
	elif game_mode == GameMode.FESTIVAL:
		var ch = career_manager.active_challenge
		if not ch:
			career_manager.set_challenge("WOBBLE_SEA")
			ch = career_manager.active_challenge
		arena.setup_arena(ch.arena_mode, ch.broken_bales)
		hud.set_mode_info(ch.title, ch.subtitle)
		Juice.request_banner("祭り勝負！", ch.title.to_upper(), Color("#3498DB"))
		if ch.has_wasabi:
			_spawn_hazard(Hazard.Kind.WASABI)
		if ch.has_chili:
			_spawn_hazard(Hazard.Kind.CHILI)
	else:
		arena.setup_arena("CIRCULAR")
		hud.set_mode_info("CLASSIC ENDLESS", "Fuse to Yokozuna Watermelon!")
		Juice.request_banner("はっけよい！", "CLASSIC ENDLESS MATCH", Color("#FFD700"))

func _cleanup_board() -> void:
	for f in get_tree().get_nodes_in_group("fruits"):
		if f != launcher.loaded_fruit:
			f.queue_free()
	for h in get_tree().get_nodes_in_group("hazards"):
		h.queue_free()
	for r in get_tree().get_nodes_in_group("rivals"):
		r.queue_free()
	arena.active_fruits.clear()
	arena.active_hazards.clear()
	arena.unregister_rival()
	active_rival = null

func _spawn_rival(profile_id: String) -> void:
	var r = rival_scene.instantiate() as RivalSumo
	r.setup_profile(profile_id)
	r.global_position = arena.global_position + Vector2(0, -arena.radius * 0.52)
	add_child(r)
	arena.register_rival(r)
	active_rival = r
	r.rival_defeated.connect(_on_rival_defeated)

func _physics_process(delta: float) -> void:
	technique_manager.update(delta)

	# 1. Overflow grace period check (2.0s timer)
	if is_overflowing:
		overflow_timer += delta
		hud.update_overflow_warning(overflow_timer, true)
		if overflow_timer >= 2.0:
			_game_over("物言い！ DOHYŌ OVERFLOW!")
			return
	else:
		if overflow_timer > 0.0:
			overflow_timer = maxf(0.0, overflow_timer - delta * 2.0)
		hud.update_overflow_warning(overflow_timer, false)

	# 2. Shot settling lifecycle
	if shot_state == ShotState.LAUNCHED or shot_state == ShotState.CHAIN_RESOLVING:
		shot_settling_timer += delta
		var is_settled = _check_fruits_settled()

		if is_settled and shot_settling_timer >= 0.8:
			shot_state = ShotState.IDLE
			if active_rival and is_instance_valid(active_rival):
				active_rival.plan_next_intent()

	# 3. Hazard periodic spawns in Classic & Career
	hazard_timer -= delta
	if hazard_timer <= 0.0:
		hazard_timer = randf_range(16.0, 24.0)
		if arena.active_hazards.size() < 3:
			_spawn_hazard()

	# 4. Hype decay
	if hype > 0.0:
		hype = maxf(0.0, hype - delta * 4.0)
		if hype < 50.0 and fever_mode:
			fever_mode = false
	hud.update_hype(hype, fever_mode)

func _check_fruits_settled() -> bool:
	for f in arena.active_fruits:
		if is_instance_valid(f) and f.state == SumoFruit.State.IN_RING:
			if f.linear_velocity.length() > 25.0:
				return false
	if active_rival and is_instance_valid(active_rival) and active_rival.ai_state != RivalSumo.AIState.RING_OUT:
		if active_rival.linear_velocity.length() > 25.0:
			return false
	return true

func _on_fruit_launched(fruit: SumoFruit) -> void:
	arena.register_fruit(fruit)
	fruit.contact_occurred.connect(_on_fruit_contact)
	launches += 1
	shot_fusions_count = 0
	bank_shot_detected = false
	shot_settling_timer = 0.0
	shot_state = ShotState.LAUNCHED

	# Restock salt every 6 launches
	if launches % 6 == 0:
		salt_charges += 1
		hud.update_salt(salt_charges)
		technique_manager.add_ribbon("塩補充！", "SACRED SALT RESTOCKED!", Color("#E0F7FA"))

	# Notify rival of player commitment
	if active_rival and is_instance_valid(active_rival):
		active_rival.on_player_launch()

func _on_bale_hit(_bale_idx: int) -> void:
	if shot_fusions_count == 0:
		bank_shot_detected = true

func _on_fruit_contact(fruit_a: SumoFruit, other: Node2D, rel_speed: float) -> void:
	if other is SumoFruit:
		merge_manager.handle_contact(fruit_a, other, rel_speed)

func _on_fusion_committed(new_tier: int, spawn_pos: Vector2, points: int) -> void:
	shot_fusions_count += 1
	shot_state = ShotState.CHAIN_RESOLVING
	shot_settling_timer = 0.0

	var mult = 2 if fever_mode else 1
	var total_pts = points * mult
	score += total_pts

	# Bank Shot technique recognition
	if bank_shot_detected:
		technique_manager.add_ribbon("バンクショット！", "BANK SHOT RICOCHET! +300 PTS", Color("#3498DB"))
		score += 300
		bank_shot_detected = false

	# Double Clash technique recognition
	if shot_fusions_count >= 2:
		technique_manager.add_ribbon("連続激突！", "DOUBLE CLASH COMBO! +500 PTS", Color("#E67E22"))
		score += 500

	# Hype progression
	hype = minf(100.0, hype + 18.0)
	if hype >= 90.0 and not fever_mode:
		fever_mode = true
		Sound.play_fever()
		technique_manager.add_ribbon("大一番！", "FEVER MODE ACTIVE! 2X POINTS", Color("#FFD700"))

	hud.update_score(score)

	# Spawn the merged higher tier fruit
	var new_fruit = fruit_scene.instantiate() as SumoFruit
	new_fruit.apply_data(FruitCatalog.get_tier_data(new_tier))
	new_fruit.global_position = spawn_pos
	new_fruit.state = SumoFruit.State.IN_RING
	new_fruit.entry_pending = false
	new_fruit.has_entered_ring = true
	add_child(new_fruit)
	arena.register_fruit(new_fruit)
	new_fruit.contact_occurred.connect(_on_fruit_contact)

	# Yokozuna grand purification
	if new_tier == 11:
		technique_manager.add_ribbon("横綱昇進！", "YOKOZUNA CELESTIAL PURIFICATION!", Color("#F1C40F"))
		for h in arena.active_hazards:
			if is_instance_valid(h):
				h.defeat(400)
		if active_rival and is_instance_valid(active_rival):
			active_rival.cancel_attack_yokozuna()

func _on_fruit_ring_out(fruit: SumoFruit) -> void:
	lives -= 1
	hud.update_lives(lives)
	if lives <= 0:
		_game_over("勇み足！ LIVES DEPLETED")

func _on_rival_defeated(rival_id: String, bonus_pts: int) -> void:
	score += bonus_pts
	hud.update_score(score)
	technique_manager.add_ribbon("寄り切り！", "RIVAL EJECTED! +%d PTS" % bonus_pts, Color("#2ECC71"))

	if game_mode == GameMode.CAREER:
		var stage = career_manager.get_current_stage()
		var unlocked_next = career_manager.complete_current_stage()
		var is_champ = stage.index >= 3
		launcher.set_process_unhandled_input(false)
		hud.show_victory(stage.rival_id, is_champ)

func _on_next_stage_requested() -> void:
	var stage = career_manager.get_current_stage()
	if stage.index >= 3:
		career_manager.reset_progress()
	else:
		career_manager.advance_stage()
	_start_current_bout()

func _on_tawara_breached(_idx: int, _angle: float) -> void:
	technique_manager.add_ribbon("俵割れ！", "STRAW BALE BREACHED!", Color("#E74C3C"))

func _on_occupancy_changed(ratio: float) -> void:
	hud.update_occupancy(ratio)
	is_overflowing = ratio >= 1.0

func _on_salt_requested() -> void:
	if salt_charges <= 0: return
	salt_charges -= 1
	hud.update_salt(salt_charges)

	var salt = salt_scene.new() as SaltPurification
	salt.global_position = arena.global_position
	add_child(salt)
	technique_manager.add_ribbon("清めの塩！", "SACRED SALT PURIFICATION!", Color("#E0F7FA"))

func _spawn_hazard(force_kind: int = -1) -> void:
	var h = hazard_scene.instantiate() as Hazard
	if force_kind >= 0:
		h.setup_kind(force_kind as Hazard.Kind)
	else:
		var r = randf()
		if r < 0.55:
			h.setup_kind(Hazard.Kind.WASABI)
		elif r < 0.80:
			h.setup_kind(Hazard.Kind.CHILI)
		else:
			h.setup_kind(Hazard.Kind.ICE)

	var rand_angle = randf() * TAU
	var rand_dist = randf_range(70.0, arena.radius * 0.6)
	h.global_position = arena.global_position + Vector2(cos(rand_angle), sin(rand_angle)) * rand_dist
	add_child(h)
	arena.register_hazard(h)
	h.hazard_defeated.connect(func(_haz, pts): score += pts; hud.update_score(score))

func _on_mode_cycled() -> void:
	if game_mode == GameMode.CAREER:
		game_mode = GameMode.FESTIVAL
	elif game_mode == GameMode.FESTIVAL:
		game_mode = GameMode.CLASSIC
	else:
		game_mode = GameMode.CAREER
	_start_current_bout()

func _on_restart_requested() -> void:
	_start_current_bout()

func _game_over(reason: String = "MATCH CONCLUDED") -> void:
	launcher.is_dragging = false
	launcher.set_process_unhandled_input(false)
	hud.show_game_over(score, reason)
