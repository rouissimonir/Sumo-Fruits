class_name Main
extends Node2D

@onready var arena: BowlArena = $BowlArena
@onready var launcher: SlingshotLauncher = $SlingshotLauncher
@onready var merge_manager: MergeClashManager = $MergeClashManager
@onready var camera: Camera2D = $Camera2D
@onready var hud: HUD = $HUD

var fruit_scene: PackedScene = preload("res://scenes/SumoFruit.tscn")
var hazard_scene: PackedScene = preload("res://scenes/Hazard.tscn")
var salt_scene: PackedScene = preload("res://scripts/gameplay/SaltPurification.gd")

var score: int = 0
var lives: int = 3
var launches: int = 0
var salt_charges: int = 1
var hype: float = 0.0
var fever_mode: bool = false
var hazard_timer: float = 8.0

func _ready() -> void:
	Juice.register_camera(camera)
	Sound.play_hyoshigi()
	Juice.request_banner("はっけよい！", "HAKKEYOI! MATCH START", Color("#FFD700"))

	launcher.fruit_launched.connect(_on_fruit_launched)
	merge_manager.fusion_committed.connect(_on_fusion_committed)
	arena.fruit_ring_out.connect(_on_fruit_ring_out)
	arena.occupancy_changed.connect(_on_occupancy_changed)
	hud.salt_requested.connect(_on_salt_requested)

	hud.update_score(score)
	hud.update_lives(lives)
	hud.update_salt(salt_charges)

func _physics_process(delta: float) -> void:
	# Hazard spawn cycle
	hazard_timer -= delta
	if hazard_timer <= 0.0:
		hazard_timer = randf_range(16.0, 24.0)
		_spawn_hazard()

	# Hype decay
	if hype > 0.0:
		hype = maxf(0.0, hype - delta * 4.0)
		if hype < 50.0 and fever_mode:
			fever_mode = false
	hud.update_hype(hype, fever_mode)

func _on_fruit_launched(fruit: SumoFruit) -> void:
	arena.register_fruit(fruit)
	fruit.contact_occurred.connect(_on_fruit_contact)
	launches += 1
	if launches % 6 == 0:
		salt_charges += 1
		hud.update_salt(salt_charges)
		Juice.request_banner("塩補充！", "SACRED SALT RESTOCKED!", Color("#E0F7FA"))

func _on_fruit_contact(fruit_a: SumoFruit, other: Node2D, rel_speed: float) -> void:
	if other is SumoFruit:
		merge_manager.handle_contact(fruit_a, other, rel_speed)

func _on_fusion_committed(new_tier: int, spawn_pos: Vector2, points: int) -> void:
	score += points * (2 if fever_mode else 1)
	hype = minf(100.0, hype + 18.0)
	if hype >= 90.0 and not fever_mode:
		fever_mode = true
		Sound.play_fever()
		Juice.request_banner("大一番！", "FEVER MODE ACTIVE! 2X POINTS", Color("#FFD700"))

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

	# Yokozuna cleansing!
	if new_tier == 11:
		Juice.request_banner("横綱昇進！", "YOKOZUNA PURIFICATION!", Color("#F1C40F"))
		for h in arena.active_hazards:
			if is_instance_valid(h):
				h.defeat(300)

func _on_fruit_ring_out(fruit: SumoFruit) -> void:
	lives -= 1
	hud.update_lives(lives)
	if lives <= 0:
		_game_over()

func _on_occupancy_changed(ratio: float) -> void:
	hud.update_occupancy(ratio)
	if ratio >= 1.0:
		Juice.request_banner("物言い！", "DOHYO CRITICAL OVERFLOW!", Color("#E74C3C"))

func _on_salt_requested() -> void:
	if salt_charges <= 0: return
	salt_charges -= 1
	hud.update_salt(salt_charges)

	var salt = salt_scene.new() as SaltPurification
	salt.global_position = arena.global_position
	add_child(salt)

func _spawn_hazard() -> void:
	var h = hazard_scene.instantiate() as Hazard
	# Prioritize Wasabi sludge so player can experience the mechanics
	var r = randf()
	if r < 0.55:
		h.setup_kind(Hazard.Kind.WASABI)
	elif r < 0.80:
		h.setup_kind(Hazard.Kind.CHILI)
	else:
		h.setup_kind(Hazard.Kind.ICE)

	var rand_angle = randf() * TAU
	var rand_dist = randf_range(80.0, arena.radius * 0.6)
	h.global_position = arena.global_position + Vector2(cos(rand_angle), sin(rand_angle)) * rand_dist
	add_child(h)
	arena.register_hazard(h)
	h.hazard_defeated.connect(func(_haz, pts): score += pts; hud.update_score(score))

	if h.kind == Hazard.Kind.WASABI:
		Juice.request_banner("山葵出現！", "WASABI SLUDGE! HIT 3X, PUSH OUT, OR USE SALT [S]", Color("#2ECC71"))

func _game_over() -> void:
	launcher.is_dragging = false
	launcher.set_process_unhandled_input(false)
	hud.show_game_over(score)
