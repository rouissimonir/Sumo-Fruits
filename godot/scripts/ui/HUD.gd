class_name HUD
extends CanvasLayer

signal salt_requested()
signal restart_requested()

@onready var score_label: Label = $TopBar/ScoreLabel
@onready var lives_label: Label = $TopBar/LivesLabel
@onready var occupancy_bar: ProgressBar = $TopBar/OccupancyBar
@onready var hype_bar: ProgressBar = $TopBar/HypeBar
@onready var banner_panel: PanelContainer = $BannerContainer
@onready var banner_jp: Label = $BannerContainer/VBox/JapaneseLabel
@onready var banner_en: Label = $BannerContainer/VBox/EnglishLabel
@onready var salt_btn: Button = $BottomBar/SaltButton
@onready var game_over_panel: PanelContainer = $GameOverPanel
@onready var final_score_label: Label = $GameOverPanel/VBox/FinalScoreLabel

var banner_timer: float = 0.0

func _ready() -> void:
	Juice.banner_requested.connect(_on_banner_requested)
	if banner_panel:
		banner_panel.modulate.a = 0.0
	if game_over_panel:
		game_over_panel.visible = false
	if salt_btn:
		salt_btn.pressed.connect(func(): salt_requested.emit())

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_S:
			salt_requested.emit()

func _process(delta: float) -> void:
	if banner_timer > 0.0:
		banner_timer -= delta
		if banner_timer <= 0.0 and banner_panel:
			var tween = create_tween()
			tween.tween_property(banner_panel, "modulate:a", 0.0, 0.25)

func update_score(score: int) -> void:
	if score_label:
		score_label.text = "SCORE: %d" % score

func update_lives(lives: int) -> void:
	if lives_label:
		var hearts = ""
		for i in range(lives):
			hearts += "❤️ "
		lives_label.text = "LIVES: " + (hearts if hearts != "" else "💀")

func update_occupancy(ratio: float) -> void:
	if occupancy_bar:
		occupancy_bar.value = ratio * 100.0

func update_hype(hype: float, fever: bool) -> void:
	if hype_bar:
		hype_bar.value = hype
		hype_bar.modulate = Color("#FFD700") if fever else Color("#E67E22")

func update_salt(charges: int) -> void:
	if salt_btn:
		salt_btn.text = "🧂 SALT [S] (%d)" % charges
		salt_btn.disabled = charges <= 0

func _on_banner_requested(japanese: String, english: String, col: Color) -> void:
	if not banner_panel: return
	banner_jp.text = japanese
	banner_jp.modulate = col
	banner_en.text = english
	banner_panel.modulate.a = 1.0
	banner_timer = 2.0

func show_game_over(final_score: int) -> void:
	if game_over_panel:
		final_score_label.text = "FINAL SCORE: %d" % final_score
		game_over_panel.visible = true
